/**
 * RouteOptimizationEngine — Geographic clustering for automatic route optimization.
 * PASS83-X: Route Optimization Engine
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Route, MapPin, Zap, RotateCcw, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  orgId: string;
  className?: string;
}

interface OptimizedRoute {
  id: string;
  stops: { address: string; lat: number; lng: number; type: "pickup" | "dropoff"; jobId: string }[];
  totalDistanceKm: number;
  estimatedTimeMin: number;
  savingsPercent: number;
}

// Haversine distance
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-neighbor TSP approximation
function optimizeStopOrder(stops: OptimizedRoute["stops"]): OptimizedRoute["stops"] {
  if (stops.length <= 2) return stops;
  const remaining = [...stops];
  const ordered: typeof stops = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineKm(last.lat, last.lng, s.lat, s.lng);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }
  return ordered;
}

function totalDistance(stops: OptimizedRoute["stops"]): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += haversineKm(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
  }
  return Math.round(total * 10) / 10;
}

export default function RouteOptimizationEngine({ orgId, className }: Props) {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<OptimizedRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const analyzeAndOptimize = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch pending/assigned jobs with coordinates
      const { data: jobs } = await supabase
        .from("delivery_jobs")
        .select("id, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, status")
        .eq("org_id", orgId)
        .in("status", ["pending", "assigned"])
        .not("pickup_lat", "is", null)
        .not("dropoff_lat", "is", null)
        .limit(50);

      const validJobs = (jobs || []).filter(j => j.pickup_lat && j.dropoff_lat);
      if (validJobs.length === 0) {
        toast.info("Aucune mission avec coordonnées à optimiser");
        setLoading(false);
        return;
      }

      // Geographic clustering using simple grid-based approach
      const CLUSTER_RADIUS_KM = 5;
      const clusters: Map<string, typeof validJobs> = new Map();

      validJobs.forEach(job => {
        const gridKey = `${Math.round(job.pickup_lat! * 10)}_${Math.round(job.pickup_lng! * 10)}`;
        const existing = clusters.get(gridKey) || [];
        existing.push(job);
        clusters.set(gridKey, existing);
      });

      // Merge nearby clusters
      const optimizedRoutes: OptimizedRoute[] = [];
      clusters.forEach((clusterJobs, key) => {
        const stops: OptimizedRoute["stops"] = [];
        clusterJobs.forEach(j => {
          stops.push({ address: j.pickup_address, lat: j.pickup_lat!, lng: j.pickup_lng!, type: "pickup", jobId: j.id });
          stops.push({ address: j.dropoff_address, lat: j.dropoff_lat!, lng: j.dropoff_lng!, type: "dropoff", jobId: j.id });
        });

        // Calculate original distance
        const originalDist = totalDistance(stops);

        // Optimize: pickups first, then dropoffs, each in nearest-neighbor order
        const pickups = stops.filter(s => s.type === "pickup");
        const dropoffs = stops.filter(s => s.type === "dropoff");
        const optimizedStops = [...optimizeStopOrder(pickups), ...optimizeStopOrder(dropoffs)];
        const optimizedDist = totalDistance(optimizedStops);

        const savings = originalDist > 0 ? Math.round(((originalDist - optimizedDist) / originalDist) * 100) : 0;

        optimizedRoutes.push({
          id: key,
          stops: optimizedStops,
          totalDistanceKm: optimizedDist,
          estimatedTimeMin: Math.round(optimizedDist * 3), // ~20km/h average
          savingsPercent: Math.max(0, savings),
        });
      });

      setRoutes(optimizedRoutes);
      setOptimized(true);
      toast.success(`${optimizedRoutes.length} route(s) optimisée(s) !`);
    } catch (err: any) {
      toast.error(err.message || "Erreur d'optimisation");
    } finally {
      setLoading(false);
    }
  }, [user, orgId]);

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Route className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} /> Optimisation de tournées
        </h3>
        {optimized && (
          <button onClick={() => { setRoutes([]); setOptimized(false); }}
            className="text-[9px] flex items-center gap-1" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {!optimized ? (
        <div className="rounded-xl p-6 text-center"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <Zap className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
          <p className="text-[11px] mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
            Analysez vos missions en attente pour regrouper les livraisons par zone et optimiser les itinéraires.
          </p>
          <Button size="sm" onClick={analyzeAndOptimize} disabled={loading}
            className="text-xs" style={{ background: "hsl(var(--hud-cyan))", color: "#fff" }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
            Optimiser les tournées
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-cyan) / 0.06)" }}>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{routes.length}</p>
              <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Routes</p>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--success) / 0.06)" }}>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--success))" }}>
                {routes.reduce((s, r) => s + r.stops.length, 0)}
              </p>
              <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Arrêts</p>
            </div>
            <div className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--warning) / 0.06)" }}>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--warning))" }}>
                {Math.round(routes.reduce((s, r) => s + r.totalDistanceKm, 0))} km
              </p>
              <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Distance totale</p>
            </div>
          </div>

          {/* Route cards */}
          {routes.map((route, i) => (
            <motion.div key={route.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-3"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>
                  Route #{i + 1}
                </span>
                <div className="flex gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                    {route.totalDistanceKm} km
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--info) / 0.1)", color: "hsl(var(--info))" }}>
                    ~{route.estimatedTimeMin} min
                  </span>
                  {route.savingsPercent > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                      -{route.savingsPercent}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {route.stops.map((stop, si) => (
                  <div key={si} className="flex items-center gap-1">
                    <span className="text-[8px] px-1.5 py-0.5 rounded truncate max-w-[100px]"
                      style={{
                        background: stop.type === "pickup" ? "hsl(var(--info) / 0.08)" : "hsl(var(--success) / 0.08)",
                        color: stop.type === "pickup" ? "hsl(var(--info))" : "hsl(var(--success))",
                      }}>
                      {stop.type === "pickup" ? "📦" : "📍"} {stop.address.slice(0, 20)}
                    </span>
                    {si < route.stops.length - 1 && (
                      <ArrowRight className="h-2.5 w-2.5 shrink-0" style={{ color: "hsl(var(--hud-border) / 0.2)" }} />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
