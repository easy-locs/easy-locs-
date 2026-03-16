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

const DRONES: Drone[] = [
  { id: "d1", name: "Falcon-01", model: "DJI FlyCart 30", battery: 72, status: "in_flight", altitude: 85, speed: 42, payload: 2.3, maxPayload: 15, currentMission: "m1", lastFlight: new Date(), totalFlights: 245 },
  { id: "d2", name: "Eagle-02", model: "Wingcopter 198", battery: 95, status: "idle", altitude: 0, speed: 0, payload: 0, maxPayload: 5, currentMission: null, lastFlight: new Date(Date.now() - 3600000), totalFlights: 189 },
  { id: "d3", name: "Swift-03", model: "DJI FlyCart 30", battery: 18, status: "charging", altitude: 0, speed: 0, payload: 0, maxPayload: 15, currentMission: null, lastFlight: new Date(Date.now() - 7200000), totalFlights: 312 },
  { id: "d4", name: "Hawk-04", model: "Zipline P2", battery: 45, status: "maintenance", altitude: 0, speed: 0, payload: 0, maxPayload: 1.8, currentMission: null, lastFlight: new Date(Date.now() - 86400000), totalFlights: 156 },
  { id: "d5", name: "Osprey-05", model: "Wingcopter 198", battery: 88, status: "in_flight", altitude: 120, speed: 55, payload: 3.1, maxPayload: 5, currentMission: "m2", lastFlight: new Date(), totalFlights: 203 },
];

const ZONES: FlightZone[] = [
  { id: "z1", name: "Dakar Centre", type: "authorized", maxAltitude: 120, requiresPermit: false, active: true },
  { id: "z2", name: "Aéroport AIBD (15km)", type: "no_fly", maxAltitude: 0, requiresPermit: true, active: true },
  { id: "z3", name: "Plateau Commercial", type: "restricted", maxAltitude: 50, requiresPermit: true, active: true },
  { id: "z4", name: "Guédiawaye Nord", type: "authorized", maxAltitude: 150, requiresPermit: false, active: true },
  { id: "z5", name: "Zone militaire Ouakam", type: "no_fly", maxAltitude: 0, requiresPermit: true, active: true },
];

const MISSIONS: Mission[] = [
  { id: "m1", droneId: "d1", droneName: "Falcon-01", origin: "Hub Médina", destination: "Client Plateau", status: "in_flight", distance: 4.2, eta: 6, payload: "Colis pharmaceutique", weight: 2.3 },
  { id: "m2", droneId: "d5", droneName: "Osprey-05", origin: "Hub Parcelles", destination: "Client Guédiawaye", status: "in_flight", distance: 7.8, eta: 9, payload: "Documents urgents", weight: 0.8 },
  { id: "m3", droneId: "d2", droneName: "Eagle-02", origin: "Hub Médina", destination: "Client Almadies", status: "planned", distance: 5.5, eta: 0, payload: "Petit colis e-commerce", weight: 1.2 },
  { id: "m4", droneId: "d1", droneName: "Falcon-01", origin: "Hub Parcelles", destination: "Client Médina", status: "delivered", distance: 3.1, eta: 0, payload: "Médicaments", weight: 0.5 },
];

export default function DroneDelivery({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"fleet" | "zones" | "missions">("fleet");

  const inFlight = DRONES.filter(d => d.status === "in_flight").length;
  const available = DRONES.filter(d => d.status === "idle").length;
  const avgBattery = Math.round(DRONES.reduce((s, d) => s + d.battery, 0) / DRONES.length);
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

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "En vol", value: inFlight, color: "--info" },
          { label: "Disponibles", value: available, color: "--success" },
          { label: "Batterie moy.", value: `${avgBattery}%`, color: avgBattery >= 50 ? "--success" : "--warning" },
          { label: "Vols total", value: totalFlights, color: "--primary" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["fleet", "zones", "missions"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
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
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
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
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {z.maxAltitude > 0 ? `🔼 Max ${z.maxAltitude}m` : "⛔ Vol interdit"} {z.requiresPermit ? "• 📜 Permis requis" : ""}
                  </p>
                </div>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
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
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🛩️ {m.droneName} • 📦 {m.payload} ({m.weight}kg) • 📏 {m.distance}km
                    </p>
                    {m.status === "in_flight" && (
                      <p className="text-[8px] font-medium mt-0.5" style={{ color: "hsl(var(--info))" }}>
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
