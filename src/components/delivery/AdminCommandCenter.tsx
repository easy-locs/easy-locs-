/**
 * AdminCommandCenter — EEE. Global admin dashboard.
 * Fleet overview, real-time KPIs, moderation, critical alerts, multi-zone supervision.
 * PASS98-EEE
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, Users, Truck, MapPin, Activity,
  Eye, TrendingUp, Clock, CheckCircle2, XCircle, BarChart3,
  Zap, Globe, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";

interface ZoneStatus {
  name: string;
  driversOnline: number;
  activeJobs: number;
  avgEta: number;
  alerts: number;
  coverage: number;
}

interface CriticalAlert {
  id: string;
  type: "sla_breach" | "driver_offline" | "dispute" | "system";
  severity: "critical" | "high" | "medium";
  message: string;
  zone: string;
  timestamp: Date;
  acknowledged: boolean;
}

const ZONES: ZoneStatus[] = [
  { name: "Centre", driversOnline: 8, activeJobs: 12, avgEta: 14, alerts: 1, coverage: 92 },
  { name: "Nord", driversOnline: 5, activeJobs: 7, avgEta: 18, alerts: 0, coverage: 78 },
  { name: "Sud", driversOnline: 3, activeJobs: 4, avgEta: 22, alerts: 2, coverage: 65 },
  { name: "Est", driversOnline: 4, activeJobs: 5, avgEta: 16, alerts: 0, coverage: 81 },
  { name: "Ouest", driversOnline: 2, activeJobs: 3, avgEta: 25, alerts: 1, coverage: 55 },
];

const INITIAL_ALERTS: CriticalAlert[] = [
  { id: "ca1", type: "sla_breach", severity: "critical", message: "SLA dépassé : livraison #J-4521 — 45 min de retard", zone: "Sud", timestamp: new Date(Date.now() - 120000), acknowledged: false },
  { id: "ca2", type: "driver_offline", severity: "high", message: "Livreur Aïcha M. hors ligne depuis 15 min (mission active)", zone: "Ouest", timestamp: new Date(Date.now() - 300000), acknowledged: false },
  { id: "ca3", type: "dispute", severity: "medium", message: "Nouveau litige ouvert — colis endommagé #J-4518", zone: "Centre", timestamp: new Date(Date.now() - 600000), acknowledged: true },
  { id: "ca4", type: "system", severity: "high", message: "Taux d'acceptation zone Sud < 60% — risque de couverture", zone: "Sud", timestamp: new Date(Date.now() - 900000), acknowledged: false },
];

export default function AdminCommandCenter({ orgId, className }: { orgId: string; className?: string }) {
  const [alerts, setAlerts] = useState<CriticalAlert[]>(INITIAL_ALERTS);
  const [view, setView] = useState<"overview" | "zones" | "alerts" | "moderation">("overview");
  const [liveMetrics, setLiveMetrics] = useState({
    totalDrivers: 22, online: 18, activeJobs: 31, completedToday: 87,
    avgEta: 17, slaCompliance: 94.2, revenue: 2840, disputes: 3,
  });

  // Simulate live metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        activeJobs: prev.activeJobs + Math.floor(Math.random() * 3) - 1,
        completedToday: prev.completedToday + (Math.random() > 0.6 ? 1 : 0),
        avgEta: Math.max(8, prev.avgEta + (Math.random() - 0.5) * 2),
        revenue: prev.revenue + Math.floor(Math.random() * 15),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const unacknowledged = alerts.filter(a => !a.acknowledged).length;

  const acknowledgeAlert = (id: string) => {
    haptic("light");
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const severityColor = (s: string) =>
    s === "critical" ? "hsl(var(--destructive))" : s === "high" ? "hsl(var(--warning))" : "hsl(var(--info))";

  const coverageColor = (pct: number) =>
    pct >= 80 ? "hsl(var(--success))" : pct >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Shield className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Command Center
        </h3>
        <div className="flex items-center gap-2">
          {unacknowledged > 0 && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
              🚨 {unacknowledged}
            </span>
          )}
          <motion.div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--success))" }}
            animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
          <span className="text-[8px] font-bold" style={{ color: "hsl(var(--success))" }}>LIVE</span>
        </div>
      </div>

      {/* Top KPI Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "En ligne", value: liveMetrics.online, sub: `/${liveMetrics.totalDrivers}`, color: "--success", icon: Users },
          { label: "Missions", value: liveMetrics.activeJobs, sub: "actives", color: "--primary", icon: Truck },
          { label: "Terminées", value: liveMetrics.completedToday, sub: "auj.", color: "--success", icon: CheckCircle2 },
          { label: "Revenu", value: `${liveMetrics.revenue}€`, sub: "auj.", color: "--warning", icon: TrendingUp },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <k.icon className="h-3 w-3 mx-auto mb-1" style={{ color: `hsl(var(${k.color}))` }} />
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "ETA moy.", value: `${liveMetrics.avgEta.toFixed(0)} min`, color: "--info" },
          { label: "SLA", value: `${liveMetrics.slaCompliance}%`, color: liveMetrics.slaCompliance >= 90 ? "--success" : "--warning" },
          { label: "Litiges", value: liveMetrics.disputes, color: liveMetrics.disputes > 5 ? "--destructive" : "--muted-foreground" },
        ].map(k => (
          <div key={k.label} className="rounded-lg px-2 py-1.5 text-center"
            style={{ background: "hsl(var(--muted) / 0.15)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["overview", "zones", "alerts", "moderation"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "overview" ? "📊 Vue" : v === "zones" ? "🗺️ Zones" : v === "alerts" ? `🚨 Alertes (${unacknowledged})` : "🛡️ Modération"}
          </button>
        ))}
      </div>

      {/* Overview */}
      {view === "overview" && (
        <div className="space-y-2">
          {/* Zone heatmap summary */}
          {ZONES.map(z => (
            <div key={z.name} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <MapPin className="h-4 w-4 shrink-0" style={{ color: coverageColor(z.coverage) }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Zone {z.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{z.driversOnline} livreurs</span>
                  <span className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{z.activeJobs} missions</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold" style={{ color: coverageColor(z.coverage) }}>{z.coverage}%</p>
                {z.alerts > 0 && (
                  <span className="text-[8px] font-bold" style={{ color: "hsl(var(--destructive))" }}>⚠ {z.alerts}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zones Detail */}
      {view === "zones" && (
        <div className="space-y-2">
          {ZONES.map(z => (
            <div key={z.name} className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  <Globe className="h-3 w-3 inline mr-1" style={{ color: "hsl(var(--primary))" }} />
                  Zone {z.name}
                </p>
                <span className="text-[10px] font-bold" style={{ color: coverageColor(z.coverage) }}>{z.coverage}% couvert</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${z.coverage}%` }}
                  style={{ background: coverageColor(z.coverage) }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                  <p className="text-[10px] font-bold" style={{ color: "hsl(var(--success))" }}>{z.driversOnline}</p>
                  <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>En ligne</p>
                </div>
                <div className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                  <p className="text-[10px] font-bold" style={{ color: "hsl(var(--primary))" }}>{z.activeJobs}</p>
                  <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>Missions</p>
                </div>
                <div className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                  <p className="text-[10px] font-bold" style={{ color: "hsl(var(--info))" }}>{z.avgEta}m</p>
                  <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>ETA moy.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {view === "alerts" && (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="rounded-xl p-3 flex items-start gap-3"
              style={{
                background: a.acknowledged ? "hsl(var(--muted) / 0.15)" : severityColor(a.severity) + "08",
                border: `1px solid ${a.acknowledged ? "hsl(var(--border) / 0.08)" : severityColor(a.severity) + "20"}`,
                opacity: a.acknowledged ? 0.6 : 1,
              }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: severityColor(a.severity) }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{a.message}</p>
                <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {a.zone} • {a.timestamp.toLocaleTimeString("fr-FR")}
                </p>
              </div>
              {!a.acknowledged && (
                <Button size="sm" className="text-[8px] h-6 px-2 shrink-0" onClick={() => acknowledgeAlert(a.id)}
                  style={{ background: severityColor(a.severity) + "15", color: severityColor(a.severity) }}>
                  OK
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Moderation */}
      {view === "moderation" && (
        <div className="space-y-2">
          {[
            { driver: "Mamadou K.", issue: "3 retards cette semaine", risk: "medium", action: "Avertissement" },
            { driver: "Aïcha M.", issue: "Hors ligne pendant mission", risk: "high", action: "Suspension temporaire" },
            { driver: "Omar B.", issue: "Note < 3.5 sur 10 livraisons", risk: "medium", action: "Formation recommandée" },
          ].map((m, i) => (
            <div key={i} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{m.driver}</p>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: m.risk === "high" ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--warning) / 0.1)",
                    color: m.risk === "high" ? "hsl(var(--destructive))" : "hsl(var(--warning))",
                  }}>
                  {m.risk.toUpperCase()}
                </span>
              </div>
              <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{m.issue}</p>
              <Button size="sm" className="mt-2 text-[9px] h-6 w-full" onClick={() => { haptic("medium"); }}
                style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}>
                {m.action}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
