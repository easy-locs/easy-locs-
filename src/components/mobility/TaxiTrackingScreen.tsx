/**
 * TaxiTrackingScreen — Step 4: Live ride tracking.
 * Shows driver info, trip timeline, live position.
 */
import React, { useEffect } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { Phone, MessageCircle, ShieldCheck, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TIMELINE_STEPS = [
  { key: "searching", label: "Requested" },
  { key: "accepted", label: "Driver assigned" },
  { key: "rider_arriving_pickup", label: "Driver on the way" },
  { key: "rider_arrived_pickup", label: "At pickup" },
  { key: "picked_up", label: "In trip" },
  { key: "completed", label: "Arrived" },
];

const STATUS_ORDER = TIMELINE_STEPS.map(s => s.key);

export function TaxiTrackingScreen() {
  const { activeJobId, setStep } = useTaxiFlowStore();
  const jobs = useCustomerMobilityStore(s => s.jobs);
  const cancelJob = useCustomerMobilityStore(s => s.cancelJob);
  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();

  const job = jobs.find(j => j.id === activeJobId) ?? null;

  // Start live GPS tracking
  useEffect(() => {
    if (activeJobId) startTracking(activeJobId);
    return () => { stopTracking(); };
  }, [activeJobId]);

  // Transition to completed
  useEffect(() => {
    if (job && job.status === "completed") {
      setStep("completed");
    }
  }, [job?.status]);

  const currentIdx = job ? STATUS_ORDER.indexOf(job.status) : -1;

  const handleCancel = async () => {
    if (!job) return;
    try {
      await cancelJob(job.id, "Customer cancelled");
      toast.success("Ride cancelled");
      useTaxiFlowStore.getState().reset();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">Loading ride…</p>
      </div>
    );
  }

  return (
    <motion.div
      key="taxi-tracking"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4"
    >
      {/* Map placeholder */}
      <div className="rounded-2xl border border-border/30 bg-muted/20 overflow-hidden">
        <div className="h-48 flex flex-col items-center justify-center gap-1">
          <p className="text-xs text-muted-foreground font-medium">Live ride map</p>
          {livePosition?.lat && (
            <p className="text-[10px] text-primary text-center px-3 break-words">
              📍 {livePosition.lat.toFixed(4)}, {livePosition.lng?.toFixed(4)}
              {livePosition.speed != null && <span className="ml-1">· {livePosition.speed.toFixed(0)} km/h</span>}
            </p>
          )}
        </div>
      </div>

      {/* Driver card */}
      <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center text-2xl shrink-0">
            👨‍✈️
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {job.rider_user_id ? "Driver assigned" : "Searching…"}
            </p>
            <p className="text-xs text-muted-foreground break-words line-clamp-1">
              {job.service_level.replace(/_/g, " ")} · {job.confirmation_code || "—"}
            </p>
            {job.rider_user_id && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                <span className="text-[10px] text-muted-foreground">Verified driver</span>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Fare</p>
            <p className="text-sm font-bold text-foreground">{job.current_price ?? job.quoted_price} {job.currency}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted/40 text-xs font-semibold text-foreground min-w-0">
            <Phone className="w-3.5 h-3.5 shrink-0" /> <span>Call</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted/40 text-xs font-semibold text-foreground min-w-0">
            <MessageCircle className="w-3.5 h-3.5 shrink-0" /> <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Trip timeline */}
      <div className="rounded-2xl border border-border/30 bg-card p-4">
        <p className="text-xs font-bold text-foreground mb-3">Trip status</p>
        <div className="space-y-0">
          {TIMELINE_STEPS.map((s, idx) => {
            const done = idx <= currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-3 py-1.5">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0 transition-colors",
                  done ? "bg-primary" : "bg-border"
                )} />
                <span className={cn(
                  "text-xs transition-colors",
                  done ? "text-foreground font-semibold" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/20 px-4 py-2.5">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Ride protection active</p>
          <p className="text-[11px] text-muted-foreground leading-snug">Live tracking, verified driver, route monitoring</p>
        </div>
      </div>

      {/* Cancel */}
      {!["completed", "cancelled", "picked_up", "in_progress", "rider_arriving_dropoff"].includes(job.status) && (
        <button
          type="button"
          onClick={handleCancel}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5 shrink-0" /> Cancel ride
        </button>
      )}
    </motion.div>
  );
}
