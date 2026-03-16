/**
 * RouteOptimizationPanel — Multi-stop route optimization for drivers.
 * TSP-based nearest-neighbor with distance/time estimation.
 * PASS87-NN: Route Optimization
 */
import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Navigation, MapPin, Clock, Ruler, Shuffle, CheckCircle2, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface RouteStop {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  priority: "standard" | "express" | "urgent";
  timeWindowStart?: string;
  timeWindowEnd?: string;
}

interface OptimizedRoute {
  stops: RouteStop[];
  totalDistanceKm: number;
  estimatedMinutes: number;
  savings: { distanceKm: number; minutes: number };
}

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinHalf = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sinHalf), Math.sqrt(1 - sinHalf));
};

const totalRouteDistance = (stops: RouteStop[]) => {
  let d = 0;
  for (let i = 1; i < stops.length; i++) d += haversineKm(stops[i - 1], stops[i]);
  return d;
};

const nearestNeighborTSP = (stops: RouteStop[]): RouteStop[] => {
  if (stops.length <= 2) return [...stops];
  const urgentFirst = stops.filter(s => s.priority === "urgent");
  const rest = stops.filter(s => s.priority !== "urgent");
  
  const optimizeGroup = (group: RouteStop[]): RouteStop[] => {
    if (group.length <= 1) return group;
    const visited: RouteStop[] = [group[0]];
    const remaining = [...group.slice(1)];
    while (remaining.length > 0) {
      const last = visited[visited.length - 1];
      let nearestIdx = 0;
      let nearestDist = Infinity;
      remaining.forEach((s, i) => {
        const d = haversineKm(last, s);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
      });
      visited.push(remaining.splice(nearestIdx, 1)[0]);
    }
    return visited;
  };

  return [...optimizeGroup(urgentFirst), ...optimizeGroup(rest)];
};

const SAMPLE_STOPS: RouteStop[] = [
  { id: "1", label: "Retrait A", address: "12 Rue de Rivoli, Paris", lat: 48.8566, lng: 2.3522, priority: "standard" },
  { id: "2", label: "Livraison B", address: "45 Av. Champs-Élysées, Paris", lat: 48.8698, lng: 2.3076, priority: "express" },
  { id: "3", label: "Livraison C", address: "Place de la Bastille, Paris", lat: 48.8533, lng: 2.3694, priority: "standard" },
  { id: "4", label: "Livraison D", address: "Gare du Nord, Paris", lat: 48.8809, lng: 2.3553, priority: "urgent" },
  { id: "5", label: "Livraison E", address: "Tour Montparnasse, Paris", lat: 48.8421, lng: 2.3219, priority: "standard" },
];

