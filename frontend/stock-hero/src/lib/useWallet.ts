import * as React from "react";
import { api } from "@/lib/api";

/**
 * Live wallet balance. Loads right away, then refreshes every few seconds (and when the
 * tab becomes visible again), so a change on the server shows up without a page reload.
 * Returns null until the first answer arrives.
 */
export function useWallet(intervalMs = 3000) {
  const [balance, setBalance] = React.useState<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .wallet()
        .then((r) => alive && setBalance(r.balance))
        .catch(() => {}); // keep the last known balance if one request fails

    load();
    const id = window.setInterval(() => {
      if (!document.hidden) load();
    }, intervalMs);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return balance;
}
