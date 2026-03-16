/**
 * BatchDispatchPanel — Multi-job batch dispatch UI
 * PASS78-I: Batch Dispatch Engine
 */
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, XCircle, Loader2, Search, Truck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useBatchDispatch } from "@/hooks/useBatchDispatch";
import type { DeliveryJob } from "@/hooks/useDriverMissions";

const STATUS_ICON = {
  pending: <Loader2 className="h-3 w-3 animate-spin" style={{ color: "hsl(var(--info))" }} />,
  assigning: <Loader2 className="h-3 w-3 animate-spin" style={{ color: "hsl(var(--warning))" }} />,
  success: <CheckCircle2 className="h-3 w-3" style={{ color: "hsl(var(--success))" }} />,
  failed: <XCircle className="h-3 w-3" style={{ color: "hsl(var(--destructive))" }} />,
};

interface Props {
  jobs: DeliveryJob[];
  onDone?: () => void;
}

export default function BatchDispatchPanel({ jobs, onDone }: Props) {
  const {
    selectedJobIds, assignments, discovering, dispatching, result,
    toggleJob, selectAll, clearSelection, discoverDrivers, executeDispatch,
  } = useBatchDispatch();

  const pendingJobs = jobs.filter(j => j.status === "pending");
  const hasAssignments = Array.from(assignments.values()).some(a => a.status === "pending");

  const handleDiscover = async () => {
    haptic("medium");
    await discoverDrivers();
    const matched = Array.from(assignments.values()).filter(a => a.status !== "failed").length;
    toast(`${matched}/${selectedJobIds.size} missions matchées`);
  };

  const handleDispatch = async () => {
    haptic("heavy");
    await executeDispatch();
    toast.success("Batch dispatch terminé !");
    onDone?.();
  };

  if (pendingJobs.length === 0) {
    return (
      <div className="text-center py-8">
        <Zap className="h-6 w-6 mx-auto mb-1" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
          Aucune mission en attente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Zap className="h-3.5 w-3.5" style={{ color: "hsl(var(--warning))" }} />
          Batch Dispatch ({selectedJobIds.size}/{pendingJobs.length})
        </h3>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="text-[9px] h-6 px-2"
            onClick={() => selectAll(jobs)}
            style={{ color: "hsl(var(--hud-cyan))" }}>
            Tout sélect.
          </Button>
          {selectedJobIds.size > 0 && (
            <Button size="sm" variant="ghost" className="text-[9px] h-6 px-2"
              onClick={clearSelection}
              style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Annuler
            </Button>
          )}
        </div>
      </div>

      {/* Job selection list */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {pendingJobs.map(job => {
          const isSelected = selectedJobIds.has(job.id);
          const assignment = assignments.get(job.id);

          return (
            <button
              key={job.id}
              onClick={() => toggleJob(job.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left"
              style={{
                background: isSelected ? "hsl(var(--hud-cyan) / 0.08)" : "hsl(var(--hud-surface))",
                border: `1px solid ${isSelected ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.06)"}`,
              }}
            >
              {/* Checkbox */}
              <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                style={{
                  borderColor: isSelected ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-border) / 0.2)",
                  background: isSelected ? "hsl(var(--hud-cyan))" : "transparent",
                }}>
                {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                  {job.package_description || "Colis"}
                </p>
                <p className="text-[9px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  {job.pickup_address?.slice(0, 25)}… → {job.dropoff_address?.slice(0, 25)}…
                </p>
              </div>

              {/* Assignment status */}
              {assignment && (
                <div className="flex items-center gap-1 shrink-0">
                  {STATUS_ICON[assignment.status]}
                  {assignment.status === "pending" && assignment.driverInfo?.vehicle_type && (
                    <span className="text-[9px]" style={{ color: "hsl(var(--info))" }}>
                      {assignment.driverInfo.vehicle_type} • {assignment.driverInfo.distance_km}km
                    </span>
                  )}
                  {assignment.status === "failed" && (
                    <span className="text-[9px]" style={{ color: "hsl(var(--destructive))" }}>
                      {assignment.error?.slice(0, 20)}
                    </span>
                  )}
                </div>
              )}

              {job.delivery_fee != null && (
                <span className="text-[9px] font-bold shrink-0" style={{ color: "hsl(var(--hud-cyan))" }}>
                  {job.delivery_fee.toFixed(0)}€
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      {selectedJobIds.size > 0 && (
        <div className="flex gap-2">
          {!hasAssignments ? (
            <Button
              className="flex-1 text-xs h-9 font-semibold"
              onClick={handleDiscover}
              disabled={discovering}
              style={{ background: "hsl(var(--info) / 0.15)", color: "hsl(var(--info))" }}
            >
              {discovering ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Recherche…</>
              ) : (
                <><Search className="h-3.5 w-3.5 mr-1" /> Trouver chauffeurs ({selectedJobIds.size})</>
              )}
            </Button>
          ) : (
            <Button
              className="flex-1 text-xs h-9 font-semibold"
              onClick={handleDispatch}
              disabled={dispatching}
              style={{ background: "hsl(var(--warning))", color: "hsl(var(--hud-bg))" }}
            >
              {dispatching ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Dispatch…</>
              ) : (
                <><Zap className="h-3.5 w-3.5 mr-1" /> Dispatcher tout</>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Result summary */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-lg px-3 py-2.5 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}
          >
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-sm font-bold" style={{ color: "hsl(var(--success))" }}>{result.success}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Assignées</p>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "hsl(var(--destructive))" }}>{result.failed}</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Échouées</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
