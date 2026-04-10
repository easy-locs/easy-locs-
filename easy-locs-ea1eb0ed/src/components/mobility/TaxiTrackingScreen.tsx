import React, { useEffect, useRef } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { Phone, MessageCircle, ShieldCheck, Star, XCircle, Navigation, MapPin } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useCall } from "@/components/call/CallProvider";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDirectThread } from "@/lib/direct-thread";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startCall, isInCall, isStartingCall } = useCall();
  const jobs = useCustomerMobilityStore(s => s.jobs);
  const cancelJob = useCustomerMobilityStore(s => s.cancelJob);
  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();
  const callLockRef = useRef(false);
  const chatLockRef = useRef(false);

  const job = jobs.find(j => j.id === activeJobId) ?? null;

  useEffect(() => {
    if (activeJobId) startTracking(activeJobId);
    return () => { stopTracking(); };
  }, [activeJobId]);

  useEffect(() => {
    if (job && job.status === "completed") {
      setStep("completed");
    }
  }, [job?.status]);

  const currentIdx = job ? Math.max(STATUS_ORDER.indexOf(job.status), 0) : 0;

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

  const handleCall = async () => {
    if (!job?.rider_user_id) {
      toast.info("Driver not yet assigned");
      return;
    }
    if (callLockRef.current || isInCall || isStartingCall) return;
    callLockRef.current = true;
    try {
      const success = await startCall({
        targetId: job.rider_user_id,
        peerName: (job as any).rider_name || "Driver",
        entityType: "ride",
        entityId: job.id,
        isVideo: false,
      });
      if (!success) toast.error("Could not call driver");
    } catch {
      toast.error("Call to driver failed");
    } finally {
      setTimeout(() => { callLockRef.current = false; }, 500);
    }
  };

  const handleChat = async () => {
    if (!job?.rider_user_id) {
      toast.info("Driver not yet assigned");
      return;
    }
    if (chatLockRef.current) return;
    chatLockRef.current = true;
    try {
      if (user?.id) {
        try {
          const result = await getOrCreateDirectThread({
            currentUserId: user.id,
            targetUserId: job.rider_user_id,
            targetName: (job as any).rider_name || "Driver",
          });
          if (result?.conversationId) {
            navigate(`/orbit?thread=${result.conversationId}`);
            return;
          }
        } catch {}
      }
      navigate("/orbit");
    } finally {
      setTimeout(() => { chatLockRef.current = false; }, 500);
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
      {/* Live route visualization */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-primary/5 via-muted/10 to-emerald-500/5 overflow-hidden">
        <div className="h-40 flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-48 h-48 rounded-full border border-primary/10"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="flex items-center gap-8 z-10">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Navigation className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">Pickup</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <motion.div
                className="w-16 h-[2px] bg-gradient-to-r from-emerald-500 to-primary rounded-full"
                animate={{ scaleX: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {livePosition?.speed != null && (
                <span className="text-[10px] font-bold text-primary">{livePosition.speed.toFixed(0)} km/h</span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">Dropoff</span>
            </div>
          </div>
        </div>
      </div>

      {/* Driver card */}
      <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-primary" />
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
                <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-[10px] text-emerald-500 font-medium">Verified driver</span>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Fare</p>
            <p className="text-sm font-bold text-foreground">{job.current_price ?? job.quoted_price} {job.currency}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCall}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/10 text-xs font-semibold text-emerald-600 active:scale-[0.97] transition-all min-w-0"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" /> <span>Call</span>
          </button>
          <button
            onClick={handleChat}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 text-xs font-semibold text-primary active:scale-[0.97] transition-all min-w-0"
          >
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
            const isCurrent = idx === currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-3 py-1.5">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0 transition-colors",
                  done ? "bg-primary" : "bg-border",
                  isCurrent && "ring-4 ring-primary/20"
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
      <div className="flex items-center gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-4 py-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
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
