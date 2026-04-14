import React, { useEffect, useRef } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { Phone, MessageCircle, ShieldCheck, Star, XCircle, Navigation, MapPin, Clock, Car, Share2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useCall } from "@/components/call/CallProvider";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { RideLiveMap } from "./RideLiveMap";

const TIMELINE_STEPS = [
  { key: "searching", label: "Requested", icon: "🔍" },
  { key: "accepted", label: "Driver assigned", icon: "✅" },
  { key: "rider_arriving_pickup", label: "On the way to you", icon: "🚗" },
  { key: "rider_arrived_pickup", label: "Arrived at pickup", icon: "📍" },
  { key: "picked_up", label: "Trip started", icon: "🛣️" },
  { key: "in_progress", label: "On the way", icon: "🚀" },
  { key: "rider_arriving_dropoff", label: "Almost there", icon: "📍" },
  { key: "completed", label: "Arrived at destination", icon: "🏁" },
];

const STATUS_ORDER = TIMELINE_STEPS.map(s => s.key);

const STATUS_HEADLINE: Record<string, string> = {
  searching: "Finding your driver",
  accepted: "Driver is coming",
  rider_arriving_pickup: "Driver on the way",
  rider_arrived_pickup: "Driver has arrived",
  picked_up: "Enjoy your ride",
  in_progress: "On the way",
  rider_arriving_dropoff: "Almost there",
  completed: "You've arrived",
};

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
  const headline = job ? (STATUS_HEADLINE[job.status] || job.status.replace(/_/g, " ")) : "Loading…";
  const hasDriver = !!job?.rider_user_id;

  const handleCancel = async () => {
    if (!job) return;
    try {
      await cancelJob(job.id, "Customer cancelled");
      toast.success("Ride cancelled");
      useTaxiFlowStore.getState().reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleCall = async () => {
    if (!job?.rider_user_id) { toast.info("Driver not yet assigned"); return; }
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
      toast.error("Call failed");
    } finally {
      setTimeout(() => { callLockRef.current = false; }, 500);
    }
  };

  const handleChat = async () => {
    if (!job?.rider_user_id) { toast.info("Driver not yet assigned"); return; }
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
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const driverPos = livePosition?.lat != null ? { lat: livePosition.lat, lng: livePosition.lng! } : null;
  const pickupPos = job.pickup_lat != null ? { lat: job.pickup_lat, lng: job.pickup_lng! } : null;
  const dropoffPos = job.dropoff_lat != null ? { lat: job.dropoff_lat, lng: job.dropoff_lng! } : null;

  return (
    <motion.div
      key="taxi-tracking"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-3"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-between px-1"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(226 24% 14% / 0.1)" }}>
            <Car className="w-5 h-5" style={{ color: "hsl(226 24% 14%)" }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{headline}</h2>
            <p className="text-[11px] text-muted-foreground">{job.service_level.replace(/_/g, " ")} · {job.confirmation_code || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--accent) / 0.1)" }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--accent))" }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(var(--accent))" }}>Live</span>
        </div>
      </motion.div>

      <div className="rounded-2xl overflow-hidden border border-border/20" style={{ aspectRatio: "16/9", minHeight: 160, maxHeight: 260 }}>
        <RideLiveMap
          driver={driverPos}
          pickup={pickupPos}
          dropoff={dropoffPos}
        />
      </div>

      {hasDriver && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/20 bg-card p-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "hsl(226 24% 14%)" }}>
              {(job as any).rider_photo_url ? (
                <img src={(job as any).rider_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-white">{(job as any).rider_name?.[0]?.toUpperCase() || "D"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{(job as any).rider_name || "Your Driver"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {(job as any).vehicle_model && (
                  <span className="text-[11px] text-muted-foreground">{(job as any).vehicle_model}</span>
                )}
                {(job as any).vehicle_plate && (
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted/40 text-foreground">{(job as any).vehicle_plate}</span>
                )}
              </div>
              {(job as any).rider_rating != null && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-semibold text-foreground">{Number((job as any).rider_rating).toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-foreground">{job.current_price ?? job.quoted_price}</p>
              <p className="text-[10px] text-muted-foreground">{job.currency}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCall}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold active:scale-[0.97] transition-all text-white"
              style={{ background: "hsl(142 71% 45%)" }}
            >
              <Phone className="w-4 h-4 shrink-0" /> Call
            </button>
            <button
              onClick={handleChat}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold active:scale-[0.97] transition-all text-white"
              style={{ background: "hsl(226 24% 14%)" }}
            >
              <MessageCircle className="w-4 h-4 shrink-0" /> Chat
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "My ride", text: `Track my ride: ${job.confirmation_code || ""}`, url: window.location.href }).catch(() => {});
                } else {
                  toast.info("Share your trip link with family");
                }
              }}
              className="w-12 flex items-center justify-center rounded-xl border border-border/20 bg-card active:scale-[0.97] transition-all"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl border border-border/20 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs font-bold text-foreground">Trip Progress</span>
        </div>
        <div className="relative">
          {TIMELINE_STEPS.map((s, idx) => {
            const done = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            const isLast = idx === TIMELINE_STEPS.length - 1;
            return (
              <div key={s.key} className="flex items-start gap-3 relative">
                <div className="flex flex-col items-center shrink-0">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all",
                    done ? "text-white" : "bg-muted/40 text-muted-foreground/40",
                    isCurrent && "ring-4"
                  )} style={done ? { background: "hsl(226 24% 14%)" } : undefined}
                     {...(isCurrent ? { style: { background: "hsl(var(--accent))", boxShadow: "0 0 0 4px hsl(var(--accent) / 0.2)" } } : {})}>
                    {s.icon}
                  </div>
                  {!isLast && (
                    <div className={cn("w-0.5 h-6", done ? "" : "bg-muted/30")}
                      style={done ? { background: "hsl(226 24% 14% / 0.3)" } : undefined} />
                  )}
                </div>
                <div className="pt-1 min-w-0 pb-2">
                  <span className={cn(
                    "text-sm transition-colors",
                    done ? "text-foreground font-semibold" : "text-muted-foreground/50"
                  )}>
                    {s.label}
                  </span>
                  {isCurrent && livePosition?.speed != null && (
                    <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--accent))" }}>
                      {livePosition.speed.toFixed(0)} km/h
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.15)" }}>
        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Ride protection active</p>
          <p className="text-[10px] text-muted-foreground">Live tracking · Verified driver · Route monitoring</p>
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/15 bg-card/40">
        <Navigation className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground line-clamp-1">{job.pickup_label || "Pickup"}</p>
        </div>
        <div className="w-6 flex items-center justify-center">
          <div className="w-4 h-0.5 rounded-full bg-border" />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[11px] text-muted-foreground line-clamp-1">{job.dropoff_label || "Dropoff"}</p>
        </div>
        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </div>

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
