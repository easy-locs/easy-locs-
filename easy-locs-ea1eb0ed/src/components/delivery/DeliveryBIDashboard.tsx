/**
 * DeliveryBIDashboard — III. Analytics & BI Dashboard.
 * Advanced delivery analytics with KPIs, trends, zone heatmaps, period comparisons.
 * PASS99-III
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, TrendingDown, MapPin, Download,
  Calendar, Filter, ArrowUpRight, ArrowDownRight, Activity, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useMobilityJobsDashboard, type MobilityJobRow } from "@/hooks/useDeliveryData";

type Period = "7d" | "30d" | "90d";

interface ZoneMetric {
  zone: string;
  deliveries: number;
  avgTime: number;
  revenue: number;
  slaRate: number;
  trend: number;
}

export default function DeliveryBIDashboard({ orgId, className }: { orgId: string; className?: string }) {
  const { data: jobs = [], isLoading } = useMobilityJobsDashboard(orgId);
  const [period, setPeriod] = useState<Period>("30d");
  const [view, setView] = useState<"overview" | "zones" | "trends" | "compare">("overview");

  const periodDays = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const filteredJobs = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const cutoffStr = cutoff.toISOString();
    return jobs.filter((j: MobilityJobRow) => j.created_at >= cutoffStr);
  }, [jobs, periodDays]);

  const kpis = useMemo(() => {
    const completed = filteredJobs.filter((j: MobilityJobRow) => j.status === "completed");
    const cancelled = filteredJobs.filter((j: MobilityJobRow) => j.status === "cancelled");
    const totalDeliveries = filteredJobs.length;
    const revenue = completed.reduce((s: number, j: MobilityJobRow) => s + (j.current_price || j.quoted_price || 0), 0);
    const deliveryTimes = completed
      .filter((j: MobilityJobRow) => j.accepted_at && j.completed_at)
      .map((j: MobilityJobRow) => (new Date(j.completed_at!).getTime() - new Date(j.accepted_at!).getTime()) / 60000);
    const avgDeliveryTime = deliveryTimes.length ? Math.round(deliveryTimes.reduce((a: number, b: number) => a + b, 0) / deliveryTimes.length) : 0;
    const slaCompliance = totalDeliveries > 0 ? Math.round((completed.length / Math.max(completed.length + cancelled.length, 1)) * 100 * 10) / 10 : 0;
    const uniqueDrivers = new Set(filteredJobs.map((j: MobilityJobRow) => j.rider_user_id).filter(Boolean));
    const driverUtilization = uniqueDrivers.size > 0 ? Math.round((completed.length / uniqueDrivers.size / periodDays) * 100 * 10) / 10 : 0;
    const costPerDelivery = completed.length > 0 ? Math.round((revenue / completed.length) * 10) / 10 : 0;

    const prevCutoff = new Date();
    prevCutoff.setDate(prevCutoff.getDate() - periodDays * 2);
    const prevCutoffStr = prevCutoff.toISOString();
    const curCutoffStr = new Date(Date.now() - periodDays * 86400000).toISOString();
    const prevJobs = jobs.filter((j: MobilityJobRow) => j.created_at >= prevCutoffStr && j.created_at < curCutoffStr);
    const prevCompleted = prevJobs.filter((j: MobilityJobRow) => j.status === "completed");
    const prevRevenue = prevCompleted.reduce((s: number, j: MobilityJobRow) => s + (j.current_price || j.quoted_price || 0), 0);
    const growthDeliveries = prevJobs.length > 0 ? Math.round((totalDeliveries - prevJobs.length) / prevJobs.length * 1000) / 10 : 0;
    const growthRevenue = prevRevenue > 0 ? Math.round((revenue - prevRevenue) / prevRevenue * 1000) / 10 : 0;

    return { totalDeliveries, revenue, avgDeliveryTime, slaCompliance, driverUtilization, costPerDelivery, growthDeliveries, growthRevenue };
  }, [filteredJobs, jobs, periodDays]);

  const zoneData = useMemo<ZoneMetric[]>(() => {
    const zoneMap = new Map<string, MobilityJobRow[]>();
    filteredJobs.forEach((j: MobilityJobRow) => {
      const zone = j.pickup_address?.split(",").pop()?.trim() || "Inconnu";
      if (!zoneMap.has(zone)) zoneMap.set(zone, []);
      zoneMap.get(zone)!.push(j);
    });
    return Array.from(zoneMap.entries()).map(([zone, zJobs]) => {
      const completed = zJobs.filter((j: MobilityJobRow) => j.status === "completed");
      const cancelled = zJobs.filter((j: MobilityJobRow) => j.status === "cancelled");
      const times = completed
        .filter((j: MobilityJobRow) => j.accepted_at && j.completed_at)
        .map((j: MobilityJobRow) => (new Date(j.completed_at!).getTime() - new Date(j.accepted_at!).getTime()) / 60000);
      return {
        zone,
        deliveries: zJobs.length,
        avgTime: times.length ? Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length) : 0,
        revenue: completed.reduce((s: number, j: MobilityJobRow) => s + (j.current_price || j.quoted_price || 0), 0),
        slaRate: zJobs.length > 0 ? Math.round((completed.length / Math.max(completed.length + cancelled.length, 1)) * 100) : 0,
        trend: 0,
      };
    }).sort((a, b) => b.deliveries - a.deliveries).slice(0, 10);
  }, [filteredJobs]);

  const trendData = useMemo(() => {
    const dayMap = new Map<string, { deliveries: number; revenue: number }>();
    const days = Math.min(periodDays, 14);
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), { deliveries: 0, revenue: 0 });
    }
    filteredJobs.forEach((j: MobilityJobRow) => {
      const day = j.created_at?.slice(0, 10);
      if (day && dayMap.has(day)) {
        const e = dayMap.get(day)!;
        e.deliveries++;
        if (j.status === "completed") e.revenue += j.current_price || j.quoted_price || 0;
      }
    });
    return Array.from(dayMap.entries()).map(([day, v]) => ({
      day: day.slice(5),
      deliveries: v.deliveries,
      revenue: Math.round(v.revenue),
    }));
  }, [filteredJobs, periodDays]);

  const maxDeliveries = Math.max(1, ...zoneData.map(z => z.deliveries));
  const maxTrend = Math.max(1, ...trendData.map(t => t.deliveries));

  const exportCSV = () => {
    haptic("medium");
    const header = "Zone,Livraisons,Temps moyen (min),Revenue (FCFA),SLA %,Tendance %\n";
    const rows = zoneData.map(z => `${z.zone},${z.deliveries},${z.avgTime},${z.revenue},${z.slaRate},${z.trend}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `delivery-bi-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("📊 Export CSV téléchargé");
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ""}`}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--primary))" }} />
        <span className="ml-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Chargement des analytics…</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <BarChart3 className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Analytics & BI
        </h3>
        <div className="flex items-center gap-1.5">
          {(["7d", "30d", "90d"] as Period[]).map(p => (
            <button key={p} onClick={() => { setPeriod(p); haptic("selection"); }}
              className="px-2 py-1 rounded-md text-[0.625rem] font-semibold"
              style={{
                background: period === p ? "hsl(var(--primary) / 0.1)" : "transparent",
                color: period === p ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              }}>
              {p}
            </button>
          ))}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Livraisons", value: kpis.totalDeliveries.toLocaleString(), growth: kpis.growthDeliveries, color: "--primary" },
          { label: "Revenue", value: `${(kpis.revenue / 1000).toFixed(1)}k`, growth: kpis.growthRevenue, color: "--success" },
          { label: "Temps moy.", value: `${kpis.avgDeliveryTime}min`, growth: 0, color: "--info" },
          { label: "SLA", value: `${kpis.slaCompliance}%`, growth: 0, color: "--warning" },
          { label: "Utilisation", value: `${kpis.driverUtilization}%`, growth: 0, color: "--primary" },
          { label: "Coût/livr.", value: `${kpis.costPerDelivery}€`, growth: 0, color: "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
            {k.growth !== 0 && (
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                {k.growth >= 0 ? (
                  <ArrowUpRight className="h-2.5 w-2.5" style={{ color: "hsl(var(--success))" }} />
                ) : (
                  <ArrowDownRight className="h-2.5 w-2.5" style={{ color: "hsl(var(--destructive))" }} />
                )}
                <span className="text-[0.625rem] font-semibold"
                  style={{ color: k.growth >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                  {Math.abs(k.growth)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["overview", "zones", "trends", "compare"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[0.625rem] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "overview" ? "📊 Vue" : v === "zones" ? "🗺️ Zones" : v === "trends" ? "📈 Tendances" : "🔄 Comparaison"}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <div className="space-y-2">
          {trendData.length === 0 ? (
            <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune donnée de livraison pour cette période</p>
          ) : (
            <>
              <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Livraisons par jour</p>
              <div className="flex items-end gap-1.5 h-24 px-2">
                {trendData.map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(t.deliveries / maxTrend) * 80}px` }}
                      transition={{ delay: i * 0.05 }}
                      className="w-full rounded-t-md"
                      style={{ background: `hsl(var(--primary) / ${0.4 + (t.deliveries / maxTrend) * 0.6})` }}
                    />
                    <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-2">
                <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Total : {trendData.reduce((s, t) => s + t.deliveries, 0)} livraisons
                </span>
                <span className="text-[0.625rem]" style={{ color: "hsl(var(--success))" }}>
                  {trendData.reduce((s, t) => s + t.revenue, 0).toLocaleString()} FCFA
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {view === "zones" && (
        <div className="space-y-2">
          {zoneData.length === 0 ? (
            <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune zone avec des livraisons</p>
          ) : zoneData.map(z => (
            <div key={z.zone} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                  <span className="text-[0.6875rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{z.zone}</span>
                </div>
                <div className="flex items-center gap-1">
                  {z.trend >= 0 ? (
                    <TrendingUp className="h-3 w-3" style={{ color: "hsl(var(--success))" }} />
                  ) : (
                    <TrendingDown className="h-3 w-3" style={{ color: "hsl(var(--destructive))" }} />
                  )}
                  <span className="text-[0.625rem] font-semibold"
                    style={{ color: z.trend >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                    {z.trend > 0 ? "+" : ""}{z.trend}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(z.deliveries / maxDeliveries) * 100}%` }}
                  className="h-full rounded-full"
                  style={{ background: z.slaRate >= 95 ? "hsl(var(--success))" : z.slaRate >= 85 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{z.deliveries} livr. • {z.avgTime}min moy.</span>
                <span className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--primary))" }}>{z.revenue.toLocaleString()} FCFA</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "trends" && (
        <div className="space-y-3">
          {trendData.length === 0 ? (
            <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune donnée de tendance disponible</p>
          ) : (
            <>
              <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Revenue par jour</p>
              <div className="flex items-end gap-1.5 h-28 px-2">
                {trendData.map((t, i) => {
                  const maxRev = Math.max(1, ...trendData.map(d => d.revenue));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--success))" }}>{t.revenue}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(t.revenue / maxRev) * 80}px` }}
                        transition={{ delay: i * 0.06 }}
                        className="w-full rounded-t-md"
                        style={{ background: "hsl(var(--success) / 0.6)" }}
                      />
                      <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-2.5 text-center" style={{ background: "hsl(var(--muted) / 0.2)" }}>
                  <p className="text-xs font-bold" style={{ color: "hsl(var(--success))" }}>
                    {kpis.growthRevenue >= 0 ? "+" : ""}{kpis.growthRevenue}%
                  </p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>Croissance revenue</p>
                </div>
                <div className="rounded-xl p-2.5 text-center" style={{ background: "hsl(var(--muted) / 0.2)" }}>
                  <p className="text-xs font-bold" style={{ color: "hsl(var(--primary))" }}>
                    {kpis.growthDeliveries >= 0 ? "+" : ""}{kpis.growthDeliveries}%
                  </p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>Croissance volume</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {view === "compare" && (
        <div className="space-y-2">
          {filteredJobs.length === 0 ? (
            <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Pas assez de données pour comparer</p>
          ) : (
            <>
              <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Comparaison période précédente</p>
              {[
                { metric: "Livraisons", current: kpis.totalDeliveries, previous: Math.round(kpis.totalDeliveries / (1 + kpis.growthDeliveries / 100) || kpis.totalDeliveries), unit: "" },
                { metric: "Revenue", current: Math.round(kpis.revenue), previous: Math.round(kpis.revenue / (1 + kpis.growthRevenue / 100) || kpis.revenue), unit: " FCFA" },
                { metric: "Temps moyen", current: kpis.avgDeliveryTime, previous: kpis.avgDeliveryTime, unit: " min" },
                { metric: "SLA %", current: kpis.slaCompliance, previous: kpis.slaCompliance, unit: "%" },
              ].map(c => {
                const change = c.previous > 0 ? ((c.current - c.previous) / c.previous * 100) : 0;
                const isGood = c.metric === "Temps moyen" ? change < 0 : change > 0;
                return (
                  <div key={c.metric} className="rounded-xl p-3 flex items-center justify-between"
                    style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                    <div>
                      <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.metric}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>Avant : {c.previous}{c.unit}</span>
                        <span className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--primary))" }}>Actuel : {c.current}{c.unit}</span>
                      </div>
                    </div>
                    {change !== 0 && (
                      <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: isGood ? "hsl(var(--success) / 0.1)" : "hsl(var(--destructive) / 0.1)",
                          color: isGood ? "hsl(var(--success))" : "hsl(var(--destructive))",
                        }}>
                        {change > 0 ? "+" : ""}{change.toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
