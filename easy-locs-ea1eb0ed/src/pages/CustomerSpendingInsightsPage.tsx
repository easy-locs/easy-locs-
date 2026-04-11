import { useNavigate } from "react-router-dom";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchSpendingHistory } from "@/repositories/customer-orders.repository";
import { motion } from "framer-motion";
import { ArrowLeft, PieChart, TrendingUp, ShoppingBag, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function CustomerSpendingInsightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-spending-insights", user?.id],
    queryFn: async () => {
      const rows = await fetchSpendingHistory(user?.id);
      const total = rows.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0);
      const average = rows.length > 0 ? total / rows.length : 0;

      const monthly = new Map<string, number>();
      for (const row of rows) {
        const key = row.created_at
          ? new Date(row.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
          : "Unknown";
        monthly.set(key, (monthly.get(key) ?? 0) + Number((row as any).total_amount ?? 0));
      }

      const entries = Array.from(monthly.entries()).slice(-6);
      const maxMonth = entries.length > 0 ? Math.max(...entries.map(e => e[1])) : 0;

      const lastMonth = entries[entries.length - 1]?.[1] ?? 0;
      const prevMonth = entries[entries.length - 2]?.[1] ?? 0;
      const trend = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

      return {
        totalSpent: total,
        orderCount: rows.length,
        averageOrder: average,
        monthly: entries,
        maxMonth,
        trend,
        currency: rows[0]?.currency ?? "AED",
      };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/me")}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Spending Insights</h1>
          <p className="text-xs text-muted-foreground">Your order spending summary</p>
        </div>
      </div>

      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mb-3 h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted) / 0.3)" }} />
      ))}

      {!isLoading && data && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))", border: "1px solid hsl(var(--primary) / 0.1)" }}
          >
            <div className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.08)" }}>
              <PieChart className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Spending</p>
            <p className="text-3xl font-extrabold text-foreground tabular-nums">
              {formatMoneyByCountry(data.totalSpent, null, data.currency)}
            </p>
            {data.trend !== 0 && (
              <div className="flex items-center gap-1 mt-2">
                {data.trend > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "hsl(350 65% 55%)" }} />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" style={{ color: "hsl(152 60% 42%)" }} />
                )}
                <span className="text-xs font-bold" style={{ color: data.trend > 0 ? "hsl(350 65% 55%)" : "hsl(152 60% 42%)" }}>
                  {Math.abs(data.trend).toFixed(0)}%
                </span>
                <span className="text-[10px] text-muted-foreground">vs last month</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mx-4 mb-4 grid grid-cols-3 gap-2"
          >
            <StatCard icon={ShoppingBag} label="Orders" value={String(data.orderCount)} color="hsl(210 80% 52%)" />
            <StatCard icon={Wallet} label="Average" value={formatMoneyByCountry(data.averageOrder, null, data.currency)} color="hsl(152 60% 42%)" />
            <StatCard icon={TrendingUp} label="Months" value={String(data.monthly.length)} color="hsl(270 60% 55%)" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 rounded-2xl bg-card p-4"
            style={{ border: "1px solid hsl(var(--border) / 0.1)" }}
          >
            <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-4">Monthly Breakdown</h2>
            {data.monthly.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {data.monthly.map(([month, amount]: any, idx: number) => {
                  const pct = data.maxMonth > 0 ? (amount / data.maxMonth) * 100 : 0;
                  return (
                    <div key={month}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{month}</span>
                        <span className="text-xs font-bold" style={{ color: "hsl(var(--primary))" }}>
                          {formatMoneyByCountry(Number(amount), null, data.currency)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.15 + idx * 0.05, duration: 0.5, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "hsl(var(--primary))" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</p>
    </div>
  );
}
