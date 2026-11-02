import * as React from "react";
import { api, type Quote } from "@/lib/api";

const CHUNK = 5; // symbols per request: small batches come back fast and fill the list as they arrive

/**
 * Price and % change for a list of symbols. Loads straight away and refreshes every
 * few seconds. The list is asked for in small batches, so the first rows fill in at once
 * instead of waiting for the slowest stock. Quotes already received are kept when the
 * list changes, so nothing flickers back to empty.
 */
export function useQuotes(symbols: string[], pollMs = 20000) {
  const [quotes, setQuotes] = React.useState<Record<string, Quote>>({});
  const mounted = React.useRef(true);
  const key = symbols.join(",");

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!key) return;
    const list = key.split(",");
    const chunks: string[][] = [];
    for (let i = 0; i < list.length; i += CHUNK) chunks.push(list.slice(i, i + CHUNK));

    let running = false;
    const load = () => {
      if (running) return; // the last refresh is still going: do not pile up more requests
      running = true;
      Promise.allSettled(
        chunks.map((chunk) =>
          api
            .quotes(chunk)
            .then((r) => mounted.current && setQuotes((old) => ({ ...old, ...r.quotes })))
        )
      ).finally(() => {
        running = false;
      });
    };

    load();
    const id = window.setInterval(() => {
      if (!document.hidden) load();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [key, pollMs]);

  return quotes;
}
