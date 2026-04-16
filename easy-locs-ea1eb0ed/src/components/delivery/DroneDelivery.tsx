/**
 * DroneDelivery — CCC2. Drone Delivery.
 * Authorized flight zones, drone battery management, real-time aerial tracking, civil aviation compliance.
 * PASS104-CCC2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plane, Battery, MapPin, Shield, AlertTriangle,
  Eye, Wind, Thermometer, Clock, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Drone {
  id: string;
  name: string;
  model: string;
  battery: number;
  status: "in_flight" | "charging" | "idle" | "maintenance" | "grounded";
  altitude: number;
  speed: number;
  payload: number;
  maxPayload: number;
  currentMission: string | null;
  lastFlight: Date;
  totalFlights: number;
}

interface FlightZone {
  id: string;
  name: string;
  type: "authorized" | "restricted" | "no_fly";
  maxAltitude: number;
  requiresPermit: boolean;
  active: boolean;
}

interface Mission {
  id: string;
  droneId: string;
  droneName: string;
  origin: string;
  destination: string;
  status: "planned" | "in_flight" | "delivered" | "aborted";
  distance: number;
  eta: number;
  payload: string;
  weight: number;
}

const DRONES: Drone[] = [];

const ZONES: FlightZone[] = [];

const MISSIONS: Mission[] = [];

export default function DroneDelivery({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"fleet" | "zones" | "missions">("fleet");

  const inFlight = DRONES.filter(d => d.status === "in_flight").length;
  const available = DRONES.filter(d => d.status === "idle").length;
  const avgBattery = DRONES.length ? Math.round(DRONES.reduce((s, d) => s + d.battery, 0) / DRONES.length) : 0;
  const totalFlights = DRONES.reduce((s, d) => s + d.totalFlights, 0);

  const statusCfg = (s: string) => ({
    in_flight: { label: "En vol", color: "--info", icon: "🛩️" },
    charging: { label: "En charge", color: "--warning", icon: "🔋" },
    idle: { label: "Disponible", color: "--success", icon: "🟢" },
    maintenance: { label: "Maintenance", color: "--destructive", icon: "🔧" },
    grounded: { label: "Au sol", color: "--muted-foreground", icon: "⛔" },
    planned: { label: "Planifié", color: "--primary", icon: "📋" },
    delivered: { label: "Livré", color: "--success", icon: "✅" },
    aborted: { label: "Avorté", color: "--destructive", icon: "❌" },
    authorized: { label: "Autorisé", color: "--success" },
    restricted: { label: "Restreint", color: "--warning" },
    no_fly: { label: "Interdit", color: "--destructive" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Plane className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
        Livraison par drone
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "En vol", value: inFlight, color: "--info" },
          { label: "Disponibles", value: available, color: "--success" },
          { label: "Batterie moy.", value: `${avgBattery}%`, color: avgBattery >= 50 ? "--success" : "--warning" },
          { label: "Vols total", value: totalFlights, color: "--primary" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["fleet", "zones", "missions"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "fleet" ? "🛩️ Flotte" : v === "zones" ? "🗺️ Zones" : "📦 Missions"}
          </button>
        ))}
      </div>

      {view === "fleet" && (
        <div className="space-y-2">
          {DRONES.map(d => {
            const cfg = statusCfg(d.status);
            return (
              <div key={d.id} className="rounded-xl p-3"
                style={{ background: d.status === "maintenance" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${d.status === "maintenance" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{d.name}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📡 {d.model} • {d.status === "in_flight" ? `🔼 ${d.altitude}m • 💨 ${d.speed}km/h` : `✈️ ${d.totalFlights} vols`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold" style={{ color: d.battery >= 50 ? "hsl(var(--success))" : d.battery >= 25 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>
                      {d.battery}%
                    </p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${d.battery}%` }}
                    className="h-full rounded-full" style={{ background: d.battery >= 50 ? "hsl(var(--success))" : d.battery >= 25 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "zones" && (
        <div className="space-y-2">
          {ZONES.map(z => {
            const cfg = statusCfg(z.type);
            return (
              <div key={z.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: z.type === "no_fly" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${z.type === "no_fly" ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--border) / 0.08)"}` }}>
                <MapPin className="h-4 w-4 shrink-0" style={{ color: `hsl(var(${cfg.color}))` }} />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{z.name}</p>
                  <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {z.maxAltitude > 0 ? `🔼 Max ${z.maxAltitude}m` : "⛔ Vol interdit"} {z.requiresPermit ? "• 📜 Permis requis" : ""}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {view === "missions" && (
        <div className="space-y-2">
          {MISSIONS.map(m => {
            const cfg = statusCfg(m.status);
            return (
              <div key={m.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                        {m.origin} → {m.destination}
                      </p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🛩️ {m.droneName} • 📦 {m.payload} ({m.weight}kg) • 📏 {m.distance}km
                    </p>
                    {m.status === "in_flight" && (
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: "hsl(var(--info))" }}>
                        ⏱️ ETA: {m.eta} min
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("Nouvelle mission drone planifiée"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--info))" }}>
            <Plane className="h-3 w-3 mr-1" /> Planifier un vol
          </Button>
        </div>
      )}
    </div>
  );
}
