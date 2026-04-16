/**
 * AdminCommandCenter — EEE. Global admin dashboard.
 * Fleet overview, real-time KPIs, moderation, critical alerts, multi-zone supervision.
 * PASS98-EEE
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, Users, Truck, MapPin, Activity,
  Eye, TrendingUp, Clock, CheckCircle2, XCircle, BarChart3,
  Zap, Globe, Bell, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import {
  useMobilityJobsDashboard, useRiderPresenceByIds,
  type MobilityJobRow, type RiderPresenceRow,
} from "@/hooks/useDeliveryData";

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

export default function AdminCommandCenter({ orgId, className }: { orgId: string; className?: string }) {
  const { data: jobs = [], isLoading: loadingJobs } = useMobilityJobsDashboard(orgId);

  const riderIds = useMemo(() => {
    const ids = new Set<string>();
    jobs.forEach((j: MobilityJobRow) => { if (j.rider_user_id) ids.add(j.rider_user_id); });
    return Array.from(ids);
  }, [jobs]);

  const { data: riders = [], isLoading: loadingRiders } = useRiderPresenceByIds(riderIds);

  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [view, setView] = useState<"overview" | "zones" | "alerts" | "moderation">("overview");

  const liveMetrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const online = riders.filter((r: RiderPresenceRow) => r.is_online).length;
    const totalDrivers = riders.length;
    const activeJobs = jobs.filter((j: MobilityJobRow) => ["accepted", "in_progress", "picked_up"].includes(j.status)).length;
    const completedToday = jobs.filter((j: MobilityJobRow) => j.status === "completed" && j.completed_at?.startsWith(today)).length;
    const completedJobs = jobs.filter((j: MobilityJobRow) => j.status === "completed" && j.accepted_at && j.completed_at);
    const etaMinutes = completedJobs.map((j: MobilityJobRow) =>
      (new Date(j.completed_at!).getTime() - new Date(j.accepted_at!).getTime()) / 60000
    );
    const avgEta = etaMinutes.length ? Math.round(etaMinutes.reduce((a, b) => a + b, 0) / etaMinutes.length) : 0;
    const total = jobs.length;
    const completed = jobs.filter((j: MobilityJobRow) => j.status === "completed").length;
    const cancelled = jobs.filter((j: MobilityJobRow) => j.status === "cancelled").length;
    const slaCompliance = total > 0 ? Math.round((completed / Math.max(completed + cancelled, 1)) * 100) : 0;
    const revenue = completedJobs.reduce((s, j: MobilityJobRow) => s + (j.current_price || j.quoted_price || 0), 0);
    const disputes = jobs.filter((j: MobilityJobRow) => j.status === "disputed").length;
    return { totalDrivers, online, activeJobs, completedToday, avgEta, slaCompliance, revenue, disputes };
  }, [jobs, riders]);

  const zones = useMemo<ZoneStatus[]>(() => {
    const zoneMap = new Map<string, { jobs: MobilityJobRow[]; drivers: Set<string> }>();
    jobs.forEach((j: MobilityJobRow) => {
      const zone = j.pickup_address?.split(",").pop()?.trim() || "Inconnu";
      if (!zoneMap.has(zone)) zoneMap.set(zone, { jobs: [], drivers: new Set() });
      const z = zoneMap.get(zone)!;
      z.jobs.push(j);
      if (j.rider_user_id) z.drivers.add(j.rider_user_id);
    });
    return Array.from(zoneMap.entries()).slice(0, 8).map(([name, z]) => {
      const activeJobs = z.jobs.filter((j: MobilityJobRow) => ["accepted", "in_progress", "picked_up"].includes(j.status)).length;
      const driversOnline = z.drivers.size;
      const coverage = driversOnline > 0 ? Math.min(100, Math.round((driversOnline / Math.max(activeJobs, 1)) * 100)) : 0;
      return { name, driversOnline, activeJobs, avgEta: liveMetrics.avgEta, alerts: 0, coverage };
    });
  }, [jobs, liveMetrics.avgEta]);

  useEffect(() => {
    const generated: CriticalAlert[] = [];
    if (liveMetrics.slaCompliance < 80 && liveMetrics.slaCompliance > 0) {
      generated.push({
        id: "sla-1", type: "sla_breach", severity: "high",
        message: `SLA compliance at ${liveMetrics.slaCompliance}% — below 80% threshold`,
        zone: "Global", timestamp: new Date(), acknowledged: false,
      });
    }
    if (liveMetrics.disputes > 0) {
      generated.push({
        id: "dispute-1", type: "dispute", severity: "medium",
        message: `${liveMetrics.disputes} litige(s) en cours nécessitant attention`,
        zone: "Global", timestamp: new Date(), acknowledged: false,
      });
    }
    setAlerts(generated);
  }, [liveMetrics.slaCompliance, liveMetrics.disputes]);

  const unacknowledged = alerts.filter(a => !a.acknowledged).length;

  const acknowledgeAlert = (id: string) => {
    haptic("light");
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const severityColor = (s: string) =>
    s === "critical" ? "hsl(var(--destructive))" : s === "high" ? "hsl(var(--warning))" : "hsl(var(--info))";

  const coverageColor = (pct: number) =>
    pct >= 80 ? "hsl(var(--success))" : pct >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  if (loadingJobs || loadingRiders) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ""}`}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--primary))" }} />
        <span className="ml-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Chargement du centre de commande…</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Shield className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Command Center
        </h3>
        <div className="flex items-center gap-2">
          {unacknowledged > 0 && (
            <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full animate-pulse"
              style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
              {unacknowledged} alertes
            </span>
          )}
          <motion.div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--success))" }}
            animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }} />
          <span className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--success))" }}>LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "En ligne", value: liveMetrics.online, sub: `/${liveMetrics.totalDrivers}`, color: "--success", icon: Users },
          { label: "Missions", value: liveMetrics.activeJobs, sub: "actives", color: "--primary", icon: Truck },
          { label: "Terminées", value: liveMetrics.completedToday, sub: "auj.", color: "--success", icon: CheckCircle2 },
          { label: "Revenu", value: `${liveMetrics.revenue} F`, sub: "auj.", color: "--warning", icon: TrendingUp },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <k.icon className="h-3 w-3 mx-auto mb-1" style={{ color: `hsl(var(${k.color}))` }} />
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "ETA moy.", value: `${liveMetrics.avgEta} min`, color: "--info" },
          { label: "SLA", value: `${liveMetrics.slaCompliance}%`, color: liveMetrics.slaCompliance >= 90 ? "--success" : "--warning" },
          { label: "Litiges", value: liveMetrics.disputes, color: liveMetrics.disputes > 5 ? "--destructive" : "--muted-foreground" },
        ].map(k => (
          <div key={k.label} className="rounded-lg px-2 py-1.5 text-center"
            style={{ background: "hsl(var(--muted) / 0.15)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["overview", "zones", "alerts", "moderation"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[0.625rem] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "overview" ? "Vue" : v === "zones" ? "Zones" : v === "alerts" ? `Alertes (${unacknowledged})` : "Modération"}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <div className="space-y-2">
          {zones.length === 0 && (
            <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune zone active pour le moment</p>
          )}
          {zones.map(z => (
            <div key={z.name} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <MapPin className="h-4 w-4 shrink-0" style={{ color: coverageColor(z.coverage) }} />
              <div className="flex-1 min-w-0">
                <p className="text-[0.6875rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Zone {z.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{z.driversOnline} livreurs</span>
                  <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{z.activeJobs} missions</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[0.625rem] font-bold" style={{ color: coverageColor(z.coverage) }}>{z.coverage}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "zones" && (
        <div className="space-y-2">
          {zones.length === 0 && (
            <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune zone détectée</p>
          )}
          {zones.map(z => (
            <div key={z.name} className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between">
                <p className="text-[0.6875rem] font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  <Globe className="h-3 w-3 inline mr-1" style={{ color: "hsl(var(--primary))" }} />
                  Zone {z.name}
                </p>
                <span className="text-[0.625rem] font-bold" style={{ color: coverageColor(z.coverage) }}>{z.coverage}% couvert</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${z.coverage}%` }}
                  style={{ background: coverageColor(z.coverage) }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                  <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--success))" }}>{z.driversOnline}</p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>En ligne</p>
                </div>
                <div className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                  <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--primary))" }}>{z.activeJobs}</p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>Missions</p>
                </div>
                <div className="text-center py-1 rounded-lg" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                  <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--info))" }}>{z.avgEta}m</p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>ETA moy.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "alerts" && (
        <div className="space-y-2">
          {alerts.length === 0 && (
            <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune alerte active — tout est nominal</p>
          )}
          {alerts.map(a => (
            <div key={a.id} className="rounded-xl p-3 flex items-start gap-3"
              style={{
                background: a.acknowledged ? "hsl(var(--muted) / 0.15)" : severityColor(a.severity) + "08",
                border: `1px solid ${a.acknowledged ? "hsl(var(--border) / 0.08)" : severityColor(a.severity) + "20"}`,
                opacity: a.acknowledged ? 0.6 : 1,
              }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: severityColor(a.severity) }} />
              <div className="flex-1 min-w-0">
                <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{a.message}</p>
                <p className="text-[0.625rem] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {a.zone} — {a.timestamp.toLocaleTimeString("fr-FR")}
                </p>
              </div>
              {!a.acknowledged && (
                <Button size="sm" className="text-[0.625rem] h-6 px-2 shrink-0" onClick={() => acknowledgeAlert(a.id)}
                  style={{ background: severityColor(a.severity) + "15", color: severityColor(a.severity) }}>
                  OK
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {view === "moderation" && (
        <div className="space-y-2">
          <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucun cas de modération en attente</p>
        </div>
      )}
    </div>
  );
}
