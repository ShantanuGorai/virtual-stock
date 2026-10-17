import json
import os
import sys
import threading
import time
from datetime import datetime

STATE_FILE = "live_data.json"


def read_live_state():
    """Reads the latest ticker and price written by stock.py."""
    if not os.path.exists(STATE_FILE):
        return None
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return None


def listen_for_enter_or_esc(callback, stop_event):
    """Cross-platform raw key listener for ENTER (BUY) and ESC (SELL)."""
    if os.name == "nt":
        import msvcrt

        while not stop_event.is_set():
            if msvcrt.kbhit():
                ch = msvcrt.getch()
                if ch in (b"\r", b"\n"):
                    callback("BUY")
                elif ch == b"\x1b":
                    callback("SELL")
                elif ch == b"\x03":  # Ctrl+C
                    stop_event.set()
                    break
            time.sleep(0.05)
    else:
        import select
        import termios
        import tty

        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setcbreak(fd)
            while not stop_event.is_set():
                rlist, _, _ = select.select([sys.stdin], [], [], 0.05)
                if rlist:
                    ch = sys.stdin.read(1)
                    if ch in ("\r", "\n"):
                        callback("BUY")
                    elif ch == "\x1b":
                        rlist2, _, _ = select.select([sys.stdin], [], [], 0.02)
                        if not rlist2:
                            callback("SELL")
                        else:
                            sys.stdin.read(2)
                    elif ch == "\x03":  # Ctrl+C
                        stop_event.set()
                        break
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)


def calculate_pnl(position, entry_price, current_price):
    """
    BUY: Profit when current_price > entry_price (expecting price to go UP)
    SELL: Profit when current_price < entry_price (expecting price to go DOWN)
    """
    if position == "BUY":
        pnl = current_price - entry_price
    else:
        pnl = entry_price - current_price

    pct = (pnl / entry_price) * 100 if entry_price else 0.0
    return pnl, pct


