/**
 * DeliveryAnalyticsReports — Advanced analytics: avg time, success rate, heatmaps, trends.
 * PASS84-DD: Delivery Analytics & Reports
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Clock, CheckCircle2, XCircle, MapPin, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobRecord {
  id: string;
  status: string;
  created_at: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  delivery_fee: number | null;
  currency: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  priority: string;
  driver_id: string | null;
}

interface DailyStats {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  revenue: number;
  avgDeliveryMin: number;
}

type Period = "7d" | "30d" | "90d";

export default function DeliveryAnalyticsReports({ orgId }: { orgId: string }) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  const periodDays = { "7d": 7, "30d": 30, "90d": 90 };

  useEffect(() => {
    if (!orgId) return;
    const fetch = async () => {
      const since = new Date();
      since.setDate(since.getDate() - periodDays[period]);
      const { data } = await supabase
        .from("delivery_jobs")
        .select("id, status, created_at, assigned_at, accepted_at, picked_up_at, delivered_at, delivery_fee, currency, dropoff_lat, dropoff_lng, priority, driver_id")
        .eq("org_id", orgId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });
      if (data) setJobs(data as JobRecord[]);
      setLoading(false);
    };
    fetch();
  }, [orgId, period]);

  const analytics = useMemo(() => {
    const completed = jobs.filter(j => j.status === "completed");
    const cancelled = jobs.filter(j => j.status === "cancelled");

    // Delivery times
    const deliveryTimes = completed
      .filter(j => j.created_at && j.delivered_at)
      .map(j => (new Date(j.delivered_at!).getTime() - new Date(j.created_at!).getTime()) / 60000);
    const avgDeliveryMin = deliveryTimes.length > 0 ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length : 0;
    const fastestMin = deliveryTimes.length > 0 ? Math.min(...deliveryTimes) : 0;
    const slowestMin = deliveryTimes.length > 0 ? Math.max(...deliveryTimes) : 0;

    // Acceptance times
    const acceptTimes = jobs
      .filter(j => j.assigned_at && j.accepted_at)
      .map(j => (new Date(j.accepted_at!).getTime() - new Date(j.assigned_at!).getTime()) / 60000);
    const avgAcceptMin = acceptTimes.length > 0 ? acceptTimes.reduce((a, b) => a + b, 0) / acceptTimes.length : 0;

    // Revenue
    const totalRevenue = completed.reduce((s, j) => s + (j.delivery_fee || 0), 0);
    const avgRevenue = completed.length > 0 ? totalRevenue / completed.length : 0;

    // Success rate
    const successRate = jobs.length > 0 ? Math.round((completed.length / jobs.length) * 100) : 0;

    // Daily breakdown
    const dailyMap = new Map<string, DailyStats>();
    for (const j of jobs) {
      const d = j.created_at ? j.created_at.slice(0, 10) : "unknown";
      if (!dailyMap.has(d)) dailyMap.set(d, { date: d, total: 0, completed: 0, cancelled: 0, revenue: 0, avgDeliveryMin: 0 });
      const day = dailyMap.get(d)!;
      day.total++;
      if (j.status === "completed") { day.completed++; day.revenue += j.delivery_fee || 0; }
      if (j.status === "cancelled") day.cancelled++;
    }
    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Priority breakdown
    const byPriority = { standard: 0, express: 0, urgent: 0 };
    for (const j of jobs) {
      const p = j.priority as keyof typeof byPriority;
      if (p in byPriority) byPriority[p]++;
    }

    // Unique drivers
    const uniqueDrivers = new Set(jobs.filter(j => j.driver_id).map(j => j.driver_id)).size;

    // Heatmap data (dropoff locations)
    const heatPoints = jobs
      .filter(j => j.dropoff_lat && j.dropoff_lng)
      .map(j => ({ lat: j.dropoff_lat!, lng: j.dropoff_lng! }));

    return {
      total: jobs.length, completed: completed.length, cancelled: cancelled.length,
      avgDeliveryMin: Math.round(avgDeliveryMin), fastestMin: Math.round(fastestMin), slowestMin: Math.round(slowestMin),
      avgAcceptMin: Math.round(avgAcceptMin * 10) / 10,
      totalRevenue, avgRevenue: Math.round(avgRevenue * 100) / 100,
      successRate, dailyStats, byPriority, uniqueDrivers, heatPoints,
    };
  }, [jobs]);

  // Find peak day
  const peakDay = analytics.dailyStats.reduce<DailyStats | null>((max, d) => !max || d.total > max.total ? d : max, null);
  const maxDailyTotal = Math.max(...analytics.dailyStats.map(d => d.total), 1);

  const handleExport = () => {
    const csv = [
      "Date,Total,Complétées,Annulées,Revenu",
      ...analytics.dailyStats.map(d => `${d.date},${d.total},${d.completed},${d.cancelled},${d.revenue}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `delivery-analytics-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["7d", "30d", "90d"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                background: period === p ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface))",
                color: period === p ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
              }}>
              {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "90 jours"}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="text-[10px] h-7 px-2.5"
          onClick={handleExport}
          style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <BarChart3 className="h-5 w-5 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total missions", value: analytics.total, icon: "📊", color: "--hud-cyan" },
              { label: "Taux de succès", value: `${analytics.successRate}%`, icon: "✅", color: analytics.successRate >= 80 ? "--success" : "--warning" },
              { label: "Temps moyen", value: `${analytics.avgDeliveryMin} min`, icon: "⏱️", color: "--info" },
              { label: "Acceptation moy.", value: `${analytics.avgAcceptMin} min`, icon: "⚡", color: "--warning" },
              { label: "Revenu total", value: `${analytics.totalRevenue.toFixed(0)}€`, icon: "💰", color: "--success" },
              { label: "Chauffeurs actifs", value: analytics.uniqueDrivers, icon: "🚗", color: "--hud-cyan" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="rounded-xl px-3 py-2.5"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{icon}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Speed records */}
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>⚡ Records de vitesse</p>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: "hsl(var(--success))" }}>{analytics.fastestMin}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>min. (le plus rapide)</p>
              </div>
              <div className="h-8 w-px" style={{ background: "hsl(var(--hud-border) / 0.1)" }} />
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: "hsl(var(--warning))" }}>{analytics.avgDeliveryMin}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>min. (moyenne)</p>
              </div>
              <div className="h-8 w-px" style={{ background: "hsl(var(--hud-border) / 0.1)" }} />
              <div className="text-center">
                <p className="text-lg font-bold" style={{ color: "hsl(var(--destructive))" }}>{analytics.slowestMin}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>min. (le plus lent)</p>
              </div>
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>📦 Par priorité</p>
            <div className="flex gap-2">
              {[
                { label: "Standard", count: analytics.byPriority.standard, color: "--success", emoji: "🟢" },
                { label: "Express", count: analytics.byPriority.express, color: "--warning", emoji: "🟠" },
                { label: "Urgent", count: analytics.byPriority.urgent, color: "--destructive", emoji: "🔴" },
              ].map(p => (
                <div key={p.label} className="flex-1 text-center py-2 rounded-lg"
                  style={{ background: `hsl(var(${p.color}) / 0.06)` }}>
                  <span className="text-xs">{p.emoji}</span>
                  <p className="text-sm font-bold" style={{ color: `hsl(var(${p.color}))` }}>{p.count}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{p.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Daily chart (bar chart) */}
          {analytics.dailyStats.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
                📈 Tendance quotidienne
                {peakDay && <span className="ml-1 font-normal" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  (pic: {peakDay.date.slice(5)} — {peakDay.total})
                </span>}
              </p>
              <div className="flex items-end gap-px h-20">
                {analytics.dailyStats.slice(-30).map(d => {
                  const h = (d.total / maxDailyTotal) * 100;
                  const successH = d.total > 0 ? (d.completed / d.total) * h : 0;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col justify-end group relative" title={`${d.date}: ${d.total} (${d.completed}✓ ${d.cancelled}✕)`}>
                      <div className="rounded-t-sm" style={{ height: `${successH}%`, background: "hsl(var(--success) / 0.6)", minHeight: d.completed > 0 ? 2 : 0 }} />
                      <div className="rounded-t-sm" style={{ height: `${h - successH}%`, background: "hsl(var(--destructive) / 0.4)", minHeight: d.cancelled > 0 ? 1 : 0 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                  {analytics.dailyStats[0]?.date.slice(5)}
                </span>
                <div className="flex gap-3">
                  <span className="text-[7px] flex items-center gap-0.5" style={{ color: "hsl(var(--success) / 0.6)" }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "hsl(var(--success) / 0.6)" }} /> Succès
                  </span>
                  <span className="text-[7px] flex items-center gap-0.5" style={{ color: "hsl(var(--destructive) / 0.4)" }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "hsl(var(--destructive) / 0.4)" }} /> Annulé
                  </span>
                </div>
                <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                  {analytics.dailyStats[analytics.dailyStats.length - 1]?.date.slice(5)}
                </span>
              </div>
            </div>
          )}

          {/* Heatmap summary */}
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-[10px] font-semibold mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
              🗺️ Couverture géographique
            </p>
            <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
              {analytics.heatPoints.length} points de livraison géolocalisés sur {analytics.total} missions
            </p>
            {analytics.heatPoints.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
                <span className="text-[9px]" style={{ color: "hsl(var(--hud-text))" }}>
                  Lat: {(analytics.heatPoints.reduce((s, p) => s + p.lat, 0) / analytics.heatPoints.length).toFixed(4)}
                  , Lng: {(analytics.heatPoints.reduce((s, p) => s + p.lng, 0) / analytics.heatPoints.length).toFixed(4)}
                  {" "}(centre)
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
