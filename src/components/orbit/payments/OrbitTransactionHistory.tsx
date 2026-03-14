/**
 * OrbitTransactionHistory — Wallet transaction history with reference codes
 */
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Clock, HandCoins, CreditCard, Copy, Check, Shield } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs } from "@/lib/orbit-payments";

const TYPE_ICONS: Record<string, typeof ArrowUpRight> = {
  transfer: ArrowUpRight,
  request: HandCoins,
  purchase: CreditCard,
};

const STATUS_COLORS: Record<string, string> = {
  completed: "text-success",
  pending: "text-warning",
  failed: "text-destructive",
};

export default function OrbitTransactionHistory() {
  const { transactions, loading } = useWallet();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedId(ref);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="w-6 h-6 text-muted-foreground/30 animate-pulse" />
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
        <Clock className="w-12 h-12 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">No transactions yet</p>
        <p className="text-xs text-muted-foreground/60">Your transaction history will appear here</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
      {transactions.map((tx, i) => {
        const isIn = tx.direction === "in";
        const isPending = tx.status === "pending";
        const isFailed = tx.status === "failed";
        const refCode = (tx as any).reference_code || null;
        const txIdShort = tx.id.slice(0, 8).toUpperCase();

        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`px-4 py-3 border-b border-border last:border-0 ${isFailed ? "opacity-60" : ""}`}
          >
            {/* Main row */}
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isFailed ? "bg-destructive/10" : isIn ? "bg-success/10" : "bg-destructive/10"
                }`}
              >
                {isIn ? (
                  <ArrowDownLeft className={`w-4 h-4 ${isPending ? "text-warning" : isFailed ? "text-destructive" : "text-success"}`} />
                ) : (
                  <ArrowUpRight className={`w-4 h-4 ${isPending ? "text-warning" : isFailed ? "text-destructive" : "text-destructive"}`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {tx.description || tx.type}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(tx.created_at).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                  <span className={`ml-1.5 font-medium ${STATUS_COLORS[tx.status] || "text-muted-foreground"}`}>
                    • {tx.status === "completed" ? "✅ Completed" : tx.status === "pending" ? "⏳ Pending" : "❌ Failed"}
                  </span>
                </p>
              </div>

              <span className={`text-sm font-bold tabular-nums ${isIn ? "text-success" : "text-foreground"}`}>
                {isIn ? "+" : "−"}{formatLocs(tx.amount)}
              </span>
            </div>

            {/* Reference & ID row */}
            <div className="flex items-center gap-2 mt-1.5 ml-12">
              {refCode && (
                <button
                  onClick={() => copyRef(refCode)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
                  title="Copy reference code"
                >
                  <span className="text-[9px] font-mono text-muted-foreground">{refCode}</span>
                  {copiedId === refCode ? (
                    <Check className="w-2.5 h-2.5 text-success" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  )}
                </button>
              )}
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md">
                <Shield className="w-2.5 h-2.5 text-muted-foreground/40" />
                <span className="text-[8px] font-mono text-muted-foreground/40">ID:{txIdShort}</span>
              </div>
              {tx.original_currency && tx.original_currency !== "LOCS" && (
                <span className="text-[9px] text-muted-foreground/60">
                  ({tx.original_amount} {tx.original_currency})
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