def main():
    print("Waiting for stock.py to stream a valid ticker...")
    live_data = None
    while live_data is None:
        live_data = read_live_state()
        if live_data is None:
            time.sleep(0.5)

    ticker = live_data["ticker"]
    current_price = live_data["price"]
    print(f"Detected active stream from stock.py -> {ticker} @ {current_price:.2f}\n")

    # Ask user for custom trade duration in seconds
    while True:
        try:
            duration = int(input("Enter custom time in seconds (e.g., 60): ").strip())
            if duration > 0:
                break
            print("Time must be greater than 0 seconds.\n")
        except ValueError:
            print("Please enter a valid number of seconds.\n")

    latest = read_live_state()
    if latest:
        ticker = latest["ticker"]
        current_price = latest["price"]

    state = {
        "position": None,
        "entry_price": current_price,
        "current_price": current_price,
        "last_price": current_price,
        "realized_pnl": 0.0,
    }
    lock = threading.Lock()
    stop_event = threading.Event()
    start_event = threading.Event()

    print("\n" + "=" * 75)
    print(f"LIVE TERMINAL TRADER | Ticker: {ticker} | Custom Time: {duration}s")
    print("-" * 75)
    print("CONTROLS:")
    print("  [Press ENTER] -> BUY  (Expect price to go UP to sell higher)")
    print("  [Press ESC]   -> SELL (Borrow & sell expecting price to go DOWN)")
    print("=" * 75)
    print("\nPress [ENTER] to BUY or [ESC] to SELL to start the timer...\n")

    def on_key_action(new_action):
        with lock:
            latest_data = read_live_state()
            if latest_data:
                state["current_price"] = latest_data["price"]

            now = datetime.now().strftime("%H:%M:%S")

            # First key press starts the trade and timer
            if state["position"] is None:
                state["position"] = new_action
                state["entry_price"] = state["current_price"]
                state["last_price"] = state["current_price"]
                start_event.set()
                strategy = (
                    "Expecting price to go UP"
                    if new_action == "BUY"
                    else "Expecting price to go DOWN"
                )
                print(
                    f"[{now}] STARTED WITH {new_action} @ {state['entry_price']:.2f} ({strategy})"
                )
                return

            # Ignore if pressing the same key as current position
            if state["position"] == new_action:
                print(
                    f"[{now}] Already in {new_action} position @ {state['entry_price']:.2f}"
                )
                return

            # Flip decision: lock in profit/loss from previous position and switch
            closed_pnl, closed_pct = calculate_pnl(
                state["position"], state["entry_price"], state["current_price"]
            )
            state["realized_pnl"] += closed_pnl
            old_pos = state["position"]
            state["position"] = new_action
            state["entry_price"] = state["current_price"]

            print("\n" + "-" * 75)
            print(
                f"[{now}] DECISION CHANGED: {old_pos} -> {new_action} @ {state['current_price']:.2f}"
            )
            print(
                f"Locked in P&L from {old_pos}: {closed_pnl:+.2f} ({closed_pct:+.2f}%) | "
                f"Total Realized P&L: {state['realized_pnl']:+.2f}"
            )
            print("-" * 75 + "\n")

    key_thread = threading.Thread(
        target=listen_for_enter_or_esc, args=(on_key_action, stop_event), daemon=True
    )
    key_thread.start()

    # Wait until user presses Enter or Esc
    try:
        while not start_event.is_set() and not stop_event.is_set():
            time.sleep(0.05)
    except KeyboardInterrupt:
        stop_event.set()
        return

    end_time = time.time() + duration

    # Main 1-second loop: prints status every second even if price has not changed
    try:
        while time.time() < end_time and not stop_event.is_set():
            time.sleep(1)
            if stop_event.is_set():
                break

            latest_data = read_live_state()
            with lock:
                if latest_data:
                    ticker = latest_data["ticker"]
                    state["current_price"] = latest_data["price"]

                new_price = state["current_price"]
                diff = new_price - state["last_price"]

                if diff > 0:
                    direction = "▲"
                elif diff < 0:
                    direction = "▼"
                else:
                    direction = "▬"

                state["last_price"] = new_price

                open_pnl, open_pct = calculate_pnl(
                    state["position"], state["entry_price"], new_price
                )
                net_pnl = state["realized_pnl"] + open_pnl
                remaining = max(0, int(round(end_time - time.time())))
                now = datetime.now().strftime("%H:%M:%S")
                tag = "PROFIT" if open_pnl >= 0 else "LOSS"

                print(
                    f"[{now}] {ticker}: {new_price:.2f} ({direction} {diff:+.2f}) | "
                    f"Mode: {state['position']} (Entry: {state['entry_price']:.2f}) | "
                    f"{tag}: {open_pnl:+.2f} ({open_pct:+.2f}%) | "
                    f"Net P&L: {net_pnl:+.2f} | {remaining}s left"
                )

    except KeyboardInterrupt:
        pass
    finally:
        stop_event.set()

    # Final Settlement when timer ends
    with lock:
        if state["position"] is not None:
            final_open_pnl, final_open_pct = calculate_pnl(
                state["position"], state["entry_price"], state["current_price"]
            )
            total_pnl = state["realized_pnl"] + final_open_pnl
            close_type = (
                "SOLD to close BUY"
                if state["position"] == "BUY"
                else "BOUGHT BACK to close SELL"
            )

            print("\n" + "=" * 75)
            print("TIME UP - FINAL TRADE SUMMARY")
            print("=" * 75)
            print(f"Ticker:                  {ticker}")
            print(f"Final Action:            {close_type} @ {state['current_price']:.2f}")
            print(f"Last Position Entry:     {state['entry_price']:.2f} ({state['position']})")
            print(f"Final Position P&L:      {final_open_pnl:+.2f} ({final_open_pct:+.2f}%)")
            print(f"Previous Switches P&L:   {state['realized_pnl']:+.2f}")
            print("-" * 75)
            status = "TOTAL PROFIT" if total_pnl >= 0 else "TOTAL LOSS"
            print(f"{status}: {total_pnl:+.2f}")
            print("=" * 75)


if __name__ == "__main__":
    main()