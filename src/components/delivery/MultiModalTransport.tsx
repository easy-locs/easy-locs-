/**
 * MultiModalTransport — III2. Multi-Modal Transport Orchestration.
 * Rail+road+air+maritime, cost/time optimization, seamless intermodality.
 * PASS105-III2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Train, Truck, Plane, Ship, ArrowRight,
  Clock, DollarSign, BarChart3, Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface TransportLeg {
  id: string;
  mode: "rail" | "road" | "air" | "sea";
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  cost: number;
  currency: string;
  co2: number;
  status: "planned" | "in_transit" | "completed" | "delayed";
  carrier: string;
}

interface MultiModalRoute {
  id: string;
  name: string;
  legs: TransportLeg[];
  totalCost: number;
  totalDuration: number;
  totalCO2: number;
  optimizedFor: "cost" | "time" | "eco";
}

const ROUTES: MultiModalRoute[] = [
  {
    id: "mr1", name: "Dakar → Paris (Express)", optimizedFor: "time",
    totalCost: 285000, totalDuration: 420, totalCO2: 245,
    legs: [
      { id: "tl1", mode: "road", origin: "Entrepôt Dakar", destination: "Port Dakar", distance: 12, duration: 30, cost: 5000, currency: "XOF", co2: 3.2, status: "completed", carrier: "TransDakar" },
      { id: "tl2", mode: "air", origin: "AIBD Dakar", destination: "CDG Paris", distance: 4200, duration: 330, cost: 250000, currency: "XOF", co2: 235, status: "in_transit", carrier: "Air Sénégal" },
      { id: "tl3", mode: "road", origin: "CDG Paris", destination: "Client Paris 11e", distance: 28, duration: 60, cost: 30000, currency: "XOF", co2: 6.8, status: "planned", carrier: "Chrono-Express" },
    ],
  },
  {
    id: "mr2", name: "Dakar → Abidjan (Éco)", optimizedFor: "eco",
    totalCost: 95000, totalDuration: 2880, totalCO2: 42,
    legs: [
      { id: "tl4", mode: "road", origin: "Entrepôt Dakar", destination: "Port Dakar", distance: 12, duration: 30, cost: 5000, currency: "XOF", co2: 3.2, status: "completed", carrier: "TransDakar" },
      { id: "tl5", mode: "sea", origin: "Port Dakar", destination: "Port Abidjan", distance: 2800, duration: 2760, cost: 75000, currency: "XOF", co2: 28, status: "in_transit", carrier: "Maersk West Africa" },
      { id: "tl6", mode: "road", origin: "Port Abidjan", destination: "Client Cocody", distance: 15, duration: 90, cost: 15000, currency: "XOF", co2: 10.8, status: "planned", carrier: "Abidjan Express" },
    ],
  },
  {
    id: "mr3", name: "Dakar → Bamako (Rail)", optimizedFor: "cost",
    totalCost: 45000, totalDuration: 720, totalCO2: 18,
    legs: [
      { id: "tl7", mode: "road", origin: "Entrepôt Dakar", destination: "Gare Dakar", distance: 8, duration: 25, cost: 3000, currency: "XOF", co2: 2.1, status: "completed", carrier: "TransDakar" },
      { id: "tl8", mode: "rail", origin: "Gare Dakar", destination: "Gare Bamako", distance: 1240, duration: 660, cost: 35000, currency: "XOF", co2: 12, status: "in_transit", carrier: "Transrail" },
      { id: "tl9", mode: "road", origin: "Gare Bamako", destination: "Client ACI 2000", distance: 10, duration: 35, cost: 7000, currency: "XOF", co2: 3.9, status: "planned", carrier: "BamakoLogistics" },
    ],
  },
];

const MODE_CFG = {
  rail: { icon: Train, label: "🚆 Rail", color: "--info" },
  road: { icon: Truck, label: "🚛 Route", color: "--warning" },
  air: { icon: Plane, label: "✈️ Aérien", color: "--primary" },
  sea: { icon: Ship, label: "🚢 Maritime", color: "--success" },
};

export default function MultiModalTransport({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"routes" | "compare" | "tracking">("routes");
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
  const fmtDuration = (min: number) => min >= 1440 ? `${(min / 1440).toFixed(0)}j ${Math.round((min % 1440) / 60)}h` : min >= 60 ? `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}m` : ""}` : `${min}m`;

  const statusCfg = (s: string) => ({
    planned: { label: "Planifié", color: "--muted-foreground" },
    in_transit: { label: "En transit", color: "--warning" },
    completed: { label: "Terminé", color: "--success" },
    delayed: { label: "Retardé", color: "--destructive" },
  }[s] || { label: s, color: "--muted-foreground" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Route className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Transport multimodal
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Routes actives", value: ROUTES.length, color: "--primary" },
          { label: "Segments", value: ROUTES.reduce((s, r) => s + r.legs.length, 0), color: "--info" },
          { label: "En transit", value: ROUTES.flatMap(r => r.legs).filter(l => l.status === "in_transit").length, color: "--warning" },
          { label: "Modes", value: 4, color: "--success" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["routes", "compare", "tracking"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "routes" ? "🗺️ Routes" : v === "compare" ? "⚖️ Comparer" : "📍 Tracking"}
          </button>
        ))}
      </div>

      {view === "routes" && (
        <div className="space-y-2">
          {ROUTES.map(r => (
            <div key={r.id} className="rounded-xl p-3 space-y-2"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{r.name}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    💰 {fmt(r.totalCost)} F • ⏱️ {fmtDuration(r.totalDuration)} • 🌱 {r.totalCO2}kg CO₂
                  </p>
                </div>
                <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: r.optimizedFor === "cost" ? "hsl(var(--success) / 0.1)" : r.optimizedFor === "time" ? "hsl(var(--warning) / 0.1)" : "hsl(var(--info) / 0.1)",
                    color: r.optimizedFor === "cost" ? "hsl(var(--success))" : r.optimizedFor === "time" ? "hsl(var(--warning))" : "hsl(var(--info))",
                  }}>
                  {r.optimizedFor === "cost" ? "💰 Coût" : r.optimizedFor === "time" ? "⚡ Rapide" : "🌱 Éco"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {r.legs.map((leg, i) => {
                  const mode = MODE_CFG[leg.mode];
                  const st = statusCfg(leg.status);
                  return (
                    <div key={leg.id} className="flex items-center gap-1">
                      <div className="text-center px-1.5 py-1 rounded-lg" style={{ background: `hsl(var(${mode.color}) / 0.08)` }}>
                        <p className="text-[8px]">{mode.label}</p>
                        <p className="text-[6px]" style={{ color: `hsl(var(${st.color}))` }}>{st.label}</p>
                      </div>
                      {i < r.legs.length - 1 && <ArrowRight className="h-2.5 w-2.5" style={{ color: "hsl(var(--muted-foreground))" }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "compare" && (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border) / 0.08)" }}>
            <div className="grid grid-cols-4 gap-0 text-[8px] font-bold p-2" style={{ background: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}>
              <span>Route</span><span>Coût</span><span>Durée</span><span>CO₂</span>
            </div>
            {ROUTES.map(r => (
              <div key={r.id} className="grid grid-cols-4 gap-0 text-[9px] p-2" style={{ borderTop: "1px solid hsl(var(--border) / 0.05)" }}>
                <span className="font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{r.name.split("(")[0]}</span>
                <span style={{ color: "hsl(var(--success))" }}>{fmt(r.totalCost)} F</span>
                <span style={{ color: "hsl(var(--warning))" }}>{fmtDuration(r.totalDuration)}</span>
                <span style={{ color: "hsl(var(--info))" }}>{r.totalCO2}kg</span>
              </div>
            ))}
          </div>
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("Optimisation multimodale lancée"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--primary))" }}>
            <Route className="h-3 w-3 mr-1" /> Optimiser nouvelle route
          </Button>
        </div>
      )}

      {view === "tracking" && (
        <div className="space-y-2">
          {ROUTES.flatMap(r => r.legs).filter(l => l.status === "in_transit").map(leg => {
            const mode = MODE_CFG[leg.mode];
            return (
              <div key={leg.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{mode.label.split(" ")[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      {leg.origin} → {leg.destination}
                    </p>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      🚛 {leg.carrier} • 📏 {leg.distance}km • ⏱️ {fmtDuration(leg.duration)}
                    </p>
                    <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                      <motion.div className="h-full rounded-full" initial={{ width: "30%" }} animate={{ width: "65%" }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        style={{ background: `hsl(var(${mode.color}))` }} />
                    </div>
                  </div>
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "hsl(var(--warning) / 0.1)", color: "hsl(var(--warning))" }}>En transit</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
