/**
 * MultiDropBatchPanel — Geographic clustering for multi-drop batch deliveries.
 * PASS84-BB: Multi-Drop Batch Orders
 */
import { useState, useEffect, useMemo } from "react";
import * as deliveryRepo from "@/repositories/delivery.repository";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MapPin, Layers, Zap, CheckCircle2, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haversineKm } from "@/lib/geo/distance";

interface PendingJob {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  notes: string | null;
  current_price: number | null;
  currency: string | null;
  package_size: string | null;
  status: string;
}

interface Cluster {
  id: number;
  center: { lat: number; lng: number };
  jobs: PendingJob[];
  totalFees: number;
  estimatedKm: number;
}

function clusterJobs(jobs: PendingJob[], radiusKm: number): Cluster[] {
  const geoJobs = jobs.filter(j => j.dropoff_lat && j.dropoff_lng);
  const used = new Set<string>();
  const clusters: Cluster[] = [];
  let clusterId = 1;

  for (const job of geoJobs) {
    if (used.has(job.id)) continue;
    const group = [job];
    used.add(job.id);

    for (const other of geoJobs) {
      if (used.has(other.id)) continue;
      const dist = haversineKm(job.dropoff_lat!, job.dropoff_lng!, other.dropoff_lat!, other.dropoff_lng!);
      if (dist <= radiusKm) {
        group.push(other);
        used.add(other.id);
      }
    }

    const centerLat = group.reduce((s, j) => s + j.dropoff_lat!, 0) / group.length;
    const centerLng = group.reduce((s, j) => s + j.dropoff_lng!, 0) / group.length;
    const totalFees = group.reduce((s, j) => s + (j.current_price || 0), 0);

    // Estimate route distance (sum of inter-stop distances)
    let estKm = 0;
    for (let i = 1; i < group.length; i++) {
      estKm += haversineKm(group[i - 1].dropoff_lat!, group[i - 1].dropoff_lng!, group[i].dropoff_lat!, group[i].dropoff_lng!);
    }

    clusters.push({ id: clusterId++, center: { lat: centerLat, lng: centerLng }, jobs: group, totalFees, estimatedKm: Math.round(estKm * 10) / 10 });
  }

  // Add ungeolocated jobs as singles
  const noGeo = jobs.filter(j => !j.dropoff_lat || !j.dropoff_lng);
  for (const job of noGeo) {
    clusters.push({ id: clusterId++, center: { lat: 0, lng: 0 }, jobs: [job], totalFees: job.current_price || 0, estimatedKm: 0 });
  }

  return clusters.sort((a, b) => b.jobs.length - a.jobs.length);
}

export default function MultiDropBatchPanel({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(3);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("mobility_jobs")
        .select("id, pickup_address, dropoff_address, dropoff_lat, dropoff_lng, pickup_lat, pickup_lng, notes, current_price, currency, package_size, status")
        .eq("merchant_id", orgId)
        .eq("status", "searching")
        .order("created_at", { ascending: true });
      if (data) setPendingJobs(data as PendingJob[]);
      setLoading(false);
    };
    fetch();
  }, [orgId]);

  const clusters = useMemo(() => clusterJobs(pendingJobs, radiusKm), [pendingJobs, radiusKm]);

  const handleBatchDispatch = async (cluster: Cluster) => {
    setDispatching(true);
    try {
      // Invoke dispatch for each job in the cluster
      for (const job of cluster.jobs) {
        await deliveryRepo.invokeDispatchDelivery({
          action: "find_drivers", job_id: job.id,
        });
      }
      toast.success(`${cluster.jobs.length} missions envoyées au dispatch !`);
    } catch {
      toast.error("Erreur lors du dispatch batch");
    } finally {
      setDispatching(false);
    }
  };

  const priorityColors: Record<string, string> = {
    urgent: "--destructive",
    express: "--warning",
    standard: "--success",
  };

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "En attente", value: pendingJobs.length, icon: Package, color: "--warning" },
          { label: "Clusters", value: clusters.length, icon: Layers, color: "--hud-cyan" },
          { label: "Multi-stops", value: clusters.filter(c => c.jobs.length > 1).length, icon: Route, color: "--success" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl px-2 py-3 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: `hsl(var(${color}))` }} />
            <p className="text-sm font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Radius slider */}
      <div className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>Rayon de regroupement</span>
          <span className="text-xs font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{radiusKm} km</span>
        </div>
        <input type="range" min={1} max={10} step={0.5} value={radiusKm}
          onChange={e => setRadiusKm(+e.target.value)}
          className="w-full h-1.5 rounded-full appearance-none"
          style={{ background: "hsl(var(--hud-border) / 0.15)" }} />
      </div>

      {/* Clusters */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Layers className="h-5 w-5 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
        </div>
      ) : clusters.length === 0 ? (
        <div className="flex flex-col items-center py-8">
          <CheckCircle2 className="h-8 w-8 mb-2" style={{ color: "hsl(var(--success) / 0.3)" }} />
          <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucune mission en attente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clusters.map(cluster => (
            <motion.div key={cluster.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden cursor-pointer"
              onClick={() => setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id)}
              style={{
                background: "hsl(var(--hud-surface))",
                border: selectedCluster === cluster.id
                  ? "1px solid hsl(var(--hud-cyan) / 0.3)"
                  : "1px solid hsl(var(--hud-border) / 0.08)",
              }}>
              {/* Cluster Header */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: cluster.jobs.length > 1 ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-border) / 0.08)" }}>
                  <span className="text-xs font-bold" style={{ color: cluster.jobs.length > 1 ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))" }}>
                    {cluster.jobs.length}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
                    {cluster.jobs.length > 1 ? `Zone ${cluster.id} — ${cluster.jobs.length} livraisons` : cluster.jobs[0].dropoff_address}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cluster.estimatedKm > 0 && (
                      <span className="text-[9px]" style={{ color: "hsl(var(--info))" }}>
                        📏 ~{cluster.estimatedKm} km
                      </span>
                    )}
                    <span className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>
                      💰 {cluster.totalFees.toFixed(0)}€
                    </span>
                  </div>
                </div>
                {cluster.jobs.length > 1 && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
                    BATCH
                  </span>
                )}
              </div>

              {/* Expanded jobs */}
              <AnimatePresence>
                {selectedCluster === cluster.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t px-3 pb-3 space-y-1.5 pt-2"
                    style={{ borderColor: "hsl(var(--hud-border) / 0.08)" }}>
                    {cluster.jobs.map((job, idx) => (
                      <div key={job.id} className="flex items-center gap-2 py-1">
                        <span className="text-[10px] font-mono w-4 text-center" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{idx + 1}</span>
                        <MapPin className="h-3 w-3 shrink-0" style={{ color: `hsl(var(--info))` }} />
                        <p className="text-[10px] truncate flex-1" style={{ color: "hsl(var(--hud-text))" }}>{job.dropoff_address}</p>
                        <span className="text-[9px] shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                          {job.current_price || 0} AED
                        </span>
                      </div>
                    ))}
                    <Button size="sm" className="w-full text-[10px] h-8 mt-2"
                      onClick={(e) => { e.stopPropagation(); handleBatchDispatch(cluster); }}
                      disabled={dispatching}
                      style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
                      <Zap className="h-3 w-3 mr-1" />
                      {dispatching ? "Dispatch…" : `Dispatcher ${cluster.jobs.length} mission${cluster.jobs.length > 1 ? "s" : ""}`}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