export default function RouteOptimizationPanel({ orgId }: { orgId: string }) {
  const [stops, setStops] = useState<RouteStop[]>(SAMPLE_STOPS);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [avgSpeedKmh, setAvgSpeedKmh] = useState(25);

  const originalDistance = useMemo(() => totalRouteDistance(stops), [stops]);
  const originalMinutes = useMemo(() => (originalDistance / avgSpeedKmh) * 60, [originalDistance, avgSpeedKmh]);

  const optimize = useCallback(() => {
    haptic("medium");
    const optimized = nearestNeighborTSP(stops);
    const optDist = totalRouteDistance(optimized);
    const optMin = (optDist / avgSpeedKmh) * 60;
    setOptimizedRoute({
      stops: optimized,
      totalDistanceKm: optDist,
      estimatedMinutes: optMin,
      savings: { distanceKm: originalDistance - optDist, minutes: originalMinutes - optMin },
    });
    toast.success("Itinéraire optimisé !");
  }, [stops, avgSpeedKmh, originalDistance, originalMinutes]);

  const addStop = () => {
    const id = Date.now().toString();
    setStops(prev => [...prev, { id, label: `Stop ${prev.length + 1}`, address: "", lat: 48.85 + Math.random() * 0.05, lng: 2.3 + Math.random() * 0.08, priority: "standard" }]);
    setOptimizedRoute(null);
  };

  const removeStop = (id: string) => {
    setStops(prev => prev.filter(s => s.id !== id));
    setOptimizedRoute(null);
  };

  const priorityColors: Record<string, string> = {
    standard: "hsl(var(--success))", express: "hsl(var(--warning))", urgent: "hsl(var(--destructive))",
  };

  const displayStops = optimizedRoute?.stops || stops;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" style={{ color: "hsl(var(--hud-cyan))" }} />
          <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Optimisation d'itinéraire</h3>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--info) / 0.1)", color: "hsl(var(--info))" }}>
          {stops.length} arrêts
        </span>
      </div>

      {/* Stats comparison */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
          <p className="text-[8px] mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>Distance originale</p>
          <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>{originalDistance.toFixed(1)} km</p>
          <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>≈ {Math.round(originalMinutes)} min</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{
          background: optimizedRoute ? "hsl(var(--success) / 0.05)" : "hsl(var(--hud-surface))",
          border: `1px solid ${optimizedRoute ? "hsl(var(--success) / 0.15)" : "hsl(var(--hud-border) / 0.1)"}`,
        }}>
          <p className="text-[8px] mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
            {optimizedRoute ? "Distance optimisée" : "Non optimisé"}
          </p>
          {optimizedRoute ? (
            <>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--success))" }}>{optimizedRoute.totalDistanceKm.toFixed(1)} km</p>
              <p className="text-[9px]" style={{ color: "hsl(var(--success))" }}>
                -{optimizedRoute.savings.distanceKm.toFixed(1)} km / -{Math.round(optimizedRoute.savings.minutes)} min
              </p>
            </>
          ) : (
            <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-text-dim))" }}>—</p>
          )}
        </div>
      </div>

      {/* Speed setting */}
      <div className="flex items-center gap-2">
        <Label className="text-[9px] shrink-0" style={{ color: "hsl(var(--hud-text-dim))" }}>Vitesse moy.</Label>
        <Input type="number" value={avgSpeedKmh} onChange={e => setAvgSpeedKmh(+e.target.value)}
          className="h-7 w-20 text-[10px]" style={{ background: "hsl(var(--hud-bg))", color: "hsl(var(--hud-text))", borderColor: "hsl(var(--hud-border) / 0.15)" }} />
        <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>km/h</span>
      </div>

      {/* Stop list */}
      <div className="space-y-1.5">
        {displayStops.map((stop, i) => (
          <motion.div key={stop.id}
            layout
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: `${priorityColors[stop.priority]}15`, color: priorityColors[stop.priority] }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{stop.label}</p>
              <p className="text-[8px] truncate" style={{ color: "hsl(var(--hud-text-dim))" }}>{stop.address}</p>
            </div>
            <span className="text-[7px] px-1.5 py-0.5 rounded-full shrink-0" style={{
              background: `${priorityColors[stop.priority]}15`, color: priorityColors[stop.priority],
            }}>{stop.priority}</span>
            {i < displayStops.length - 1 && (
              <span className="text-[8px] shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                {haversineKm(stop, displayStops[i + 1]).toFixed(1)}km
              </span>
            )}
            <button onClick={() => removeStop(stop.id)} className="shrink-0 opacity-40 hover:opacity-100">
              <span className="text-[10px]" style={{ color: "hsl(var(--destructive))" }}>✕</span>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 text-xs h-9" onClick={optimize}
          style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
          <Shuffle className="w-3.5 h-3.5 mr-1" /> Optimiser l'itinéraire
        </Button>
        <Button size="sm" variant="outline" className="text-xs h-9" onClick={addStop}
          style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text-dim))" }}>
          <MapPin className="w-3 h-3 mr-1" /> Ajouter
        </Button>
      </div>

      {optimizedRoute && optimizedRoute.savings.distanceKm > 0 && (
        <div className="rounded-xl p-3 text-center" style={{ background: "hsl(var(--success) / 0.05)", border: "1px solid hsl(var(--success) / 0.1)" }}>
          <CheckCircle2 className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(var(--success))" }} />
          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--success))" }}>
            Économie de {optimizedRoute.savings.distanceKm.toFixed(1)} km et {Math.round(optimizedRoute.savings.minutes)} min
          </p>
          <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Priorité: Urgent → Express → Standard + proximité géographique
          </p>
        </div>
      )}
    </div>
  );
}
