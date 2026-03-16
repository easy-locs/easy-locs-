/**
 * DeliveryAdvancedAnalytics — Advanced delivery analytics dashboards.
 * Heatmap zones, KPI trends, operational metrics, CSV/PDF-ready export.
 * PASS87-PP: Analytics & Reporting
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, MapPin, Clock, Download, Calendar, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

type TimeRange = "7d" | "30d" | "90d";
type AnalyticsTab = "overview" | "heatmap" | "trends" | "drivers";

interface ZoneData {
  id: string;
  name: string;
  deliveries: number;
  avgTime: number;
  avgFee: number;
  successRate: number;
  intensity: number; // 0-1 for heatmap
}

interface TrendPoint {
  date: string;
  deliveries: number;
  revenue: number;
  avgTime: number;
  cancellations: number;
}

interface DriverPerf {
  id: string;
  name: string;
  deliveries: number;
  avgRating: number;
  avgTime: number;
  successRate: number;
  revenue: number;
}

// Mock data generators
const generateZones = (): ZoneData[] => [
  { id: "z1", name: "Centre-Ville", deliveries: 245, avgTime: 22, avgFee: 8.5, successRate: 97, intensity: 0.95 },
  { id: "z2", name: "Quartier Nord", deliveries: 180, avgTime: 28, avgFee: 10.2, successRate: 94, intensity: 0.75 },
  { id: "z3", name: "Zone Industrielle", deliveries: 120, avgTime: 35, avgFee: 12.8, successRate: 96, intensity: 0.55 },
  { id: "z4", name: "Banlieue Est", deliveries: 85, avgTime: 40, avgFee: 14.5, successRate: 92, intensity: 0.38 },
  { id: "z5", name: "Résidentiel Sud", deliveries: 65, avgTime: 25, avgFee: 9.0, successRate: 98, intensity: 0.28 },
  { id: "z6", name: "Périphérie Ouest", deliveries: 40, avgTime: 45, avgFee: 16.0, successRate: 90, intensity: 0.15 },
];

const generateTrends = (days: number): TrendPoint[] => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - i - 1) * 86400000);
    const base = 20 + Math.sin(i / 7 * Math.PI) * 8;
    return {
      date: date.toLocaleDateString("fr", { day: "2-digit", month: "short" }),
      deliveries: Math.round(base + Math.random() * 10),
      revenue: Math.round((base * 9 + Math.random() * 50) * 100) / 100,
      avgTime: Math.round(25 + Math.random() * 15),
      cancellations: Math.round(Math.random() * 3),
    };
  });
};

const generateDriverPerf = (): DriverPerf[] => [
  { id: "d1", name: "Karim B.", deliveries: 142, avgRating: 4.8, avgTime: 20, successRate: 98, revenue: 1250 },
  { id: "d2", name: "Fatima M.", deliveries: 128, avgRating: 4.9, avgTime: 18, successRate: 99, revenue: 1180 },
  { id: "d3", name: "Jean L.", deliveries: 105, avgRating: 4.5, avgTime: 28, successRate: 94, revenue: 980 },
  { id: "d4", name: "Amina K.", deliveries: 95, avgRating: 4.7, avgTime: 22, successRate: 97, revenue: 850 },
  { id: "d5", name: "Omar S.", deliveries: 78, avgRating: 4.3, avgTime: 32, successRate: 91, revenue: 720 },
];

export default function DeliveryAdvancedAnalytics({ orgId }: { orgId: string }) {
  const [range, setRange] = useState<TimeRange>("30d");
  const [tab, setTab] = useState<AnalyticsTab>("overview");

  const zones = useMemo(generateZones, []);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const trends = useMemo(() => generateTrends(days), [days]);
  const drivers = useMemo(generateDriverPerf, []);

  const kpis = useMemo(() => {
    const totalDel = trends.reduce((s, t) => s + t.deliveries, 0);
    const totalRev = trends.reduce((s, t) => s + t.revenue, 0);
    const avgTime = Math.round(trends.reduce((s, t) => s + t.avgTime, 0) / trends.length);
    const totalCancel = trends.reduce((s, t) => s + t.cancellations, 0);
    return { totalDel, totalRev, avgTime, totalCancel, successRate: totalDel > 0 ? ((totalDel - totalCancel) / totalDel * 100) : 0 };
  }, [trends]);

  const exportCSV = () => {
    haptic("medium");
    const headers = "Date,Livraisons,Revenu,Temps Moy,Annulations\n";
    const rows = trends.map(t => `${t.date},${t.deliveries},${t.revenue},${t.avgTime},${t.cancellations}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `delivery-analytics-${range}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  const maxDeliveries = Math.max(...trends.map(t => t.deliveries), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Analytics avancées</h3>
        </div>
        <Button size="sm" className="text-[9px] h-6 px-2" onClick={exportCSV}
          style={{ background: "hsl(var(--info) / 0.1)", color: "hsl(var(--info))" }}>
          <Download className="w-2.5 h-2.5 mr-0.5" /> CSV
        </Button>
      </div>

      {/* Time range */}
      <div className="flex gap-1">
        {(["7d", "30d", "90d"] as TimeRange[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className="px-3 py-1 rounded-full text-[9px] font-semibold transition-all"
            style={{
              background: range === r ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface))",
              color: range === r ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
              border: `1px solid ${range === r ? "hsl(var(--hud-cyan) / 0.2)" : "transparent"}`,
            }}>
            {r === "7d" ? "7 jours" : r === "30d" ? "30 jours" : "90 jours"}
          </button>
        ))}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1">
        {([
          { id: "overview" as AnalyticsTab, label: "Vue d'ensemble", icon: Target },
          { id: "heatmap" as AnalyticsTab, label: "Heatmap", icon: MapPin },
          { id: "trends" as AnalyticsTab, label: "Tendances", icon: TrendingUp },
          { id: "drivers" as AnalyticsTab, label: "Chauffeurs", icon: Zap },
        ]).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); haptic("selection"); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--hud-cyan) / 0.1)" : "transparent",
              color: tab === t.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      {tab === "overview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Livraisons", value: kpis.totalDel, color: "--hud-cyan", suffix: "" },
              { label: "Revenu", value: `${kpis.totalRev.toFixed(0)}€`, color: "--success", suffix: "" },
              { label: "Temps moyen", value: `${kpis.avgTime} min`, color: "--warning", suffix: "" },
              { label: "Taux succès", value: `${kpis.successRate.toFixed(1)}%`, color: "--info", suffix: "" },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-3 text-center"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <p className="text-lg font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{k.label}</p>
              </div>
            ))}
          </div>

          {/* Mini bar chart */}
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-[9px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>Livraisons / jour</p>
            <div className="flex items-end gap-[2px] h-16">
              {trends.slice(-30).map((t, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${(t.deliveries / maxDeliveries) * 100}%`,
                    background: t.cancellations > 1 ? "hsl(var(--destructive) / 0.6)" : "hsl(var(--hud-cyan) / 0.6)",
                    minHeight: "2px",
                  }}
                  title={`${t.date}: ${t.deliveries} livraisons`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Heatmap */}
      {tab === "heatmap" && (
        <div className="space-y-2">
          {zones.sort((a, b) => b.intensity - a.intensity).map((zone, i) => (
            <motion.div key={zone.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: `hsl(var(--hud-cyan) / ${zone.intensity})` }} />
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{zone.name}</p>
                </div>
                <span className="text-[9px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{zone.deliveries}</span>
              </div>
              {/* Intensity bar */}
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${zone.intensity * 100}%`, background: "hsl(var(--hud-cyan))" }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim))" }}>⏱ {zone.avgTime} min</span>
                <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim))" }}>💰 {zone.avgFee.toFixed(1)}€</span>
                <span className="text-[7px]" style={{ color: "hsl(var(--success))" }}>✅ {zone.successRate}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Trends */}
      {tab === "trends" && (
        <div className="space-y-2">
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-[9px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>Revenu quotidien (€)</p>
            <div className="flex items-end gap-[2px] h-20">
              {trends.slice(-30).map((t, i) => {
                const maxRev = Math.max(...trends.map(x => x.revenue), 1);
                return (
                  <div key={i} className="flex-1 rounded-t-sm" style={{
                    height: `${(t.revenue / maxRev) * 100}%`,
                    background: "hsl(var(--success) / 0.5)",
                    minHeight: "2px",
                  }} title={`${t.date}: ${t.revenue}€`} />
                );
              })}
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-[9px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text-dim))" }}>Temps moyen (min)</p>
            <div className="flex items-end gap-[2px] h-16">
              {trends.slice(-30).map((t, i) => {
                const maxTime = Math.max(...trends.map(x => x.avgTime), 1);
                return (
                  <div key={i} className="flex-1 rounded-t-sm" style={{
                    height: `${(t.avgTime / maxTime) * 100}%`,
                    background: t.avgTime > 35 ? "hsl(var(--destructive) / 0.5)" : "hsl(var(--warning) / 0.5)",
                    minHeight: "2px",
                  }} title={`${t.date}: ${t.avgTime} min`} />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Drivers leaderboard */}
      {tab === "drivers" && (
        <div className="space-y-2">
          {drivers.map((d, i) => (
            <motion.div key={d.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: i < 3 ? "hsl(var(--warning) / 0.15)" : "hsl(var(--hud-bg))",
                  color: i < 3 ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim))",
                }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{d.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[8px]" style={{ color: "hsl(var(--warning))" }}>⭐ {d.avgRating}</span>
                  <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>{d.deliveries} liv.</span>
                  <span className="text-[8px]" style={{ color: "hsl(var(--success))" }}>{d.successRate}%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{d.revenue}€</p>
                <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim))" }}>⏱ {d.avgTime} min</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
