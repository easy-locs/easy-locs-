/**
 * DriverEarningsDashboard — Earnings overview for drivers.
 * PASS80-K: Driver Earnings Dashboard
 */
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Calendar, Clock, Loader2 } from "lucide-react";
import { useDriverEarnings } from "@/hooks/useDriverEarnings";

interface Props {
  className?: string;
}

export default function DriverEarningsDashboard({ className }: Props) {
  const { stats, entries, loading } = useDriverEarnings();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
      </div>
    );
  }

  if (!stats) return null;

  const maxDaily = Math.max(...stats.dailyEarnings.map(d => d.amount), 1);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Main stat */}
      <div className="rounded-xl p-4 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.08), hsl(var(--success) / 0.06))", border: "1px solid hsl(var(--hud-cyan) / 0.12)" }}>
        <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Total gagné</p>
        <p className="text-2xl font-black mt-1" style={{ color: "hsl(var(--hud-cyan))" }}>
          {stats.totalEarned.toFixed(2)} <span className="text-sm">{stats.currency}</span>
        </p>
        <p className="text-[10px] mt-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          {stats.totalJobs} livraisons • Moy. {stats.avgPerJob.toFixed(2)} {stats.currency}/livraison
        </p>
      </div>

      {/* Period stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Aujourd'hui", earned: stats.todayEarned, jobs: stats.todayJobs, color: "--success" },
          { label: "7 jours", earned: stats.weekEarned, jobs: stats.weekJobs, color: "--hud-cyan" },
          { label: "30 jours", earned: stats.monthEarned, jobs: stats.monthJobs, color: "--warning" },
        ].map(p => (
          <div key={p.label} className="rounded-lg px-2.5 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${p.color}))` }}>
              {p.earned.toFixed(0)}€
            </p>
            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
              {p.label} ({p.jobs})
            </p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
          <TrendingUp className="h-3 w-3 inline mr-1" />14 derniers jours
        </p>
        <div className="flex items-end gap-0.5 h-16">
          {stats.dailyEarnings.map((d, i) => (
            <motion.div
              key={d.date}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max((d.amount / maxDaily) * 100, 4)}%` }}
              transition={{ delay: i * 0.03 }}
              className="flex-1 rounded-t"
              style={{ background: d.amount > 0 ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-border) / 0.1)", minHeight: 2 }}
              title={`${d.date}: ${d.amount.toFixed(2)}€ (${d.jobs})`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
            {stats.dailyEarnings[0]?.date.slice(5)}
          </span>
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
            {stats.dailyEarnings[stats.dailyEarnings.length - 1]?.date.slice(5)}
          </span>
        </div>
      </div>

      {/* Recent earnings */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold px-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Dernières livraisons
        </p>
        {entries.slice(0, 8).map(e => (
          <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium truncate" style={{ color: "hsl(var(--hud-text))" }}>
                {e.notes || "Colis"}
              </p>
              <p className="text-[9px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                {e.completed_at ? new Date(e.completed_at).toLocaleDateString("fr") : ""}
              </p>
            </div>
            <span className="text-[11px] font-bold shrink-0" style={{ color: "hsl(var(--success))" }}>
              +{(e.current_price || 0).toFixed(2)} AED
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
