import * as React from "react";
import { api, type MarketResponse } from "@/lib/api";
import type { Candle } from "@/components/ui/candle-chart";

export interface MarketData extends Omit<MarketResponse, "candles"> {
  candles: Candle[]; // volume in millions, as the chart expects
}

/** Loads real candles for a symbol and range, then refreshes them every few seconds. */
export function useStockCandles(symbol: string, range: string, pollMs = 10000) {
  const [data, setData] = React.useState<MarketData | null>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    setData(null);
    setError("");

    const load = () =>
      api
        .candles(symbol, range)
        .then((r) => {
          if (!alive) return;
          setData({ ...r, candles: r.candles.map((k) => ({ ...k, v: k.v / 1e6 })) });
          setError("");
        })
        .catch((e: Error) => alive && setError(e.message));

    load();
    const id = window.setInterval(() => {
      if (!document.hidden) load();
    }, pollMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [symbol, range, pollMs]);

  return { data, error };
}

interface Sim {
  price: number;
  hi: number;
  lo: number;
}

/**
 * Real-time simulation on top of the real price: once a second the newest candle moves a
 * little around the last real price (never more than 0.2% away). When fresh real data
 * arrives the simulation snaps back to it, so the chart can never drift from the real price.
 */
export function useLiveTicks(data: MarketData | null): Candle[] | null {
  const real = data?.price ?? null;
  const [sim, setSim] = React.useState<Sim | null>(null);

  React.useEffect(() => {
    setSim(real === null ? null : { price: real, hi: real, lo: real });
  }, [real, data?.symbol]);

  React.useEffect(() => {
    if (real === null) return;
    const id = window.setInterval(() => {
      setSim((s) => {
        const cur = s ? s.price : real;
        const pull = (real - cur) * 0.15;
        const noise = cur * (Math.random() - 0.5) * 0.0008;
        const next = Math.min(real * 1.002, Math.max(real * 0.998, cur + pull + noise));
        return { price: next, hi: Math.max(s ? s.hi : next, next), lo: Math.min(s ? s.lo : next, next) };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [real]);

  return React.useMemo(() => {
    if (!data) return null;
    if (!sim) return data.candles;
    const out = data.candles.slice();
    const last = { ...out[out.length - 1] };
    last.c = sim.price;
    last.h = Math.max(last.h, sim.hi);
    last.l = Math.min(last.l, sim.lo);
    out[out.length - 1] = last;
    return out;
  }, [data, sim]);
}
