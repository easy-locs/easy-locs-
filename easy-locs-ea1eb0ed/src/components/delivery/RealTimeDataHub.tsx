/**
 * RealTimeDataHub — XXX. Real-Time Data Hub.
 * Live dashboards, ML alerts, anomaly detection, predictive maintenance, data explorer.
 * PASS102-XXX
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, Brain, Database, Eye,
  TrendingUp, Zap, BarChart3, Bell, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface LiveMetric {
  name: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  change: number;
  status: "normal" | "warning" | "critical";
}

interface Anomaly {
  id: string;
  type: string;
  metric: string;
  severity: "low" | "medium" | "high";
  description: string;
  detectedAt: Date;
  resolved: boolean;
}

interface MaintenancePred {
  vehicle: string;
  component: string;
  failureProbability: number;
  estimatedDays: number;
  recommendation: string;
}

const LIVE_METRICS: LiveMetric[] = [];

const ANOMALIES: Anomaly[] = [];

const MAINTENANCE_PREDS: MaintenancePred[] = [];

export default function RealTimeDataHub({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"live" | "anomalies" | "maintenance" | "explorer">("live");
  const [anomalies, setAnomalies] = useState(ANOMALIES);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => p + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const criticalCount = LIVE_METRICS.filter(m => m.status === "critical").length;
  const warningCount = LIVE_METRICS.filter(m => m.status === "warning").length;
  const unresolvedAnomalies = anomalies.filter(a => !a.resolved).length;
  const highRiskVehicles = MAINTENANCE_PREDS.filter(m => m.failureProbability >= 60).length;

  const resolveAnomaly = (id: string) => {
    haptic("medium");
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    toast.success("✅ Anomalie marquée comme résolue");
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Activity className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
          Data Hub temps réel
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--success))" }} />
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "Critiques", value: criticalCount, color: criticalCount > 0 ? "--destructive" : "--success" },
          { label: "Alertes", value: warningCount, color: warningCount > 0 ? "--warning" : "--success" },
          { label: "Anomalies", value: unresolvedAnomalies, color: unresolvedAnomalies > 0 ? "--warning" : "--success" },
          { label: "Risque véh.", value: highRiskVehicles, color: highRiskVehicles > 0 ? "--destructive" : "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["live", "anomalies", "maintenance", "explorer"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[0.625rem] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "live" ? "📡 Live" : v === "anomalies" ? "🔍 Anomalies" : v === "maintenance" ? "🔧 Préventif" : "📊 Explorer"}
          </button>
        ))}
      </div>

      {view === "live" && (
        <div className="space-y-2">
          {LIVE_METRICS.map(m => (
            <div key={m.name} className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: m.status === "critical" ? "hsl(var(--destructive) / 0.03)" : m.status === "warning" ? "hsl(var(--warning) / 0.03)" : "hsl(var(--muted) / 0.2)",
                border: `1px solid ${m.status === "critical" ? "hsl(var(--destructive) / 0.2)" : m.status === "warning" ? "hsl(var(--warning) / 0.15)" : "hsl(var(--border) / 0.08)"}`,
              }}>
              <div className="flex-1">
                <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{m.name}</p>
                <p className="text-[0.625rem]" style={{ color: m.change >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                  {m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→"} {m.change > 0 ? "+" : ""}{m.change}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{
                  color: m.status === "critical" ? "hsl(var(--destructive))" : m.status === "warning" ? "hsl(var(--warning))" : "hsl(var(--foreground))",
                }}>
                  {m.value}{m.unit}
                </p>
              </div>
              {m.status !== "normal" && (
                <span className="w-2 h-2 rounded-full animate-pulse" style={{
                  background: m.status === "critical" ? "hsl(var(--destructive))" : "hsl(var(--warning))",
                }} />
              )}
            </div>
          ))}
        </div>
      )}

      {view === "anomalies" && (
        <div className="space-y-2">
          {anomalies.map(a => (
            <div key={a.id} className="rounded-xl p-3"
              style={{
                background: a.resolved ? "hsl(var(--muted) / 0.15)" : a.severity === "high" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)",
                border: `1px solid ${a.severity === "high" && !a.resolved ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--border) / 0.08)"}`,
                opacity: a.resolved ? 0.6 : 1,
              }}>
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 shrink-0" style={{
                  color: a.severity === "high" ? "hsl(var(--destructive))" : a.severity === "medium" ? "hsl(var(--warning))" : "hsl(var(--info))",
                }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{a.type}: {a.metric}</p>
                    <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full" style={{
                      background: a.severity === "high" ? "hsl(var(--destructive) / 0.1)" : a.severity === "medium" ? "hsl(var(--warning) / 0.1)" : "hsl(var(--info) / 0.1)",
                      color: a.severity === "high" ? "hsl(var(--destructive))" : a.severity === "medium" ? "hsl(var(--warning))" : "hsl(var(--info))",
                    }}>{a.severity}</span>
                  </div>
                  <p className="text-[0.625rem] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{a.description}</p>
                </div>
                {!a.resolved && (
                  <Button size="sm" className="text-[0.625rem] h-6 px-2 shrink-0" onClick={() => resolveAnomaly(a.id)}
                    style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                    Résoudre
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "maintenance" && (
        <div className="space-y-2">
          <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>Maintenance prédictive (ML)</p>
          {MAINTENANCE_PREDS.map(m => (
            <div key={m.vehicle + m.component} className="rounded-xl p-3"
              style={{
                background: m.failureProbability >= 60 ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)",
                border: `1px solid ${m.failureProbability >= 60 ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}`,
              }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{m.vehicle} — {m.component}</p>
                <span className="text-[0.625rem] font-bold" style={{
                  color: m.failureProbability >= 70 ? "hsl(var(--destructive))" : m.failureProbability >= 50 ? "hsl(var(--warning))" : "hsl(var(--success))",
                }}>{m.failureProbability}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${m.failureProbability}%` }}
                  className="h-full rounded-full" style={{
                    background: m.failureProbability >= 70 ? "hsl(var(--destructive))" : m.failureProbability >= 50 ? "hsl(var(--warning))" : "hsl(var(--success))",
                  }} />
              </div>
              <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                ⏳ ~{m.estimatedDays}j avant panne • 💡 {m.recommendation}
              </p>
            </div>
          ))}
        </div>
      )}

      {view === "explorer" && (
        <div className="space-y-3">
          <div className="rounded-xl p-4 text-center" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.15)" }}>
            <Database className="h-8 w-8 mx-auto" style={{ color: "hsl(var(--primary))" }} />
            <p className="text-sm font-bold mt-2" style={{ color: "hsl(var(--foreground))" }}>Data Lake Explorer</p>
            <p className="text-[0.625rem] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Explorez les données en temps réel de l'écosystème logistique
            </p>
          </div>
          {([] as { table: string; rows: string; size: string; updated: string }[]).map(t => (
            <div key={t.table} className="rounded-lg p-2 flex items-center gap-2"
              style={{ background: "hsl(var(--muted) / 0.15)" }}>
              <Database className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
              <div className="flex-1">
                <p className="text-[0.625rem] font-mono font-semibold" style={{ color: "hsl(var(--primary))" }}>{t.table}</p>
                <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.rows} rows • {t.size}</p>
              </div>
              <span className="text-[0.625rem]" style={{ color: "hsl(var(--success))" }}>{t.updated}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
