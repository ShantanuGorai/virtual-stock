import json
import logging
import os
import threading
import time
from datetime import datetime

import yfinance as yf

# Keep terminal output clean
logging.getLogger("yfinance").setLevel(logging.CRITICAL)

STATE_FILE = "live_data.json"


def save_live_state(ticker_symbol, price):
    """Save the latest price for trade.py."""
    data = {
        "ticker": ticker_symbol,
        "price": float(price),
        "timestamp": datetime.now().strftime("%H:%M:%S"),
    }

    temp_file = STATE_FILE + ".tmp"

    with open(temp_file, "w", encoding="utf-8") as file:
        json.dump(data, file)

    os.replace(temp_file, STATE_FILE)


def validate_ticker(ticker_symbol):
    """
    Returns:
        ("valid", price)       - ticker exists and price is available
        ("invalid", None)      - Yahoo returned no usable ticker data
        ("error", None)        - network/API error; validity uncertain
    """
    try:
        ticker = yf.Ticker(ticker_symbol)

        # Check recent historical data
        history = ticker.history(
            period="5d",
            interval="1d",
            raise_errors=True,
        )

        if not history.empty:
            prices = history["Close"].dropna()

            if not prices.empty:
                return "valid", float(prices.iloc[-1])

        # Fallback to fast_info
        try:
            price = ticker.fast_info.get("last_price")

            if price is not None:
                return "valid", float(price)

        except Exception:
            pass

        # Empty data alone cannot always distinguish an invalid
        # ticker from a temporary Yahoo Finance issue.
        return "invalid", None

    except Exception as error:
        logging.debug("Ticker validation error: %s", error)
        return "error", None


def get_valid_ticker():
    """Ask repeatedly until a ticker is validated."""
    while True:
        symbol = input(
            "Enter stock ticker (e.g., AAPL, TSLA, BTC-USD): "
        ).strip().upper()

        if not symbol:
            print("Ticker cannot be empty. Please try again.\n")
            continue

        print(f"Validating {symbol}...")

        status, initial_price = validate_ticker(symbol)

        if status == "valid":
            print(f"Ticker {symbol} validated successfully.\n")
            return symbol, initial_price

        if status == "error":
            print(
                "Could not verify the ticker because of a possible "
                "network or Yahoo Finance error."
            )
            print("Check your connection and try again.\n")
            continue

        print(
            f"Ticker '{symbol}' returned no usable market data. "
            "Check the symbol and try again.\n"
        )


def stream_every_second(ticker_symbol, initial_price):
    """Stream prices and update the JSON state once per second."""

    print(
        f"Starting price monitoring for {ticker_symbol}..."
    )
    print("Press Ctrl+C to stop.\n")

    state = {
        "current_price": initial_price,
        "last_price": initial_price,
        "running": True,
    }

    lock = threading.Lock()

    def on_message(message):
        """Handle incoming WebSocket messages."""
        price = message.get("price")

        if price is None:
            return

        try:
            price = float(price)

            if price <= 0:
                return

            with lock:
                state["current_price"] = price

        except (TypeError, ValueError):
            pass

    def run_websocket():
        """Reconnect if the WebSocket disconnects."""
        while state["running"]:
            try:
                with yf.WebSocket() as websocket:
                    websocket.subscribe([ticker_symbol])
                    websocket.listen(on_message)

            except Exception as error:
                if state["running"]:
                    logging.debug(
                        "WebSocket disconnected: %s", error
                    )
                    time.sleep(3)

    websocket_thread = threading.Thread(
        target=run_websocket,
        daemon=True,
    )
    websocket_thread.start()

    now = datetime.now().strftime("%H:%M:%S")
    save_live_state(ticker_symbol, initial_price)

    print(
        f"[{now}] {ticker_symbol} Initial Price: "
        f"{initial_price:.2f}"
    )

    last_fast_info_check = 0

    try:
        while True:
            time.sleep(1)

            # Poll Yahoo Finance periodically as a fallback.
            # Avoid making an HTTP request every second.
            current_time = time.monotonic()

            if current_time - last_fast_info_check >= 15:
                last_fast_info_check = current_time

                try:
                    price = yf.Ticker(
                        ticker_symbol
                    ).fast_info.get("last_price")

                    if price is not None:
                        price = float(price)

                        if price > 0:
                            with lock:
                                state["current_price"] = price

                except Exception as error:
                    logging.debug(
                        "Fallback price request failed: %s",
                        error,
                    )

            with lock:
                current_price = state["current_price"]
                last_price = state["last_price"]

                difference = current_price - last_price

                if difference > 0:
                    direction = "▲"
                elif difference < 0:
                    direction = "▼"
                else:
                    direction = "▬"

                state["last_price"] = current_price

            now = datetime.now().strftime("%H:%M:%S")

            save_live_state(ticker_symbol, current_price)

            print(
                f"[{now}] {ticker_symbol}: "
                f"{current_price:.2f} "
                f"({direction} {difference:+.2f})"
            )

    except KeyboardInterrupt:
        print("\nStopping price stream...")

    finally:
        state["running"] = False
        print("Live price monitoring stopped.")


if __name__ == "__main__":
    try:
        ticker, starting_price = get_valid_ticker()
        stream_every_second(ticker, starting_price)

    except KeyboardInterrupt:
        print("\nProgram stopped.")
