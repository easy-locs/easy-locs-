/**
 * FleetMaintenanceAI — AAA2. Fleet Maintenance AI.
 * Simulated IoT sensors, intervention planning, parts costs, repair history, proactive alerts.
 * PASS103-AAA2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wrench, Cpu, AlertTriangle, CheckCircle2, Clock,
  Thermometer, Activity, TrendingDown, Calendar, DollarSign,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Vehicle {
  id: string;
  name: string;
  type: string;
  mileage: number;
  healthScore: number;
  nextService: Date;
  alerts: SensorAlert[];
  lastRepair: Date;
  totalCost: number;
}

interface SensorAlert {
  sensor: string;
  value: number;
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
}

interface RepairHistory {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: string;
  description: string;
  cost: number;
  date: Date;
  parts: string[];
  mechanic: string;
}

interface Prediction {
  vehicleId: string;
  vehicleName: string;
  component: string;
  failureProbability: number;
  estimatedDate: Date;
  estimatedCost: number;
  recommendation: string;
}

const VEHICLES: Vehicle[] = [
  { id: "v1", name: "Scooter EV-01", type: "scooter_ev", mileage: 12400, healthScore: 92, nextService: new Date(Date.now() + 604800000), lastRepair: new Date(Date.now() - 2592000000), totalCost: 145000, alerts: [{ sensor: "Batterie temp.", value: 38, threshold: 45, severity: "low" }] },
  { id: "v2", name: "Vélo Cargo E-02", type: "cargo_bike", mileage: 8900, healthScore: 78, nextService: new Date(Date.now() + 172800000), lastRepair: new Date(Date.now() - 1296000000), totalCost: 89000, alerts: [{ sensor: "Chaîne usure", value: 72, threshold: 80, severity: "medium" }, { sensor: "Freins", value: 65, threshold: 70, severity: "high" }] },
  { id: "v3", name: "Scooter EV-03", type: "scooter_ev", mileage: 15200, healthScore: 85, nextService: new Date(Date.now() + 1209600000), lastRepair: new Date(Date.now() - 4320000000), totalCost: 210000, alerts: [] },
  { id: "v4", name: "Van Élec V-01", type: "van_ev", mileage: 34500, healthScore: 61, nextService: new Date(Date.now() - 86400000), lastRepair: new Date(Date.now() - 864000000), totalCost: 520000, alerts: [{ sensor: "Moteur vibration", value: 88, threshold: 75, severity: "critical" }, { sensor: "Pneus avant", value: 30, threshold: 25, severity: "high" }] },
];

const REPAIRS: RepairHistory[] = [
  { id: "r1", vehicleId: "v4", vehicleName: "Van Élec V-01", type: "Préventif", description: "Remplacement plaquettes frein + filtres", cost: 185000, date: new Date(Date.now() - 864000000), parts: ["Plaquettes Brembo x4", "Filtre habitacle"], mechanic: "Garage EV Dakar" },
  { id: "r2", vehicleId: "v1", vehicleName: "Scooter EV-01", type: "Correctif", description: "Remplacement contrôleur moteur", cost: 95000, date: new Date(Date.now() - 2592000000), parts: ["Contrôleur 48V", "Câblage"], mechanic: "ElecMoto SN" },
  { id: "r3", vehicleId: "v2", vehicleName: "Vélo Cargo E-02", type: "Préventif", description: "Révision complète + chaîne", cost: 45000, date: new Date(Date.now() - 1296000000), parts: ["Chaîne Shimano", "Câbles frein"], mechanic: "VéloTech Plateau" },
];

const PREDICTIONS: Prediction[] = [
  { vehicleId: "v4", vehicleName: "Van Élec V-01", component: "Moteur électrique", failureProbability: 78, estimatedDate: new Date(Date.now() + 604800000), estimatedCost: 450000, recommendation: "Intervention urgente recommandée sous 7 jours" },
  { vehicleId: "v2", vehicleName: "Vélo Cargo E-02", component: "Système de freinage", failureProbability: 62, estimatedDate: new Date(Date.now() + 1209600000), estimatedCost: 35000, recommendation: "Planifier remplacement plaquettes sous 2 semaines" },
  { vehicleId: "v1", vehicleName: "Scooter EV-01", component: "Batterie cellules", failureProbability: 25, estimatedDate: new Date(Date.now() + 7776000000), estimatedCost: 280000, recommendation: "Surveillance normale — dégradation dans 3 mois" },
];

export default function FleetMaintenanceAI({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"health" | "history" | "predictions">("health");

  const avgHealth = Math.round(VEHICLES.reduce((s, v) => s + v.healthScore, 0) / VEHICLES.length);
  const criticalAlerts = VEHICLES.reduce((s, v) => s + v.alerts.filter(a => a.severity === "critical" || a.severity === "high").length, 0);
  const totalCost = VEHICLES.reduce((s, v) => s + v.totalCost, 0);
  const overdue = VEHICLES.filter(v => v.nextService < new Date()).length;
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}k`;

  const severityCfg = (s: string) => ({
    low: { color: "--success", label: "Bas" },
    medium: { color: "--warning", label: "Moyen" },
    high: { color: "--destructive", label: "Haut" },
    critical: { color: "--destructive", label: "Critique" },
  }[s] || { color: "--muted-foreground", label: s });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Wrench className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        Maintenance IA Flotte
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Santé moy.", value: `${avgHealth}%`, color: avgHealth >= 75 ? "--success" : "--warning" },
          { label: "Alertes ⚠️", value: criticalAlerts, color: criticalAlerts > 0 ? "--destructive" : "--success" },
          { label: "Coût total", value: `${fmt(totalCost)} F`, color: "--primary" },
          { label: "En retard", value: overdue, color: overdue > 0 ? "--destructive" : "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["health", "history", "predictions"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "health" ? "🔧 Véhicules" : v === "history" ? "📋 Historique" : "🤖 Prédictions"}
          </button>
        ))}
      </div>

      {view === "health" && (
        <div className="space-y-2">
          {VEHICLES.map(v => (
            <div key={v.id} className="rounded-xl p-3"
              style={{ background: v.healthScore < 70 ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${v.healthScore < 70 ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
              <div className="flex items-center gap-2">
                <div className="text-right shrink-0 w-10">
                  <p className="text-[12px] font-bold" style={{ color: v.healthScore >= 80 ? "hsl(var(--success))" : v.healthScore >= 65 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>
                    {v.healthScore}%
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{v.name}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    🛣️ {v.mileage.toLocaleString()} km • 🔧 Prochain: {v.nextService.toLocaleDateString("fr")}
                  </p>
                </div>
              </div>
              {v.alerts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {v.alerts.map((a, i) => {
                    const cfg = severityCfg(a.severity);
                    return (
                      <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg text-[8px]"
                        style={{ background: `hsl(var(${cfg.color}) / 0.05)` }}>
                        <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: `hsl(var(${cfg.color}))` }} />
                        <span style={{ color: "hsl(var(--foreground))" }}>{a.sensor}: {a.value}/{a.threshold}</span>
                        <span className="ml-auto font-bold" style={{ color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${v.healthScore}%` }}
                  className="h-full rounded-full" style={{ background: v.healthScore >= 80 ? "hsl(var(--success))" : v.healthScore >= 65 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "history" && (
        <div className="space-y-2">
          {REPAIRS.map(r => (
            <div key={r.id} className="rounded-xl p-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-start gap-2">
                <Wrench className="h-4 w-4 shrink-0 mt-0.5" style={{ color: r.type === "Correctif" ? "hsl(var(--destructive))" : "hsl(var(--info))" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{r.vehicleName}</p>
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: r.type === "Correctif" ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--info) / 0.1)", color: r.type === "Correctif" ? "hsl(var(--destructive))" : "hsl(var(--info))" }}>
                      {r.type}
                    </span>
                  </div>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{r.description}</p>
                  <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    🔩 {r.parts.join(", ")} • 🏪 {r.mechanic}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold" style={{ color: "hsl(var(--warning))" }}>{r.cost.toLocaleString()} F</p>
                  <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{r.date.toLocaleDateString("fr")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "predictions" && (
        <div className="space-y-2">
          {PREDICTIONS.map(p => (
            <div key={p.vehicleId + p.component} className="rounded-xl p-3"
              style={{ background: p.failureProbability >= 60 ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${p.failureProbability >= 60 ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Cpu className="h-3.5 w-3.5" style={{ color: p.failureProbability >= 60 ? "hsl(var(--destructive))" : "hsl(var(--warning))" }} />
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{p.vehicleName} — {p.component}</p>
                <span className="ml-auto text-[10px] font-bold" style={{ color: p.failureProbability >= 60 ? "hsl(var(--destructive))" : p.failureProbability >= 40 ? "hsl(var(--warning))" : "hsl(var(--success))" }}>
                  {p.failureProbability}%
                </span>
              </div>
              <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                📅 Estimé: {p.estimatedDate.toLocaleDateString("fr")} • 💰 ~{p.estimatedCost.toLocaleString()} F
              </p>
              <p className="text-[8px] mt-1 font-medium" style={{ color: p.failureProbability >= 60 ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}>
                💡 {p.recommendation}
              </p>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${p.failureProbability}%` }}
                  className="h-full rounded-full" style={{ background: p.failureProbability >= 60 ? "hsl(var(--destructive))" : p.failureProbability >= 40 ? "hsl(var(--warning))" : "hsl(var(--success))" }} />
              </div>
            </div>
          ))}
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("Scan prédictif relancé sur toute la flotte"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--primary))" }}>
            <RefreshCw className="h-3 w-3 mr-1" /> Relancer l'analyse IA
          </Button>
        </div>
      )}
    </div>
  );
}
