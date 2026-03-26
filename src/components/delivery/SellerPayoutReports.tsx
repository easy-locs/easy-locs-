/**
 * SellerPayoutReports — TTT. Financial reports for sellers: revenue, commissions,
 * delivery fees breakdown, with period filtering.
 * PASS95-TTT
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, TrendingDown, Download, Calendar,
  Loader2, FileText, PieChart, ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  orgId: string;
  className?: string;
}

interface JobRow {
  id: string;
  status: string;
  delivery_fee: number | null;
  currency: string | null;
  created_at: string | null;
  delivered_at: string | null;
  [key: string]: any;
}

export default function SellerPayoutReports({ orgId, className }: Props) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      let q = supabase
        .from("mobility_jobs")
        .select("id, status, current_price, quoted_price, currency, created_at, completed_at")
        .eq("merchant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (period !== "all") {
        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        q = q.gte("created_at", since.toISOString());
      }

      const { data } = await q;
      setJobs((data || []).map((r: any) => ({ ...r, delivery_fee: r.current_price ?? r.quoted_price, delivered_at: r.completed_at })) as JobRow[]);
      setLoading(false);
    };
    fetch();
  }, [user, period]);

  const stats = useMemo(() => {
    const completed = jobs.filter(j => j.status === "completed");
    const totalRevenue = completed.reduce((s, j) => s + (j.delivery_fee || 0), 0);
    const commissionRate = 0.12; // 12% platform commission
    const commission = totalRevenue * commissionRate;
    const netPayout = totalRevenue - commission;
    const avgPerJob = completed.length ? totalRevenue / completed.length : 0;
    const currency = jobs[0]?.currency || "EUR";

    // Weekly breakdown
    const weeklyMap = new Map<string, { revenue: number; jobs: number }>();
    completed.forEach(j => {
      const d = new Date(j.delivered_at || j.created_at || "");
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      const existing = weeklyMap.get(key) || { revenue: 0, jobs: 0 };
      existing.revenue += j.delivery_fee || 0;
      existing.jobs++;
      weeklyMap.set(key, existing);
    });

    return {
      totalRevenue, commission, netPayout, avgPerJob, currency,
      completedCount: completed.length, totalCount: jobs.length,
      weekly: Array.from(weeklyMap.entries()).map(([week, v]) => ({ week, ...v })).sort((a, b) => a.week.localeCompare(b.week)),
    };
  }, [jobs]);

  const exportCSV = () => {
    const rows = [
      ["ID", "Statut", "Frais", "Devise", "Créé le", "Livré le"],
      ...jobs.map(j => [j.id, j.status, String(j.delivery_fee || 0), j.currency || "EUR", j.created_at || "", j.delivered_at || ""]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payout-report-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport exporté !");
  };

  const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} /></div>;
  }

  const maxWeekly = Math.max(...stats.weekly.map(w => w.revenue), 1);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Period + Export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "all"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="text-[10px] px-3 py-1 rounded-full font-medium transition-all"
              style={{
                background: period === p ? "hsl(var(--hud-cyan) / 0.15)" : "hsl(var(--hud-border) / 0.06)",
                color: period === p ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)",
              }}>
              {p === "all" ? "Tout" : p === "7d" ? "7j" : p === "30d" ? "30j" : "90j"}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={exportCSV}
          style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: DollarSign, label: "Revenus bruts", value: `${fmt(stats.totalRevenue)}€`, color: "--success" },
          { icon: TrendingDown, label: "Commission (12%)", value: `-${fmt(stats.commission)}€`, color: "--destructive" },
          { icon: TrendingUp, label: "Net à percevoir", value: `${fmt(stats.netPayout)}€`, color: "--hud-cyan" },
          { icon: FileText, label: "Missions terminées", value: `${stats.completedCount}/${stats.totalCount}`, color: "--info" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-3 text-center"
              style={{ background: `hsl(var(${kpi.color}) / 0.06)`, border: `1px solid hsl(var(${kpi.color}) / 0.1)` }}>
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: `hsl(var(${kpi.color}))` }} />
              <p className="text-lg font-black" style={{ color: `hsl(var(${kpi.color}))` }}>{kpi.value}</p>
              <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Avg per job */}
      <div className="rounded-xl p-3 flex items-center justify-between"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Frais moyen / mission</span>
        <span className="text-sm font-black" style={{ color: "hsl(var(--warning))" }}>{fmt(stats.avgPerJob)}€</span>
      </div>

      {/* Weekly revenue chart */}
      {stats.weekly.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
            <PieChart className="h-3 w-3 inline mr-1" /> Revenus hebdomadaires
          </p>
          <div className="space-y-1.5">
            {stats.weekly.slice(-8).map(w => {
              const pct = (w.revenue / maxWeekly) * 100;
              return (
                <div key={w.week}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
                      Sem. {w.week.slice(5)}
                    </span>
                    <span className="text-[9px] font-bold" style={{ color: "hsl(var(--success))" }}>
                      {fmt(w.revenue)}€ <span style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>({w.jobs})</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-border) / 0.08)" }}>
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      style={{ background: "hsl(var(--success) / 0.7)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
          Dernières transactions
        </p>
        <div className="space-y-1">
          {jobs.slice(0, 10).map(j => (
            <div key={j.id} className="flex items-center justify-between py-1.5 border-b"
              style={{ borderColor: "hsl(var(--hud-border) / 0.05)" }}>
              <div>
                <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text))" }}>
                  {j.id.slice(0, 8)}…
                </span>
                <span className="text-[8px] ml-2" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                  {j.created_at ? new Date(j.created_at).toLocaleDateString("fr") : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] capitalize px-1.5 py-0.5 rounded-full"
                  style={{
                    background: j.status === "completed" ? "hsl(var(--success) / 0.1)" : "hsl(var(--hud-border) / 0.06)",
                    color: j.status === "completed" ? "hsl(var(--success))" : "hsl(var(--hud-text-dim) / 0.5)",
                  }}>
                  {j.status}
                </span>
                <span className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
                  {(j.delivery_fee || 0).toFixed(2)}€
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
