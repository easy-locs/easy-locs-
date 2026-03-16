/**
 * DeliveryBIDashboard — III. Analytics & BI Dashboard.
 * Advanced delivery analytics with KPIs, trends, zone heatmaps, period comparisons.
 * PASS99-III
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, TrendingDown, MapPin, Download,
  Calendar, Filter, ArrowUpRight, ArrowDownRight, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

type Period = "7d" | "30d" | "90d";

interface ZoneMetric {
  zone: string;
  deliveries: number;
  avgTime: number;
  revenue: number;
  slaRate: number;
  trend: number;
}

const ZONE_DATA: ZoneMetric[] = [
  { zone: "Dakar Centre", deliveries: 342, avgTime: 22, revenue: 4850, slaRate: 96.2, trend: 8.5 },
  { zone: "Plateau", deliveries: 218, avgTime: 18, revenue: 3120, slaRate: 98.1, trend: 12.3 },
  { zone: "Médina", deliveries: 185, avgTime: 28, revenue: 2640, slaRate: 91.4, trend: -3.2 },
  { zone: "Parcelles Assainies", deliveries: 156, avgTime: 35, revenue: 2230, slaRate: 87.6, trend: 5.1 },
  { zone: "Guédiawaye", deliveries: 98, avgTime: 42, revenue: 1400, slaRate: 82.3, trend: -7.8 },
  { zone: "Pikine", deliveries: 124, avgTime: 38, revenue: 1770, slaRate: 85.1, trend: 2.4 },
];

const TREND_DATA = [
  { day: "Lun", deliveries: 48, revenue: 680 },
  { day: "Mar", deliveries: 52, revenue: 740 },
  { day: "Mer", deliveries: 61, revenue: 870 },
  { day: "Jeu", deliveries: 45, revenue: 640 },
  { day: "Ven", deliveries: 72, revenue: 1030 },
  { day: "Sam", deliveries: 85, revenue: 1210 },
  { day: "Dim", deliveries: 38, revenue: 540 },
];

export default function DeliveryBIDashboard({ orgId, className }: { orgId: string; className?: string }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [view, setView] = useState<"overview" | "zones" | "trends" | "compare">("overview");

  const kpis = useMemo(() => {
    const multiplier = period === "7d" ? 0.25 : period === "90d" ? 3.2 : 1;
    return {
      totalDeliveries: Math.round(1123 * multiplier),
      revenue: Math.round(16010 * multiplier),
      avgDeliveryTime: 28,
      slaCompliance: 92.4,
      driverUtilization: 78.3,
      costPerDelivery: 4.2,
      growthDeliveries: 14.2,
      growthRevenue: 18.7,
    };
  }, [period]);

  const maxDeliveries = Math.max(...ZONE_DATA.map(z => z.deliveries));
  const maxTrend = Math.max(...TREND_DATA.map(t => t.deliveries));

  const exportCSV = () => {
    haptic("medium");
    const header = "Zone,Livraisons,Temps moyen (min),Revenue (FCFA),SLA %,Tendance %\n";
    const rows = ZONE_DATA.map(z => `${z.zone},${z.deliveries},${z.avgTime},${z.revenue},${z.slaRate},${z.trend}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `delivery-bi-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("📊 Export CSV téléchargé");
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <BarChart3 className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Analytics & BI
        </h3>
        <div className="flex items-center gap-1.5">
          {(["7d", "30d", "90d"] as Period[]).map(p => (
            <button key={p} onClick={() => { setPeriod(p); haptic("selection"); }}
              className="px-2 py-1 rounded-md text-[9px] font-semibold"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Livraisons", value: kpis.totalDeliveries.toLocaleString(), growth: kpis.growthDeliveries, color: "--primary" },
          { label: "Revenue", value: `${(kpis.revenue / 1000).toFixed(1)}k`, growth: kpis.growthRevenue, color: "--success" },
          { label: "Temps moy.", value: `${kpis.avgDeliveryTime}min`, growth: -2.1, color: "--info" },
          { label: "SLA", value: `${kpis.slaCompliance}%`, growth: 1.8, color: "--warning" },
          { label: "Utilisation", value: `${kpis.driverUtilization}%`, growth: 5.4, color: "--primary" },
          { label: "Coût/livr.", value: `${kpis.costPerDelivery}€`, growth: -3.5, color: "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              {k.growth >= 0 ? (
                <ArrowUpRight className="h-2.5 w-2.5" style={{ color: "hsl(var(--success))" }} />
              ) : (
                <ArrowDownRight className="h-2.5 w-2.5" style={{ color: "hsl(var(--destructive))" }} />
              )}
              <span className="text-[7px] font-semibold"
                style={{ color: k.growth >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                {Math.abs(k.growth)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["overview", "zones", "trends", "compare"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "overview" ? "📊 Vue" : v === "zones" ? "🗺️ Zones" : v === "trends" ? "📈 Tendances" : "🔄 Comparaison"}
          </button>
        ))}
      </div>

      {/* Overview: mini bar chart */}
      {view === "overview" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Livraisons par jour</p>
          <div className="flex items-end gap-1.5 h-24 px-2">
            {TREND_DATA.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(t.deliveries / maxTrend) * 80}px` }}
                  transition={{ delay: i * 0.05 }}
                  className="w-full rounded-t-md"
                  style={{ background: `hsl(var(--primary) / ${0.4 + (t.deliveries / maxTrend) * 0.6})` }}
                />
                <span className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.day}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-2">
            <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              Total : {TREND_DATA.reduce((s, t) => s + t.deliveries, 0)} livraisons
            </span>
            <span className="text-[8px]" style={{ color: "hsl(var(--success))" }}>
              {TREND_DATA.reduce((s, t) => s + t.revenue, 0).toLocaleString()} FCFA
            </span>
          </div>
        </div>
      )}

      {/* Zone Heatmap */}
      {view === "zones" && (
        <div className="space-y-2">
          {ZONE_DATA.map(z => (
            <div key={z.zone} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{z.zone}</span>
                </div>
                <div className="flex items-center gap-1">
                  {z.trend >= 0 ? (
                    <TrendingUp className="h-3 w-3" style={{ color: "hsl(var(--success))" }} />
                  ) : (
                    <TrendingDown className="h-3 w-3" style={{ color: "hsl(var(--destructive))" }} />
                  )}
                  <span className="text-[9px] font-semibold"
                    style={{ color: z.trend >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                    {z.trend > 0 ? "+" : ""}{z.trend}%
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(z.deliveries / maxDeliveries) * 100}%` }}
                  className="h-full rounded-full"
                  style={{ background: z.slaRate >= 95 ? "hsl(var(--success))" : z.slaRate >= 85 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{z.deliveries} livr. • {z.avgTime}min moy.</span>
                <span className="text-[8px] font-semibold" style={{ color: "hsl(var(--primary))" }}>{z.revenue.toLocaleString()} FCFA</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trends */}
      {view === "trends" && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Revenue par jour</p>
          <div className="flex items-end gap-1.5 h-28 px-2">
            {TREND_DATA.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[7px] font-semibold" style={{ color: "hsl(var(--success))" }}>{t.revenue}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(t.revenue / 1300) * 80}px` }}
                  transition={{ delay: i * 0.06 }}
                  className="w-full rounded-t-md"
                  style={{ background: "hsl(var(--success) / 0.6)" }}
                />
                <span className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.day}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-2.5 text-center" style={{ background: "hsl(var(--muted) / 0.2)" }}>
              <p className="text-xs font-bold" style={{ color: "hsl(var(--success))" }}>+18.7%</p>
              <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>Croissance revenue</p>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: "hsl(var(--muted) / 0.2)" }}>
              <p className="text-xs font-bold" style={{ color: "hsl(var(--primary))" }}>+14.2%</p>
              <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>Croissance volume</p>
            </div>
          </div>
        </div>
      )}

      {/* Period Comparison */}
      {view === "compare" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Comparaison période précédente</p>
          {[
            { metric: "Livraisons", current: kpis.totalDeliveries, previous: Math.round(kpis.totalDeliveries * 0.87), unit: "" },
            { metric: "Revenue", current: kpis.revenue, previous: Math.round(kpis.revenue * 0.84), unit: " FCFA" },
            { metric: "Temps moyen", current: kpis.avgDeliveryTime, previous: 31, unit: " min" },
            { metric: "SLA %", current: kpis.slaCompliance, previous: 89.1, unit: "%" },
          ].map(c => {
            const change = ((c.current - c.previous) / c.previous * 100);
            const isGood = c.metric === "Temps moyen" ? change < 0 : change > 0;
            return (
              <div key={c.metric} className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{c.metric}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>Avant : {c.previous}{c.unit}</span>
                    <span className="text-[9px] font-semibold" style={{ color: "hsl(var(--primary))" }}>Actuel : {c.current}{c.unit}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isGood ? "hsl(var(--success) / 0.1)" : "hsl(var(--destructive) / 0.1)",
                    color: isGood ? "hsl(var(--success))" : "hsl(var(--destructive))",
                  }}>
                  {change > 0 ? "+" : ""}{change.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
