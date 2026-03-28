/**
 * SellerLogisticsPanel — THIN ORCHESTRATOR for delivery management.
 * Composes: CreateJobForm, DriverSearchPanel, logistics-tab-registry.
 * All sub-panels are lazy-loaded via the registry.
 */
import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Package, Truck, MapPin,
  XCircle, Users, MessageCircle, AlertTriangle,
} from "lucide-react";
import { useSellerDelivery, type CreateJobPayload } from "@/hooks/useSellerDelivery";
import { useDeliveryNotifications } from "@/hooks/useDeliveryNotifications";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

import CreateJobForm from "./CreateJobForm";
import DriverSearchPanel from "./DriverSearchPanel";
import DeliveryDisputeFlow from "./DeliveryDisputeFlow";
import DeliveryLiveTracker from "./DeliveryLiveTracker";
import InMissionChat from "./InMissionChat";
import { LOGISTICS_TAB_REGISTRY, CORE_TAB_LABELS } from "./logistics-tab-registry";

const STATUS_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  pending: { label: "En attente", emoji: "⏳", color: "hsl(var(--warning))" },
  assigned: { label: "Assigné", emoji: "📩", color: "hsl(var(--info))" },
  accepted: { label: "Accepté", emoji: "✅", color: "hsl(var(--success))" },
  in_progress: { label: "En cours", emoji: "🚗", color: "hsl(var(--hud-cyan))" },
  completed: { label: "Terminé", emoji: "🏁", color: "hsl(var(--success))" },
  cancelled: { label: "Annulé", emoji: "❌", color: "hsl(var(--destructive))" },
};

