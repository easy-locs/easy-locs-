import { useEffect, useState, Component, type ReactNode } from "react";
import { useCustomerMobilityStore, type MobilityJob } from "@/stores/customerMobilityStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import * as repo from "@/repositories/mobility.repository";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";
import {
  ArrowLeft, Send, Gift, Briefcase, ShoppingCart,
  MapPin, Clock, Shield, ChevronRight, Package,
  Navigation, Zap, Bike, Users, Phone, MessageCircle, CheckCircle2,
  Star, Key, Loader2,
} from "lucide-react";
import { MobilityLiveMap } from "@/components/mobility/MobilityLiveMap";
import { RideLiveMap } from "@/components/mobility/RideLiveMap";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCall } from "@/components/call/CallProvider";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { StarRating } from "@/components/social/StarRating";
import { ReviewCard } from "@/components/social/ReviewCard";
import { listRiderReviews } from "@/lib/reviews/reviewEngine";

class MapSafeBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-border/15 p-6 flex flex-col items-center gap-2 text-center" style={{ background: "linear-gradient(135deg, hsl(142 71% 45% / 0.05), hsl(220 70% 55% / 0.05))" }}>
          <MapPin className="w-6 h-6" style={{ color: "hsl(var(--accent) / 0.6)" }} />
          <p className="text-xs font-bold text-foreground">Live Map</p>
          <p className="text-[10px] text-muted-foreground">Riders are being tracked in your area</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const RIDER_SERVICES = [
  { id: "bring", label: "Bring Me Something", description: "Pick up from any location and deliver to you", icon: ShoppingCart, route: "/mobility/delivery/bring", emoji: "📦", etaKey: "parcel" as const },
  { id: "parcel", label: "Send a Parcel", description: "Documents, packages — tracked with OTP", icon: Send, route: "/mobility/delivery/parcel", emoji: "📄", etaKey: "parcel" as const },
  { id: "gift", label: "Gift Delivery", description: "Surprise someone with a personal touch", icon: Gift, route: "/mobility/delivery/gift", emoji: "🎁", etaKey: "parcel" as const },
  { id: "errand", label: "Custom Errand", description: "Tell us what you need — we handle the rest", icon: Briefcase, route: "/mobility/delivery/errand", emoji: "✨", etaKey: "parcel" as const },
];

const DELIVERY_STATUSES = [
  { key: "searching", label: "Finding rider", icon: "🔍" },
  { key: "accepted", label: "Rider assigned", icon: "✅" },
  { key: "rider_arriving_pickup", label: "Heading to pickup", icon: "🛵" },
  { key: "rider_arrived_pickup", label: "At pickup", icon: "📍" },
  { key: "picked_up", label: "Package picked up", icon: "📦" },
  { key: "in_progress", label: "On the way", icon: "🚀" },
  { key: "rider_arriving_dropoff", label: "Almost there", icon: "🏁" },
  { key: "completed", label: "Delivered", icon: "✅" },
];
const DELIVERY_STATUS_ORDER = DELIVERY_STATUSES.map(s => s.key);

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

