import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { Phone, MessageCircle, Star, XCircle, Navigation, MapPin, Clock, Car, Share2, Shield, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useCall } from "@/components/call/CallProvider";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { RideLiveMap } from "./RideLiveMap";
import { StarRating } from "@/components/social/StarRating";
import { ReviewCard } from "@/components/social/ReviewCard";
import { listRiderReviews } from "@/lib/reviews/reviewEngine";

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

interface ReviewRow {
  id: string;
  reviewer_name?: string | null;
  title?: string | null;
  rating: number;
  comment?: string | null;
  created_at?: string | null;
  merchant_reply?: string | null;
  replied_at?: string | null;
}

function DriverReviewsList({ riderUserId }: { riderUserId: string | null }) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!riderUserId) { setLoading(false); return; }
    listRiderReviews(riderUserId)
      .then(data => setReviews(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [riderUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        No reviews yet for this driver
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((row) => (
        <ReviewCard
          key={row.id}
          reviewerName={row.reviewer_name || row.title || "Customer"}
          rating={Number(row.rating ?? 0)}
          comment={row.comment}
          date={row.created_at || ""}
          verified
          merchantReply={row.merchant_reply}
          repliedAt={row.replied_at}
        />
      ))}
    </div>
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

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

  const etaInfo = useMemo(() => {
    if (!livePosition?.lat || !job) return null;
    const isPrePickup = ["accepted", "rider_arriving_pickup", "searching"].includes(job.status);
    const targetLat = isPrePickup ? job.pickup_lat : job.dropoff_lat;
    const targetLng = isPrePickup ? job.pickup_lng : job.dropoff_lng;
    if (!targetLat || !targetLng) return null;
    const distKm = haversineKm(livePosition.lat, livePosition.lng!, targetLat, targetLng);
    const speedKmh = livePosition.speed && livePosition.speed > 2 ? livePosition.speed : 30;
    const etaMin = Math.max(1, Math.round((distKm / speedKmh) * 60));
    return { distKm: distKm.toFixed(1), etaMin, label: isPrePickup ? "Arriving" : "Destination" };
  }, [livePosition, job]);

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
        peerName: job.rider_name || "Driver",
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
            targetName: job.rider_name || "Driver",
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

      {etaInfo && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 text-center"
          style={{ background: "hsl(226 24% 14%)" }}
        >
          <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: "hsl(var(--accent) / 0.7)" }}>{etaInfo.label}</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-bold text-white">{etaInfo.etaMin} min</span>
            <span className="text-sm text-white/60">·</span>
            <span className="text-lg font-semibold text-white/80">{etaInfo.distKm} km</span>
          </div>
        </motion.div>
      )}

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
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "hsl(226 24% 14%)" }}>
              {job.rider_photo_url ? (
                <img src={job.rider_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{job.rider_name?.[0]?.toUpperCase() || "D"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground">{job.rider_name || "Your Driver"}</p>
              {(job.vehicle_model || job.vehicle_color) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[job.vehicle_color, job.vehicle_model].filter(Boolean).join(" ")}
                </p>
              )}
              {job.vehicle_plate && (
                <span className="inline-block mt-1 text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-muted/40 text-foreground tracking-wider">
                  {job.vehicle_plate}
                </span>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                {job.rider_rating != null && (
                  <div className="flex items-center gap-1">
                    <StarRating value={Math.round(job.rider_rating)} readOnly size={14} />
                    <span className="text-xs font-semibold text-foreground">{Number(job.rider_rating).toFixed(1)}</span>
                  </div>
                )}
                {job.rider_total_trips != null && (
                  <span className="text-[10px] text-muted-foreground">
                    ({job.rider_total_trips.toLocaleString()} trips)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowReviews(true)}
                className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold transition-colors"
                style={{ color: "hsl(var(--accent))" }}
              >
                See reviews <ChevronRight className="w-3 h-3" />
              </button>
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
              onClick={() => setShowSafety(true)}
              className="w-12 flex items-center justify-center rounded-xl border border-border/20 bg-card active:scale-[0.97] transition-all"
            >
              <Shield className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
            </button>
          </div>
        </motion.div>
      )}

      {!hasDriver && (
        <button
          type="button"
          onClick={() => setShowSafety(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border/15 bg-card/60 active:scale-[0.98] transition-all"
        >
          <Shield className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs font-bold text-foreground">Safety Center</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
        </button>
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
          onClick={() => setShowCancelConfirm(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5 shrink-0" /> Cancel ride
        </button>
      )}

      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-3xl p-5 w-full max-w-md space-y-4 border-t border-border/20 shadow-2xl pb-10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(0 84% 60% / 0.1)" }}>
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Cancel ride?</h3>
                  <p className="text-xs text-muted-foreground">A cancellation fee may apply</p>
                </div>
              </div>
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: "hsl(0 84% 60% / 0.05)", border: "1px solid hsl(0 84% 60% / 0.15)" }}>
                <p className="text-sm font-semibold text-foreground">Cancellation fee of 5 AED may apply</p>
                <p className="text-xs text-muted-foreground">If the driver is already on the way, a fee will be charged to your payment method.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-border/20 text-foreground active:scale-[0.97] transition-all"
                >
                  Keep ride
                </button>
                <button
                  onClick={() => { setShowCancelConfirm(false); handleCancel(); }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-[0.97] transition-all bg-destructive"
                >
                  Yes, cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSafety && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setShowSafety(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-3xl p-5 w-full max-w-md space-y-4 border-t border-border/20 shadow-2xl pb-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
                  <h3 className="text-base font-bold text-foreground">Safety Center</h3>
                </div>
                <button onClick={() => setShowSafety(false)} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/20 bg-card text-left active:scale-[0.98] transition-all"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: "My ride", text: `Track my ride: ${job.confirmation_code || ""}`, url: window.location.href }).catch(() => {});
                    } else {
                      toast.info("Share your trip link with family");
                    }
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.1)" }}>
                    <Share2 className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Share Trip</p>
                    <p className="text-[10px] text-muted-foreground">Share live location with trusted contacts</p>
                  </div>
                </button>
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-destructive/30 bg-destructive/5 text-left active:scale-[0.98] transition-all"
                  onClick={() => {
                    window.location.href = "tel:112";
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10">
                    <Phone className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-destructive">Emergency SOS</p>
                    <p className="text-[10px] text-muted-foreground">Call emergency services (112)</p>
                  </div>
                </button>
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/20 bg-card text-left active:scale-[0.98] transition-all"
                  onClick={() => toast.info("Trusted contacts feature coming soon")}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/30">
                    <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Trusted Contacts</p>
                    <p className="text-[10px] text-muted-foreground">Manage your emergency contacts</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReviews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setShowReviews(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-t-3xl p-5 w-full max-w-md space-y-4 border-t border-border/20 shadow-2xl pb-10 max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Driver Reviews</h3>
                <button onClick={() => setShowReviews(false)} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 pb-3 border-b border-border/10">
                <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "hsl(226 24% 14%)" }}>
                  {job.rider_photo_url ? (
                    <img src={job.rider_photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-white">{job.rider_name?.[0]?.toUpperCase() || "D"}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{job.rider_name || "Driver"}</p>
                  <div className="flex items-center gap-2">
                    {job.rider_rating != null && <StarRating value={Math.round(job.rider_rating)} readOnly size={14} />}
                    <span className="text-xs text-muted-foreground">
                      {job.rider_rating?.toFixed(1)} · {job.rider_total_trips?.toLocaleString() ?? 0} trips
                    </span>
                  </div>
                </div>
              </div>
              <DriverReviewsList riderUserId={job.rider_user_id} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
