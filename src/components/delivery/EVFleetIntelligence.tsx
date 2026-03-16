/**
 * EVFleetIntelligence — UUU. EV Fleet Intelligence.
 * EV battery monitoring, charging stations, range planning, carbon tracking.
 * PASS102-UUU
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap, Battery, MapPin, Leaf, TrendingDown,
  AlertTriangle, Gauge, PlugZap, Route, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface EVVehicle {
  id: string;
  name: string;
  battery: number;
  range: number;
  status: "charging" | "in_use" | "idle" | "low_battery";
  driver: string;
  zone: string;
  co2Saved: number;
  lastCharge: Date;
}

const VEHICLES: EVVehicle[] = [
  { id: "v1", name: "Scooter EV-01", battery: 85, range: 42, status: "in_use", driver: "Ousmane B.", zone: "Dakar Centre", co2Saved: 12.4, lastCharge: new Date(Date.now() - 7200000) },
  { id: "v2", name: "Vélo Cargo E-02", battery: 62, range: 28, status: "in_use", driver: "Ibrahima S.", zone: "Plateau", co2Saved: 8.7, lastCharge: new Date(Date.now() - 14400000) },
  { id: "v3", name: "Scooter EV-03", battery: 95, range: 48, status: "charging", driver: "—", zone: "Station Médina", co2Saved: 15.2, lastCharge: new Date() },
  { id: "v4", name: "Van Élec V-01", battery: 18, range: 12, status: "low_battery", driver: "Aïcha M.", zone: "Guédiawaye", co2Saved: 22.1, lastCharge: new Date(Date.now() - 28800000) },
  { id: "v5", name: "Vélo Cargo E-04", battery: 45, range: 20, status: "idle", driver: "—", zone: "Parcelles", co2Saved: 6.3, lastCharge: new Date(Date.now() - 21600000) },
];

const STATIONS = [
  { name: "Station Dakar Centre", slots: 8, available: 3, fastCharge: true },
  { name: "Station Médina", slots: 6, available: 1, fastCharge: true },
  { name: "Station Plateau", slots: 4, available: 4, fastCharge: false },
  { name: "Station Parcelles", slots: 4, available: 2, fastCharge: false },
];

export default function EVFleetIntelligence({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"fleet" | "stations" | "carbon">("fleet");

  const avgBattery = Math.round(VEHICLES.reduce((s, v) => s + v.battery, 0) / VEHICLES.length);
  const lowBattery = VEHICLES.filter(v => v.battery < 25).length;
  const totalCO2 = VEHICLES.reduce((s, v) => s + v.co2Saved, 0).toFixed(1);
  const activeEV = VEHICLES.filter(v => v.status === "in_use").length;

  const statusCfg = (s: string) => ({
    charging: { label: "En charge", color: "--info", icon: "⚡" },
    in_use: { label: "En mission", color: "--success", icon: "🚗" },
    idle: { label: "Disponible", color: "--muted-foreground", icon: "🅿️" },
    low_battery: { label: "Batterie faible", color: "--destructive", icon: "🔋" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Zap className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
        Flotte électrique
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Batterie moy.", value: `${avgBattery}%`, color: avgBattery >= 50 ? "--success" : "--warning" },
          { label: "En mission", value: activeEV, color: "--primary" },
          { label: "Faible batt.", value: lowBattery, color: lowBattery > 0 ? "--destructive" : "--success" },
          { label: "CO₂ évité", value: `${totalCO2}kg`, color: "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["fleet", "stations", "carbon"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "fleet" ? "🔋 Véhicules" : v === "stations" ? "⚡ Stations" : "🌱 Carbone"}
          </button>
        ))}
      </div>

      {view === "fleet" && (
        <div className="space-y-2">
          {VEHICLES.map(v => {
            const cfg = statusCfg(v.status);
            return (
              <div key={v.id} className="rounded-xl p-3"
                style={{ background: v.status === "low_battery" ? "hsl(var(--destructive) / 0.03)" : "hsl(var(--muted) / 0.2)", border: `1px solid ${v.status === "low_battery" ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--border) / 0.08)"}` }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{v.name}</p>
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      👤 {v.driver} • 📍 {v.zone} • 🛣️ {v.range}km restants
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold" style={{ color: v.battery >= 50 ? "hsl(var(--success))" : v.battery >= 25 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>
                      {v.battery}%
                    </p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${v.battery}%` }}
                    className="h-full rounded-full" style={{ background: v.battery >= 50 ? "hsl(var(--success))" : v.battery >= 25 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "stations" && (
        <div className="space-y-2">
          {STATIONS.map(s => (
            <div key={s.name} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <PlugZap className="h-4 w-4" style={{ color: s.available > 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.name}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {s.available}/{s.slots} dispo {s.fastCharge ? "• ⚡ Charge rapide" : ""}
                </p>
              </div>
              <span className="text-[10px] font-bold" style={{ color: s.available > 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                {s.available > 0 ? "Libre" : "Plein"}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === "carbon" && (
        <div className="space-y-3">
          <div className="rounded-xl p-4 text-center" style={{ background: "hsl(var(--success) / 0.05)", border: "1px solid hsl(var(--success) / 0.15)" }}>
            <Leaf className="h-8 w-8 mx-auto" style={{ color: "hsl(var(--success))" }} />
            <p className="text-2xl font-bold mt-2" style={{ color: "hsl(var(--success))" }}>{totalCO2} kg</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--foreground))" }}>CO₂ évité ce mois</p>
            <p className="text-[8px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Équivalent à 3 arbres plantés 🌳</p>
          </div>
          {VEHICLES.map(v => (
            <div key={v.id} className="flex items-center gap-2">
              <span className="text-[9px] w-24 font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{v.name}</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(v.co2Saved / 25) * 100}%` }}
                  className="h-full rounded-full" style={{ background: "hsl(var(--success) / 0.6)" }} />
              </div>
              <span className="text-[9px] font-bold w-12 text-right" style={{ color: "hsl(var(--success))" }}>{v.co2Saved}kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
