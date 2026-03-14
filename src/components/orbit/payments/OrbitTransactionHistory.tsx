/**
 * OrbitTransactionHistory — Recent wallet transactions
 */
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Clock, HandCoins, CreditCard } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { formatLocs } from "@/lib/orbit-payments";

const TYPE_ICONS: Record<string, typeof ArrowUpRight> = {
  transfer: ArrowUpRight,
  request: HandCoins,
  purchase: CreditCard,
};

export default function OrbitTransactionHistory() {
  const { transactions, loading } = useWallet();

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
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col"
    >
      {transactions.map((tx, i) => {
        const Icon = TYPE_ICONS[tx.type] || Clock;
        const isIn = tx.direction === "in";
        const isPending = tx.status === "pending";

        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isIn ? "bg-success/10" : "bg-destructive/10"
              }`}
            >
              {isIn ? (
                <ArrowDownLeft className={`w-4 h-4 ${isPending ? "text-warning" : "text-success"}`} />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-destructive" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {tx.description || tx.type}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(tx.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {isPending && (
                  <span className="ml-1.5 text-warning font-medium">• Pending</span>
                )}
              </p>
            </div>

            <span
              className={`text-sm font-bold tabular-nums ${
                isIn ? "text-success" : "text-foreground"
              }`}
            >
              {isIn ? "+" : "−"}{formatLocs(tx.amount)}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