function DeliveryRiderReviews({ riderUserId }: { riderUserId: string | null }) {
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
    return <div className="flex items-center justify-center py-4"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (reviews.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No reviews yet for this rider</p>;
  }

  return (
    <div className="space-y-2">
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

function ActiveDeliveryTracker({ job, isPrimary }: { job: MobilityJob; isPrimary: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startCall, isInCall, isStartingCall } = useCall();
  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();
  const currentIdx = Math.max(DELIVERY_STATUS_ORDER.indexOf(job.status), 0);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    if (!isPrimary) return;
    startTracking(job.id);
    return () => { stopTracking(); };
  }, [job.id, isPrimary]);

  const etaInfo = (() => {
    if (!livePosition?.lat || !job.dropoff_lat || !job.dropoff_lng) return null;
    const distKm = haversineKm(livePosition.lat, livePosition.lng!, job.dropoff_lat, job.dropoff_lng);
    const speed = livePosition.speed && livePosition.speed > 2 ? livePosition.speed : 25;
    const etaMin = Math.max(1, Math.round((distKm / speed) * 60));
    return { distKm: distKm.toFixed(1), etaMin };
  })();

  const handleCall = async () => {
    if (!job.rider_user_id) { toast.info("Rider not yet assigned"); return; }
    try {
      await startCall({ targetId: job.rider_user_id, peerName: job.rider_name || "Rider", entityType: "delivery", entityId: job.id, isVideo: false });
    } catch { toast.error("Call failed"); }
  };

  const handleChat = async () => {
    if (!job.rider_user_id || !user?.id) return;
    try {
      const result = await getOrCreateDirectThread({ currentUserId: user.id, targetUserId: job.rider_user_id, targetName: job.rider_name || "Rider" });
      if (result?.conversationId) navigate(`/orbit?thread=${result.conversationId}`);
      else navigate("/orbit");
    } catch { navigate("/orbit"); }
  };

  const pickupPos = job.pickup_lat != null ? { lat: job.pickup_lat, lng: job.pickup_lng! } : null;
  const dropoffPos = job.dropoff_lat != null ? { lat: job.dropoff_lat, lng: job.dropoff_lng! } : null;
  const driverPos = livePosition?.lat != null ? { lat: livePosition.lat, lng: livePosition.lng! } : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/20 bg-card overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "hsl(226 24% 14%)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-sm font-bold text-white">Active Delivery</span>
        </div>
        <div className="flex items-center gap-3">
          {etaInfo && (
            <span className="text-xs font-bold text-white">
              Arriving in {etaInfo.etaMin} min
            </span>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "hsl(var(--accent) / 0.15)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--accent))" }} />
            <span className="text-[10px] font-bold" style={{ color: "hsl(var(--accent))" }}>LIVE</span>
          </div>
        </div>
      </div>

      {isPrimary && (pickupPos || dropoffPos) && (
        <div className="h-40 border-b border-border/10">
          <RideLiveMap driver={driverPos} pickup={pickupPos} dropoff={dropoffPos} />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 text-xs">
          <Navigation className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
          <span className="text-foreground flex-1 min-w-0 line-clamp-1">{job.pickup_label || "Pickup"}</span>
          <div className="w-4 flex items-center justify-center">
            <div className="w-3 h-0.5 rounded-full bg-border" />
          </div>
          <span className="text-foreground flex-1 min-w-0 line-clamp-1 text-right">{job.dropoff_label || "Delivery"}</span>
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--accent))" }} />
        </div>

        <div className="space-y-2">
          {DELIVERY_STATUSES.map((s, idx) => {
            const done = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            const isPast = idx < currentIdx;
            const stepTime = isPast && job.updated_at
              ? (() => {
                  const base = new Date(job.created_at || job.updated_at);
                  const updated = new Date(job.updated_at);
                  const totalElapsed = updated.getTime() - base.getTime();
                  const stepMs = currentIdx > 0 ? (totalElapsed / currentIdx) * idx : 0;
                  const t = new Date(base.getTime() + stepMs);
                  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                })()
              : null;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all",
                  done ? "text-white" : "bg-muted/30 text-muted-foreground/40",
                  isCurrent && "ring-2 ring-offset-1"
                )} style={done ? { background: "hsl(var(--accent))" } : undefined}
                   {...(isCurrent ? { style: { background: "hsl(var(--accent))", boxShadow: "0 0 0 3px hsl(var(--accent) / 0.2)" } } : {})}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm",
                    done ? "text-foreground font-semibold" : "text-muted-foreground/50"
                  )}>
                    {s.label}
                  </span>
                  {stepTime && (
                    <span className="block text-[10px] text-muted-foreground/60">{stepTime}</span>
                  )}
                </div>
                {isCurrent && etaInfo && (
                  <span className="text-[10px] font-bold shrink-0" style={{ color: "hsl(var(--accent))" }}>
                    ~{etaInfo.etaMin}min
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {job.confirmation_code && (
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "hsl(var(--accent) / 0.05)", border: "1px solid hsl(var(--accent) / 0.15)" }}>
            <Key className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Verification code (OTP)</p>
              <p className="text-lg font-bold font-mono tracking-widest text-foreground">{job.confirmation_code}</p>
            </div>
          </div>
        )}

        {job.rider_user_id && (
          <div className="rounded-xl border border-border/15 bg-card/60 p-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "hsl(226 24% 14%)" }}>
                {job.rider_photo_url ? (
                  <img loading="lazy" src={job.rider_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-white">{job.rider_name?.[0]?.toUpperCase() || "R"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{job.rider_name || "Your Rider"}</p>
                {(job.vehicle_model || job.vehicle_color) && (
                  <p className="text-[11px] text-muted-foreground">
                    {[job.vehicle_color, job.vehicle_model].filter(Boolean).join(" ")}
                  </p>
                )}
                {job.vehicle_plate && (
                  <span className="inline-block mt-0.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted/40 text-foreground">
                    {job.vehicle_plate}
                  </span>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {job.rider_rating != null && (
                    <div className="flex items-center gap-1">
                      <StarRating value={Math.round(job.rider_rating)} readOnly size={12} />
                      <span className="text-[10px] font-semibold text-foreground">{Number(job.rider_rating).toFixed(1)}</span>
                    </div>
                  )}
                  {job.rider_total_trips != null && (
                    <span className="text-[10px] text-muted-foreground">({job.rider_total_trips} deliveries)</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCall}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "hsl(142 71% 45%)" }}>
                <Phone className="w-3.5 h-3.5 shrink-0" /> Call
              </button>
              <button onClick={handleChat}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
                style={{ background: "hsl(226 24% 14%)" }}>
                <MessageCircle className="w-3.5 h-3.5 shrink-0" /> Chat
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowReviews(!showReviews)}
              className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
              style={{ color: "hsl(var(--accent))" }}
            >
              {showReviews ? "Hide reviews" : "See reviews"} <ChevronRight className={cn("w-3 h-3 transition-transform", showReviews && "rotate-90")} />
            </button>
            <AnimatePresence>
              {showReviews && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <DeliveryRiderReviews riderUserId={job.rider_user_id} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MobilityDeliveryPage() {
  useUiEngine("mobility-mobilitydeliverypage");
  const navigate = useNavigate();
  const [addressOpen, setAddressOpen] = useState(false);
  const { jobs, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const brain = usePlatformBrain();
  const station = brain.arbitration;
  const permissionState = brain.geo.gpsPermission;

  useEffect(() => { hydrateMyJobs(); }, []);

  useEffect(() => {
    const setup = async () => {
      const userId = await repo.getCurrentUserId();
      if (!userId) return;
      const ch = repo.subscribeToTable(
        `delivery-jobs:${userId}`, "mobility_jobs",
        `customer_user_id=eq.${userId}`,
        (payload: any) => { if (payload.new?.id) refreshJob(payload.new.id); }
      );
      return () => { repo.unsubscribeChannel(ch); };
    };
    const cleanup = setup();
    return () => { cleanup.then(fn => fn?.()); };
  }, []);

  const deliveryTypes = ["food_delivery", "grocery_delivery", "parcel_delivery", "errand"];
  const deliveryJobs = jobs.filter(j => deliveryTypes.includes(j.job_type));
  const activeJobs = deliveryJobs.filter(j => !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status));
  const completedJobs = deliveryJobs.filter(j => j.status === "completed");
  const riderCount = station.riderCount;
  const avgEta = station.etas?.parcel ?? station.etas?.food ?? null;

  return (
    <SubPageShell noContentPad>
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-border/30" style={{ background: "hsl(226 24% 14% / 0.95)" }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
            className="p-1.5 rounded-xl transition-colors" style={{ background: "hsl(0 0% 100% / 0.1)" }}>
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Bike className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--accent))" }} />
              <h1 className="text-lg font-bold text-white tracking-tight">Delivery</h1>
            </div>
          </div>
          {activeJobs.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--accent) / 0.15)" }}>
              <Package className="h-3 w-3" style={{ color: "hsl(var(--accent))" }} />
              <span className="text-xs font-bold" style={{ color: "hsl(var(--accent))" }}>{activeJobs.length}</span>
            </div>
          )}
        </div>

        <div className="px-4 pb-3">
          <button
            onClick={() => setAddressOpen(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors"
            style={{ background: "hsl(0 0% 100% / 0.08)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] leading-none" style={{ color: "hsl(0 0% 100% / 0.5)" }}>Deliver to</p>
              <p className="text-sm font-semibold leading-snug text-white line-clamp-1 mt-0.5">
                {station.label || "Set your delivery address"}
              </p>
            </div>
            <span className="text-xs font-semibold shrink-0" style={{ color: "hsl(var(--accent))" }}>Change</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 app-mobile-content">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-border/20 bg-card/60 px-4 py-3"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Users className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
                {riderCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(142 71% 45%)" }} />}
              </div>
              <span className="text-sm font-bold text-foreground">{riderCount}</span>
              <span className="text-xs text-muted-foreground">riders</span>
            </div>
            {avgEta != null && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">{avgEta} min</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "hsl(142 71% 45% / 0.1)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(142 71% 45%)" }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "hsl(142 71% 45%)" }}>LIVE</span>
          </div>
        </motion.div>

        <MapSafeBoundary>
          <MobilityLiveMap mode="delivery" nearbyRiders={riderCount > 0 ? riderCount : 3} />
        </MapSafeBoundary>

        <AnimatePresence>
          {activeJobs.map((j, idx) => (
            <ActiveDeliveryTracker key={j.id} job={j} isPrimary={idx === 0} />
          ))}
        </AnimatePresence>

        <div className="space-y-2.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">What do you need?</p>
          {RIDER_SERVICES.map((svc, i) => (
            <motion.button
              key={svc.id}
              onClick={() => navigate(svc.route)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/20 bg-card text-left transition-all active:scale-[0.98]"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-background/80 shadow-sm border border-border/10">
                {svc.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold leading-snug text-foreground">{svc.label}</p>
                  {station.etas[svc.etaKey] != null && (
                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}>
                      {station.etas[svc.etaKey]}min
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{svc.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </motion.button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="grid grid-cols-2 gap-2 py-1">
          {[
            { icon: <Navigation className="h-3.5 w-3.5" />, label: "Real-time tracking" },
            { icon: <Zap className="h-3.5 w-3.5" />, label: "Fast pickup" },
            { icon: <Shield className="h-3.5 w-3.5" />, label: "Verified riders" },
            { icon: <Package className="h-3.5 w-3.5" />, label: "Insured parcels" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30">
              <span className="shrink-0" style={{ color: "hsl(var(--accent))" }}>{b.icon}</span>
              <span className="text-[11px] text-muted-foreground font-medium leading-snug">{b.label}</span>
            </div>
          ))}
        </motion.div>

        {completedJobs.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Deliveries</p>
            {completedJobs.slice(0, 3).map(j => (
              <div key={j.id} className="bg-card border border-border/20 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground capitalize">{j.job_type.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" style={{ color: "hsl(142 71% 45%)" }} />
                    <span className="text-[10px] font-bold" style={{ color: "hsl(142 71% 45%)" }}>Delivered</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {j.pickup_label || j.pickup_address} → {j.dropoff_label || j.dropoff_address}
                </p>
              </div>
            ))}
          </div>
        )}

        {permissionState === "denied" && !station.label && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border p-4 text-center space-y-2"
            style={{ borderColor: "hsl(var(--accent) / 0.2)", background: "hsl(var(--accent) / 0.05)" }}
          >
            <MapPin className="w-6 h-6 mx-auto" style={{ color: "hsl(var(--accent))" }} />
            <p className="text-sm font-semibold text-foreground">Location access needed</p>
            <p className="text-xs text-muted-foreground">Enable location or set an address to see nearby riders</p>
            <button onClick={() => setAddressOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "hsl(226 24% 14%)" }}>
              Set address manually
            </button>
          </motion.div>
        )}
      </div>

      <AddressSelectorSheet open={addressOpen} onOpenChange={setAddressOpen} contextType="global" />
    </SubPageShell>
  );
}