export default function SellerLogisticsPanel() {
  const { jobs, loading, metrics, createJob, assignDriver, cancelJob } = useSellerDelivery();
  useDeliveryNotifications();
  const [showCreate, setShowCreate] = useState(false);
  const [searchingJobId, setSearchingJobId] = useState<string | null>(null);
  const [disputeJobId, setDisputeJobId] = useState<string | null>(null);
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null);
  const [chatJobId, setChatJobId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const orgId = jobs[0]?.org_id || "";
  const registryEntry = LOGISTICS_TAB_REGISTRY[filter];

  const filteredJobs = jobs.filter(j => {
    if (filter === "active") return ["pending", "assigned", "accepted", "in_progress"].includes(j.status);
    if (filter === "completed") return ["completed", "cancelled"].includes(j.status);
    return true;
  });

  const handleAssign = async (jobId: string, driverId: string) => {
    haptic("medium");
    try { await assignDriver(jobId, driverId); toast.success("Chauffeur assigné !"); setSearchingJobId(null); }
    catch { toast.error("Erreur d'assignation"); }
  };

  const handleCancel = async (jobId: string) => {
    haptic("warning");
    try { await cancelJob(jobId, "seller_cancelled"); toast("Mission annulée"); }
    catch { toast.error("Erreur"); }
  };

  // All tab keys for the filter bar
  const allTabKeys = ["all", "active", "completed", ...Object.keys(LOGISTICS_TAB_REGISTRY)];
  const getTabLabel = (k: string) => CORE_TAB_LABELS[k] || LOGISTICS_TAB_REGISTRY[k]?.label || k;

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Actives", value: metrics.active, color: "--hud-cyan" },
          { label: "Terminées", value: metrics.completed, color: "--success" },
          { label: "Dépenses", value: `${metrics.totalSpent.toFixed(0)}€`, color: "--warning" },
          { label: "Moy.", value: `${metrics.avgFee.toFixed(1)}€`, color: "--info" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl px-2 py-2.5 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[8px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Create button */}
      <AnimatePresence mode="wait">
        {showCreate ? (
          <CreateJobForm key="form" onSubmit={createJob} onCancel={() => setShowCreate(false)} />
        ) : (
          <motion.div key="btn">
            <Button
              className="w-full text-xs h-10 font-semibold"
              onClick={() => { setShowCreate(true); haptic("light"); }}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Créer une mission de livraison
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: "hsl(var(--hud-surface))" }}>
        {allTabKeys.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="shrink-0 py-1.5 px-2 rounded-lg text-[9px] font-semibold transition-all"
            style={{
              background: filter === f ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: filter === f ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {getTabLabel(f)}
          </button>
        ))}
      </div>

      {/* Content — registry-driven or job list */}
      {registryEntry ? (
        <Suspense fallback={<div className="flex items-center justify-center py-12"><Package className="h-6 w-6 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} /></div>}>
          {registryEntry.render({ orgId, jobs, loading, onReset: () => setFilter("all") })}
        </Suspense>
      ) : (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Package className="h-6 w-6 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Truck className="h-8 w-8 mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucune mission</p>
            </div>
          ) : (
            filteredJobs.map(job => {
              const cfg = STATUS_LABELS[job.status] || STATUS_LABELS.pending;
              return (
                <div key={job.id} className="rounded-xl overflow-hidden"
                  style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}20` }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-base">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                        {job.package_description || "Colis"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                          {job.created_at ? new Date(job.created_at).toLocaleDateString("fr") : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {job.status === "pending" && (
                        <Button size="sm" className="text-[10px] h-7 px-2"
                          onClick={() => setSearchingJobId(searchingJobId === job.id ? null : job.id)}
                          style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
                          <Users className="h-3 w-3 mr-0.5" /> Assigner
                        </Button>
                      )}
                      {["assigned", "accepted", "in_progress"].includes(job.status) && (
                        <Button size="sm" className="text-[10px] h-7 px-2"
                          onClick={() => setTrackingJobId(trackingJobId === job.id ? null : job.id)}
                          style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}>
                          <MapPin className="h-3 w-3 mr-0.5" /> GPS
                        </Button>
                      )}
                      {["assigned", "accepted", "in_progress"].includes(job.status) && job.driver_id && (
                        <Button size="sm" className="text-[10px] h-7 px-2"
                          onClick={() => setChatJobId(chatJobId === job.id ? null : job.id)}
                          style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
                          <MessageCircle className="h-3 w-3 mr-0.5" /> Chat
                        </Button>
                      )}
                      {["pending", "assigned"].includes(job.status) && (
                        <Button size="sm" variant="ghost" className="text-[10px] h-7 px-1.5"
                          onClick={() => handleCancel(job.id)}
                          style={{ color: "hsl(var(--destructive) / 0.6)" }}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                      {["completed", "cancelled"].includes(job.status) && (
                        <Button size="sm" variant="ghost" className="text-[10px] h-7 px-2"
                          onClick={() => setDisputeJobId(disputeJobId === job.id ? null : job.id)}
                          style={{ color: "hsl(var(--destructive) / 0.6)" }}>
                          <AlertTriangle className="h-3 w-3 mr-0.5" /> Litige
                        </Button>
                      )}
                      {job.delivery_fee != null && (
                        <span className="text-[10px] font-bold ml-1" style={{ color: "hsl(var(--hud-cyan))" }}>
                          {job.delivery_fee.toFixed(2)}€
                        </span>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {searchingJobId === job.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-3">
                          <DriverSearchPanel jobId={job.id} onAssign={(driverId) => handleAssign(job.id, driverId)} onClose={() => setSearchingJobId(null)} />
                        </div>
                      </motion.div>
                    )}
                    {disputeJobId === job.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-3">
                          <DeliveryDisputeFlow orgId={job.org_id} jobId={job.id} onClose={() => setDisputeJobId(null)} />
                        </div>
                      </motion.div>
                    )}
                    {trackingJobId === job.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-3">
                          <DeliveryLiveTracker jobId={job.id} onClose={() => setTrackingJobId(null)} />
                        </div>
                      </motion.div>
                    )}
                    {chatJobId === job.id && job.driver_id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-3">
                          <InMissionChat jobId={job.id} sellerId={job.seller_id} driverId={job.driver_id} onClose={() => setChatJobId(null)} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
