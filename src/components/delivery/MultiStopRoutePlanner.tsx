/**
 * MultiStopRoutePlanner — CCC. Multi-Stop Route Optimization
 * Intelligent multi-point route planning with drag reorder, distance/time estimates.
 * PASS91-CCC
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { MapPin, Plus, Trash2, GripVertical, Navigation, Clock, Truck, Zap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RouteStop {
  id: string;
  address: string;
  type: "pickup" | "dropoff";
  estimatedMinutes?: number;
  distanceKm?: number;
  lat?: number;
  lng?: number;
}

interface RouteStats {
  totalDistance: number;
  totalTime: number;
  fuelEstimate: number;
  co2Saved: number;
}

export default function MultiStopRoutePlanner({ orgId }: { orgId: string }) {
  const [stops, setStops] = useState<RouteStop[]>([
    { id: "s1", address: "12 Rue de Rivoli, Paris", type: "pickup", estimatedMinutes: 0, distanceKm: 0 },
    { id: "s2", address: "45 Av. des Champs-Élysées, Paris", type: "dropoff", estimatedMinutes: 12, distanceKm: 3.2 },
    { id: "s3", address: "8 Place de la Bastille, Paris", type: "dropoff", estimatedMinutes: 18, distanceKm: 5.1 },
  ]);
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState<"pickup" | "dropoff">("dropoff");
  const [optimized, setOptimized] = useState(false);

  const stats = useMemo<RouteStats>(() => {
    const totalDistance = stops.reduce((s, st) => s + (st.distanceKm || 0), 0);
    const totalTime = stops.reduce((s, st) => s + (st.estimatedMinutes || 0), 0);
    return {
      totalDistance,
      totalTime,
      fuelEstimate: totalDistance * 0.08 * 1.85,
      co2Saved: totalDistance * 0.12,
    };
  }, [stops]);

  const addStop = () => {
    if (!newAddress.trim()) return;
    const dist = +(Math.random() * 8 + 1).toFixed(1);
    const time = Math.round(dist * 3.5 + Math.random() * 5);
    setStops(prev => [...prev, {
      id: `s${Date.now()}`, address: newAddress, type: newType,
      estimatedMinutes: time, distanceKm: dist,
    }]);
    setNewAddress("");
    setOptimized(false);
  };

  const removeStop = (id: string) => {
    setStops(prev => prev.filter(s => s.id !== id));
    setOptimized(false);
  };

  const optimizeRoute = () => {
    // Simulate TSP optimization by sorting dropoffs by distance
    const pickups = stops.filter(s => s.type === "pickup");
    const dropoffs = stops.filter(s => s.type === "dropoff")
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    
    let cumDist = 0;
    const optimizedDropoffs = dropoffs.map((d, i) => {
      cumDist += +(Math.random() * 3 + 1).toFixed(1);
      return { ...d, distanceKm: +cumDist.toFixed(1), estimatedMinutes: Math.round(cumDist * 3) };
    });

    setStops([...pickups, ...optimizedDropoffs]);
    setOptimized(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Navigation className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Multi-Stop Planner</h3>
        {optimized && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{
            background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))",
          }}>✅ Optimisé</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Distance", value: `${stats.totalDistance.toFixed(1)} km`, color: "--hud-cyan" },
          { label: "Durée", value: `${stats.totalTime} min`, color: "--warning" },
          { label: "Carburant", value: `${stats.fuelEstimate.toFixed(1)} €`, color: "--info" },
          { label: "CO₂ évité", value: `${stats.co2Saved.toFixed(0)} g`, color: "--success" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Stops list */}
      <Reorder.Group axis="y" values={stops} onReorder={(newOrder) => { setStops(newOrder); setOptimized(false); }}
        className="space-y-1.5">
        {stops.map((stop, idx) => (
          <Reorder.Item key={stop.id} value={stop}>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing"
              style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${stop.type === "pickup" ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-cyan) / 0.12)"}` }}>
              <GripVertical className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                style={{
                  background: stop.type === "pickup" ? "hsl(var(--success) / 0.12)" : "hsl(var(--hud-cyan) / 0.12)",
                  color: stop.type === "pickup" ? "hsl(var(--success))" : "hsl(var(--hud-cyan))",
                }}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{stop.address}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] px-1 py-0.5 rounded" style={{
                    background: stop.type === "pickup" ? "hsl(var(--success) / 0.08)" : "hsl(var(--info) / 0.08)",
                    color: stop.type === "pickup" ? "hsl(var(--success))" : "hsl(var(--info))",
                  }}>{stop.type === "pickup" ? "Retrait" : "Livraison"}</span>
                  {stop.distanceKm != null && stop.distanceKm > 0 && (
                    <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      {stop.distanceKm} km • {stop.estimatedMinutes} min
                    </span>
                  )}
                </div>
              </div>
              {stops.length > 2 && (
                <button onClick={() => removeStop(stop.id)} className="p-1 rounded-md hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3" style={{ color: "hsl(var(--destructive) / 0.5)" }} />
                </button>
              )}
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Add stop */}
      <div className="flex gap-1.5">
        <select value={newType} onChange={e => setNewType(e.target.value as "pickup" | "dropoff")}
          className="h-8 text-[10px] rounded-lg px-2 shrink-0"
          style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }}>
          <option value="pickup">📦 Retrait</option>
          <option value="dropoff">📍 Livraison</option>
        </select>
        <Input value={newAddress} onChange={e => setNewAddress(e.target.value)}
          placeholder="Ajouter une adresse…" onKeyDown={e => e.key === "Enter" && addStop()}
          className="h-8 text-[10px] flex-1" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
        <Button size="sm" className="h-8 px-2" onClick={addStop}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 text-xs h-9" onClick={optimizeRoute}
          style={{ background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))" }}>
          <Zap className="h-3.5 w-3.5 mr-1" /> Optimiser l'itinéraire
        </Button>
        <Button size="sm" variant="outline" className="text-xs h-9"
          onClick={() => { setStops(stops.slice(0, 1)); setOptimized(false); }}
          style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Route visualization */}
      <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.04), hsl(var(--hud-surface)))", border: "1px solid hsl(var(--hud-cyan) / 0.1)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "hsl(var(--hud-text))" }}>📍 Séquence de route</p>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {stops.map((s, i) => (
            <div key={s.id} className="flex items-center shrink-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{
                  background: s.type === "pickup" ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-cyan) / 0.15)",
                  color: s.type === "pickup" ? "hsl(var(--success))" : "hsl(var(--hud-cyan))",
                }}>
                {i + 1}
              </div>
              {i < stops.length - 1 && (
                <div className="w-6 h-px mx-0.5" style={{ background: "hsl(var(--hud-text-dim) / 0.15)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
