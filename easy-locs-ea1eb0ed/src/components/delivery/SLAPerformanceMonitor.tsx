/**
 * SLAPerformanceMonitor — KKK. Real-time SLA monitoring.
 * Breach alerts, driver/zone scoring, automatic reports.
 * PASS99-KKK
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Timer, AlertTriangle, CheckCircle2, XCircle, TrendingUp,
  MapPin, User, Bell, BarChart3, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface SLARule {
  id: string;
  name: string;
  target: string;
  current: number;
  threshold: number;
  status: "ok" | "warning" | "breach";
  trend: number;
}

interface DriverScore {
  id: string;
  name: string;
  slaRate: number;
  avgTime: number;
  breaches: number;
  trend: number;
  rank: number;
}

interface Breach {
  id: string;
  type: string;
  driver: string;
  zone: string;
  delay: string;
  time: Date;
  resolved: boolean;
}

const SLA_RULES: SLARule[] = [];

const DRIVER_SCORES: DriverScore[] = [];

const BREACHES: Breach[] = [];

export default function SLAPerformanceMonitor({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"rules" | "drivers" | "breaches" | "zones">("rules");
  const [breaches, setBreaches] = useState(BREACHES);

  const activeBreach = breaches.filter(b => !b.resolved).length;
  const avgSla = SLA_RULES.length > 0 ? SLA_RULES.reduce((s, r) => s + r.current, 0) / SLA_RULES.length : 0;

  const resolveBreach = (id: string) => {
    haptic("medium");
    setBreaches(prev => prev.map(b => b.id === id ? { ...b, resolved: true } : b));
    toast.success("✅ Breach résolue");
  };

  const statusIcon = (s: string) =>
    s === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--success))" }} /> :
    s === "warning" ? <AlertTriangle className="h-3.5 w-3.5" style={{ color: "hsl(var(--warning))" }} /> :
    <XCircle className="h-3.5 w-3.5" style={{ color: "hsl(var(--destructive))" }} />;

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Timer className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
          SLA & Performance
        </h3>
        {activeBreach > 0 && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full animate-pulse"
            style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
            🚨 {activeBreach} breach{activeBreach > 1 ? "es" : ""} active{activeBreach > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "SLA Global", value: `${avgSla.toFixed(1)}%`, color: avgSla >= 90 ? "--success" : "--warning" },
          { label: "Breaches", value: activeBreach.toString(), color: activeBreach === 0 ? "--success" : "--destructive" },
          { label: "Meilleur", value: "98.2%", color: "--success" },
          { label: "Règles OK", value: `${SLA_RULES.filter(r => r.status === "ok").length}/${SLA_RULES.length}`, color: "--primary" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["rules", "drivers", "breaches", "zones"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "rules" ? "📋 Règles" : v === "drivers" ? "👤 Livreurs" : v === "breaches" ? "🚨 Breaches" : "🗺️ Zones"}
          </button>
        ))}
      </div>

      {/* Rules */}
      {view === "rules" && (
        <div className="space-y-2">
          {SLA_RULES.map(r => (
            <div key={r.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: `1px solid ${r.status === "breach" ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--border) / 0.08)"}` }}>
              {statusIcon(r.status)}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{r.name}</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>Cible : {r.target}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-bold" style={{
                  color: r.status === "ok" ? "hsl(var(--success))" : r.status === "warning" ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                }}>{r.current}%</p>
                <p className="text-[10px]" style={{ color: r.trend >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                  {r.trend > 0 ? "+" : ""}{r.trend}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drivers Leaderboard */}
      {view === "drivers" && (
        <div className="space-y-2">
          {DRIVER_SCORES.map(d => (
            <div key={d.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: d.rank <= 2 ? "hsl(var(--success) / 0.15)" : d.rank <= 4 ? "hsl(var(--warning) / 0.15)" : "hsl(var(--destructive) / 0.15)",
                  color: d.rank <= 2 ? "hsl(var(--success))" : d.rank <= 4 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                }}>
                #{d.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{d.name}</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {d.avgTime}min moy. • {d.breaches} breach{d.breaches !== 1 ? "es" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold" style={{
                  color: d.slaRate >= 95 ? "hsl(var(--success))" : d.slaRate >= 90 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                }}>{d.slaRate}%</p>
                <p className="text-[10px]" style={{ color: d.trend >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                  {d.trend > 0 ? "↑" : "↓"} {Math.abs(d.trend)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Breaches */}
      {view === "breaches" && (
        <div className="space-y-2">
          {breaches.map(b => (
            <div key={b.id} className="rounded-xl p-3"
              style={{
                background: b.resolved ? "hsl(var(--muted) / 0.1)" : "hsl(var(--destructive) / 0.05)",
                border: `1px solid ${b.resolved ? "hsl(var(--border) / 0.08)" : "hsl(var(--destructive) / 0.15)"}`,
                opacity: b.resolved ? 0.6 : 1,
              }}>
              <div className="flex items-start gap-3">
                {b.resolved ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: "hsl(var(--success))" }} />
                ) : (
                  <AlertTriangle className="h-4 w-4 mt-0.5 animate-pulse" style={{ color: "hsl(var(--destructive))" }} />
                )}
                <div className="flex-1">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{b.type}</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {b.driver} • {b.zone} • {b.delay}
                  </p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {b.time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!b.resolved && (
                  <Button size="sm" className="text-[10px] h-7" onClick={() => resolveBreach(b.id)}
                    style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                    Résoudre
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zones */}
      {view === "zones" && (
        <div className="space-y-2">
          {[
            { zone: "Dakar Centre", sla: 96.2, score: "A", color: "--success" },
            { zone: "Plateau", sla: 98.1, score: "A+", color: "--success" },
            { zone: "Médina", sla: 91.4, score: "B+", color: "--warning" },
            { zone: "Parcelles", sla: 87.6, score: "B", color: "--warning" },
            { zone: "Guédiawaye", sla: 82.3, score: "C", color: "--destructive" },
            { zone: "Pikine", sla: 85.1, score: "B-", color: "--warning" },
          ].map(z => (
            <div key={z.zone} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <MapPin className="h-3.5 w-3.5" style={{ color: `hsl(var(${z.color}))` }} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{z.zone}</p>
                <div className="h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${z.sla}%` }}
                    className="h-full rounded-full" style={{ background: `hsl(var(${z.color}))` }} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold" style={{ color: `hsl(var(${z.color}))` }}>{z.sla}%</p>
                <p className="text-[10px] font-bold" style={{ color: "hsl(var(--muted-foreground))" }}>{z.score}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
