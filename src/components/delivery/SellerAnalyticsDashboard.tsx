/**
 * SellerAnalyticsDashboard — Comprehensive analytics for sellers.
 * PASS81-R: Seller Analytics Dashboard
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Package, Clock, CheckCircle2, XCircle, DollarSign, Loader2, BarChart3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  orgId: string;
  className?: string;
}

interface Analytics {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  completionRate: number;
  totalSpent: number;
  avgDeliveryFee: number;
  avgDeliveryTime: number; // hours
  currency: string;
  dailyVolume: { date: string; count: number; completed: number }[];
  topDrivers: { driverId: string; count: number; avgRating: number }[];
  statusBreakdown: { status: string; count: number }[];
}

export default function SellerAnalyticsDashboard({ orgId, className }: Props) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    if (!user) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const daysAgo = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - daysAgo);

        const { data: jobs } = await supabase
          .from("mobility_jobs")
          .select("id, status, delivery_fee, currency, created_at, delivered_at, driver_id")
          .eq("merchant_id", user.id)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(1000);

        const all = jobs || [];
        const completed = all.filter(j => j.status === "completed");
        const cancelled = all.filter(j => j.status === "cancelled");
        const pending = all.filter(j => j.status === "pending");
        const inProgress = all.filter(j => ["assigned", "accepted", "in_progress"].includes(j.status));

        const totalSpent = all.reduce((s, j) => s + (j.delivery_fee || 0), 0);

        // Avg delivery time for completed jobs
        const deliveryTimes = completed
          .filter(j => j.created_at && j.delivered_at)
          .map(j => (new Date(j.delivered_at!).getTime() - new Date(j.created_at!).getTime()) / 3600000);
        const avgTime = deliveryTimes.length ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length : 0;

        // Daily volume
        const dailyMap = new Map<string, { count: number; completed: number }>();
        for (let i = daysAgo - 1; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          dailyMap.set(d.toISOString().slice(0, 10), { count: 0, completed: 0 });
        }
        all.forEach(j => {
          const day = j.created_at?.slice(0, 10);
          if (day && dailyMap.has(day)) {
            const e = dailyMap.get(day)!;
            e.count++;
            if (j.status === "completed") e.completed++;
          }
        });

        // Top drivers
        const driverMap = new Map<string, { count: number }>();
        completed.filter(j => j.driver_id).forEach(j => {
          const d = driverMap.get(j.driver_id!) || { count: 0 };
          d.count++;
          driverMap.set(j.driver_id!, d);
        });
        const topDrivers = Array.from(driverMap.entries())
          .map(([driverId, v]) => ({ driverId, count: v.count, avgRating: 0 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Status breakdown
        const statusMap = new Map<string, number>();
        all.forEach(j => statusMap.set(j.status, (statusMap.get(j.status) || 0) + 1));

        setAnalytics({
          totalJobs: all.length,
          completedJobs: completed.length,
          cancelledJobs: cancelled.length,
          pendingJobs: pending.length,
          inProgressJobs: inProgress.length,
          completionRate: all.length ? Math.round((completed.length / all.length) * 100) : 0,
          totalSpent,
          avgDeliveryFee: all.length ? Math.round(totalSpent / all.length * 100) / 100 : 0,
          avgDeliveryTime: Math.round(avgTime * 10) / 10,
          currency: all[0]?.currency || "EUR",
          dailyVolume: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
          topDrivers,
          statusBreakdown: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
        });
      } catch (err) {
        console.error("[seller-analytics]", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user, period, orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
      </div>
    );
  }
  if (!analytics) return null;

  const maxDaily = Math.max(...analytics.dailyVolume.map(d => d.count), 1);

  const STATUS_COLORS: Record<string, string> = {
    completed: "var(--success)",
    cancelled: "var(--destructive)",
    pending: "var(--warning)",
    assigned: "var(--info)",
    accepted: "var(--success)",
    in_progress: "var(--hud-cyan)",
  };

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Period selector */}
      <div className="flex gap-1">
        {(["7d", "30d", "90d"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className="text-[10px] px-3 py-1 rounded-full font-medium transition-all"
            style={{
              background: period === p ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.06)",
              color: period === p ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
            }}>
            {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "90 jours"}
          </button>
        ))}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Package, label: "Total missions", value: analytics.totalJobs.toString(), color: "--hud-cyan" },
          { icon: CheckCircle2, label: "Taux succès", value: `${analytics.completionRate}%`, color: "--success" },
          { icon: DollarSign, label: "Total frais", value: `${analytics.totalSpent.toFixed(0)}€`, color: "--warning" },
          { icon: Clock, label: "Temps moy.", value: `${analytics.avgDeliveryTime}h`, color: "--info" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-3 text-center"
              style={{ background: `hsl(${kpi.color} / 0.06)`, border: `1px solid hsl(${kpi.color} / 0.1)` }}>
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: `hsl(${kpi.color})` }} />
              <p className="text-lg font-black" style={{ color: `hsl(${kpi.color})` }}>{kpi.value}</p>
              <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Volume chart */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
          <BarChart3 className="h-3 w-3 inline mr-1" /> Volume de missions
        </p>
        <div className="flex items-end gap-px h-20">
          {analytics.dailyVolume.slice(-30).map((d, i) => (
            <motion.div key={d.date} className="flex-1 flex flex-col justify-end"
              initial={{ height: 0 }} animate={{ height: "auto" }} transition={{ delay: i * 0.01 }}>
              <div className="rounded-t" style={{
                height: `${Math.max((d.completed / maxDaily) * 100, 2)}%`,
                background: "hsl(var(--success) / 0.7)",
                minHeight: d.completed > 0 ? 3 : 0,
              }} />
              <div className="rounded-t" style={{
                height: `${Math.max(((d.count - d.completed) / maxDaily) * 100, 2)}%`,
                background: "hsl(var(--hud-cyan) / 0.4)",
                minHeight: d.count - d.completed > 0 ? 2 : 0,
              }} />
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
            {analytics.dailyVolume[0]?.date.slice(5)}
          </span>
          <div className="flex gap-3">
            <span className="text-[7px] flex items-center gap-1" style={{ color: "hsl(var(--success) / 0.6)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "hsl(var(--success) / 0.7)" }} /> Terminé
            </span>
            <span className="text-[7px] flex items-center gap-1" style={{ color: "hsl(var(--hud-cyan) / 0.5)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "hsl(var(--hud-cyan) / 0.4)" }} /> Autre
            </span>
          </div>
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
            {analytics.dailyVolume[analytics.dailyVolume.length - 1]?.date.slice(5)}
          </span>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Répartition par statut
        </p>
        <div className="space-y-1.5">
          {analytics.statusBreakdown.sort((a, b) => b.count - a.count).map(s => {
            const pct = analytics.totalJobs ? (s.count / analytics.totalJobs) * 100 : 0;
            const colorVar = STATUS_COLORS[s.status] || "var(--hud-text-dim)";
            return (
              <div key={s.status}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[9px] capitalize" style={{ color: `hsl(${colorVar})` }}>{s.status}</span>
                  <span className="text-[9px] font-bold" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{s.count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-border) / 0.08)" }}>
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    style={{ background: `hsl(${colorVar})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top drivers */}
      {analytics.topDrivers.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
            <Users className="h-3 w-3 inline mr-1" /> Top livreurs
          </p>
          <div className="space-y-1">
            {analytics.topDrivers.map((d, i) => (
              <div key={d.driverId} className="flex items-center gap-2 py-1">
                <span className="text-[10px] font-bold w-4" style={{ color: i === 0 ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
                  #{i + 1}
                </span>
                <span className="text-[10px] truncate flex-1" style={{ color: "hsl(var(--hud-text))" }}>
                  {d.driverId.slice(0, 8)}…
                </span>
                <span className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
                  {d.count} missions
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
