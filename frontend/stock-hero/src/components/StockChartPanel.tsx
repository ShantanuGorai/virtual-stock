import * as React from "react";
import CandleChart, { TIMEFRAMES } from "@/components/ui/candle-chart";
import { useStockCandles, useLiveTicks } from "@/lib/useStockCandles";
import { cn } from "@/lib/utils";

type Range = (typeof TIMEFRAMES)[number];

const SYMBOLS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "TSLA", name: "Tesla" },
];

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const intraday = (r: Range) => r === "1D" || r === "5D";

const dayLabel = (r: Range) => (t: number) => {
  const d = new Date(t);
  if (r === "1D") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  if (r === "5D") return d.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const stampLabel = (r: Range) => (t: number) =>
  intraday(r)
    ? new Date(t).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    : new Date(t).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

export default function StockChartPanel() {
  const [symbol, setSymbol] = React.useState("AAPL");
  const [range, setRange] = React.useState<Range>("1D");
  const { data, error } = useStockCandles(symbol, range);
  const candles = useLiveTicks(data);

  const dayFmt = React.useMemo(() => dayLabel(range), [range]);
  const stampFmt = React.useMemo(() => stampLabel(range), [range]);
  const exchange = data?.exchange?.toUpperCase().replace("NASDAQGS", "NASDAQ").replace("NASDAQGM", "NASDAQ") ?? null;

  return (
    <div className="w-full rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SYMBOLS.map((s) => (
          <button
            key={s.symbol}
            type="button"
            onClick={() => setSymbol(s.symbol)}
            aria-pressed={symbol === s.symbol}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              symbol === s.symbol
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-transparent text-foreground/70 hover:bg-muted"
            )}
          >
            {s.symbol}
            <span className="ml-1.5 hidden opacity-60 sm:inline">{s.name}</span>
          </button>
        ))}
      </div>

      <div className="h-[440px] w-full">
        {candles && candles.length >= 2 ? (
          <CandleChart
            fill
            symbol={symbol}
            exchange={exchange}
            data={candles}
            timeframe={range}
            onTimeframeChange={setRange}
            dayFmt={dayFmt}
            stampFmt={stampFmt}
            priceFmt={money}
            axisFmt={(v) => `$${v.toFixed(2)}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {error ? `Could not load ${symbol}: ${error}` : `Loading ${symbol} prices...`}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {data ? (
          <>
            {data.name} in {data.currency}. Last real price {money(data.price)}
            {data.marketTime ? ` at ${new Date(data.marketTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            {data.stale ? " (provider unreachable, showing the last known data)" : ""}. Prices come from Yahoo Finance and
            the movement between updates is simulated.
          </>
        ) : (
          "Real prices come from Yahoo Finance. The movement between updates is simulated."
        )}
        {data && error ? ` Latest refresh failed: ${error}` : ""}
      </p>
    </div>
  );
}
