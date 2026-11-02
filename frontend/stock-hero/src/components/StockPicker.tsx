import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { STOCKS, POPULAR, stockName } from "@/lib/stocks";
import { useQuotes } from "@/lib/useQuotes";
import { cn } from "@/lib/utils";

// Slim scrollbar that blends into the card: no arrows, see-through track, a faint thumb that
// gets a little darker while the pointer is over the list. (The first two lines are the standard
// way, used by current Chrome, Edge and Firefox; the -webkit- lines cover older Chrome and Safari.)
const SOFT_SCROLL = [
  "[scrollbar-width:thin]",
  "[scrollbar-color:hsl(var(--foreground)/0.18)_transparent]",
  "hover:[scrollbar-color:hsl(var(--foreground)/0.38)_transparent]",
  "[&::-webkit-scrollbar]:w-2",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-foreground/20",
  "[&::-webkit-scrollbar-thumb:hover]:bg-foreground/40",
  "[&::-webkit-scrollbar-button]:hidden",
].join(" ");

type Sort = "popular" | "gainers" | "losers";

const SORTS: { id: Sort; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "gainers", label: "Top gainers" },
  { id: "losers", label: "Top losers" },
];

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (n: number | null | undefined) => (n == null ? "--" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);

const pctColor = (n: number | null | undefined) =>
  n == null ? "text-muted-foreground" : n >= 0 ? "text-green-600" : "text-red-500";

export default function StockPicker({ value, onChange }: { value: string; onChange: (symbol: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("popular");
  const box = React.useRef<HTMLDivElement>(null);

  // The pill and the quick buttons always need prices. The full list needs them once it is open.
  const symbols = React.useMemo(() => {
    const base = new Set<string>([...POPULAR.map((s) => s.symbol), value]);
    if (open) STOCKS.forEach((s) => base.add(s.symbol));
    return [...base];
  }, [open, value]);
  const quotes = useQuotes(symbols);

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const pick = (symbol: string) => {
    onChange(symbol);
    close();
  };

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = STOCKS.filter((s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    if (sort !== "popular") {
      const dir = sort === "gainers" ? -1 : 1;
      const val = (sym: string) => quotes[sym]?.changePct;
      list = [...list].sort((a, b) => {
        const x = val(a.symbol);
        const y = val(b.symbol);
        if (x == null && y == null) return 0;
        if (x == null) return 1; // stocks without a price go last
        if (y == null) return -1;
        return (x - y) * dir;
      });
    }
    return list;
  }, [query, sort, quotes]);

  // Typed something that is not in the list but looks like a ticker: let them open it anyway
  const typed = query.trim().toUpperCase();
  const canOpenTyped = /^[A-Z][A-Z0-9.\-]{0,9}$/.test(typed) && !STOCKS.some((s) => s.symbol === typed);

  const current = quotes[value];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div ref={box} className="relative">
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-3.5 pr-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <span>{value}</span>
          <span className="hidden font-normal text-muted-foreground sm:inline">{stockName(value)}</span>
          <span className={cn("text-xs font-semibold tabular-nums", pctColor(current?.changePct))}>{pct(current?.changePct)}</span>
          <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-30 mt-2 w-[360px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xl">
            <div className="border-b p-3">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (rows[0]) pick(rows[0].symbol);
                    else if (canOpenTyped) pick(typed);
                  }}
                  placeholder="Search by name or symbol"
                  aria-label="Search stocks"
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="mt-2.5 flex gap-1.5">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSort(s.id)}
                    aria-pressed={sort === s.id}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      sort === s.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-transparent text-foreground/70 hover:bg-muted"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 pb-1 pt-2 text-[11px] text-muted-foreground">
              <span>Name</span>
              <span>Today</span>
            </div>

            <ul role="listbox" aria-label="Stocks" className={cn("max-h-80 overflow-y-auto overscroll-contain pb-2", SOFT_SCROLL)}>
              {rows.map((s) => {
                const q = quotes[s.symbol];
                const selected = s.symbol === value;
                return (
                  <li key={s.symbol} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => pick(s.symbol)}
                      className={cn(
                        "flex w-full items-center gap-3 border-0 bg-transparent px-4 py-2 text-left transition-colors hover:bg-muted",
                        selected && "bg-muted"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{s.symbol}</span>
                        <span className="block truncate text-xs text-muted-foreground">{s.name}</span>
                      </span>
                      <span className="text-right">
                        <span className={cn("block text-sm font-semibold tabular-nums", pctColor(q?.changePct))}>{pct(q?.changePct)}</span>
                        <span className="block text-xs tabular-nums text-muted-foreground">{q ? money(q.price) : "--"}</span>
                      </span>
                      <Check size={16} className={cn("shrink-0", selected ? "text-foreground" : "invisible")} />
                    </button>
                  </li>
                );
              })}
              {canOpenTyped && (
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => pick(typed)}
                    className="flex w-full items-center gap-3 border-0 bg-transparent px-4 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span>
                      Open <span className="font-semibold">{typed}</span>
                      <span className="block text-xs text-muted-foreground">Load this symbol from the market</span>
                    </span>
                  </button>
                </li>
              )}
              {rows.length === 0 && !canOpenTyped && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">No stocks match "{query}"</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {POPULAR.map((s) => {
        const q = quotes[s.symbol];
        const active = s.symbol === value;
        return (
          <button
            key={s.symbol}
            type="button"
            onClick={() => onChange(s.symbol)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active ? "border-foreground bg-foreground text-background" : "border-border bg-transparent text-foreground/70 hover:bg-muted"
            )}
          >
            {s.symbol}
            {q?.changePct != null && (
              <span className={cn("ml-1.5 tabular-nums", active ? "opacity-80" : pctColor(q.changePct))}>{pct(q.changePct)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
