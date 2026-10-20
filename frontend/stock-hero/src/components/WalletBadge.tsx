import * as React from "react";
import { Wallet } from "lucide-react";
import { useWallet } from "@/lib/useWallet";
import { cn } from "@/lib/utils";

const CURRENCY = "₤";

const format = (n: number) =>
  `${CURRENCY}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WalletBadge() {
  const balance = useWallet();
  const previous = React.useRef<number | null>(null);
  const [flash, setFlash] = React.useState<"up" | "down" | null>(null);

  // Briefly colour the amount green or red when it changes
  React.useEffect(() => {
    if (balance === null) return;
    const before = previous.current;
    previous.current = balance;
    if (before === null || before === balance) return;
    setFlash(balance > before ? "up" : "down");
    const t = window.setTimeout(() => setFlash(null), 1200);
    return () => window.clearTimeout(t);
  }, [balance]);

  return (
    <div className="flex items-center gap-2 text-sm font-semibold" aria-live="polite" aria-label="Wallet balance">
      <Wallet size={18} strokeWidth={2.5} className="text-foreground/80" />
      <span
        className={cn(
          "tabular-nums transition-colors duration-500",
          flash === "up" && "text-green-600",
          flash === "down" && "text-red-600",
          !flash && "text-foreground/80"
        )}
      >
        {balance === null ? `${CURRENCY}--` : format(balance)}
      </span>
    </div>
  );
}
