import { useEffect, useState, Component, type ReactNode } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import * as repo from "@/repositories/mobility.repository";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";
import {
  ArrowLeft, Send, Gift, Briefcase, ShoppingCart,
  MapPin, Clock, Shield, ChevronRight, Package,
  Navigation, Zap, Bike, Users, Phone, MessageCircle, CheckCircle2,
} from "lucide-react";
import { MobilityLiveMap } from "@/components/mobility/MobilityLiveMap";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCall } from "@/components/call/CallProvider";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateDirectThread } from "@/lib/direct-thread";

class MapSafeBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-border/15 p-6 flex flex-col items-center gap-2 text-center" style={{ background: "linear-gradient(135deg, hsl(142 71% 45% / 0.05), hsl(220 60% 50% / 0.05))" }}>
          <MapPin className="w-6 h-6" style={{ color: "hsl(38 65% 56% / 0.6)" }} />
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

function ActiveDeliveryTracker({ job, isPrimary }: { job: any; isPrimary: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startCall, isInCall, isStartingCall } = useCall();
  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();
  const currentIdx = Math.max(DELIVERY_STATUS_ORDER.indexOf(job.status), 0);

  useEffect(() => {
    if (!isPrimary) return;
    startTracking(job.id);
    return () => { stopTracking(); };
  }, [job.id, isPrimary]);

  const handleCall = async () => {
    if (!job.rider_user_id) { toast.info("Rider not yet assigned"); return; }
    try {
      await startCall({ targetId: job.rider_user_id, peerName: "Rider", entityType: "delivery", entityId: job.id, isVideo: false });
    } catch { toast.error("Call failed"); }
  };

  const handleChat = async () => {
    if (!job.rider_user_id || !user?.id) return;
    try {
      const result = await getOrCreateDirectThread({ currentUserId: user.id, targetUserId: job.rider_user_id, targetName: "Rider" });
      if (result?.conversationId) navigate(`/orbit?thread=${result.conversationId}`);
      else navigate("/orbit");
    } catch { navigate("/orbit"); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/20 bg-card overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "hsl(220 40% 18%)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-4 h-4 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />
          <span className="text-sm font-bold text-white">Active Delivery</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "hsl(38 65% 56% / 0.15)" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(38 65% 56%)" }} />
          <span className="text-[10px] font-bold" style={{ color: "hsl(38 65% 56%)" }}>LIVE</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3 text-xs">
          <Navigation className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
          <span className="text-foreground flex-1 min-w-0 line-clamp-1">{job.pickup_label || "Pickup"}</span>
          <div className="w-4 flex items-center justify-center">
            <div className="w-3 h-0.5 rounded-full bg-border" />
          </div>
          <span className="text-foreground flex-1 min-w-0 line-clamp-1 text-right">{job.dropoff_label || "Delivery"}</span>
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />
        </div>

        <div className="flex items-center gap-1 overflow-hidden">
          {DELIVERY_STATUSES.slice(0, 6).map((s, idx) => {
            const done = idx <= currentIdx;
            return (
              <div key={s.key} className="flex-1">
                <div className={cn("h-1 rounded-full transition-all", done ? "" : "bg-muted/30")}
                  style={done ? { background: "hsl(38 65% 56%)" } : undefined} />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg">{DELIVERY_STATUSES[currentIdx]?.icon || "📦"}</span>
          <span className="text-sm font-bold text-foreground">{DELIVERY_STATUSES[currentIdx]?.label || job.status.replace(/_/g, " ")}</span>
          {livePosition?.speed != null && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(38 65% 56% / 0.1)", color: "hsl(38 65% 56%)" }}>
              {livePosition.speed.toFixed(0)} km/h
            </span>
          )}
        </div>

        {job.rider_user_id && (
          <div className="flex gap-2 pt-1">
            <button onClick={handleCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
              style={{ background: "hsl(142 71% 45%)" }}>
              <Phone className="w-3.5 h-3.5 shrink-0" /> Call Rider
            </button>
            <button onClick={handleChat}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white active:scale-[0.97] transition-all"
              style={{ background: "hsl(220 40% 18%)" }}>
              <MessageCircle className="w-3.5 h-3.5 shrink-0" /> Chat
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MobilityDeliveryPage() {
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
    <div className="app-mobile-page bg-background">
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-border/30" style={{ background: "hsl(220 40% 18% / 0.95)" }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
            className="p-1.5 rounded-xl transition-colors" style={{ background: "hsl(0 0% 100% / 0.1)" }}>
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Bike className="h-5 w-5 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />
              <h1 className="text-lg font-bold text-white tracking-tight">Delivery</h1>
            </div>
          </div>
          {activeJobs.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full animate-pulse" style={{ background: "hsl(38 65% 56% / 0.15)" }}>
              <Package className="h-3 w-3" style={{ color: "hsl(38 65% 56%)" }} />
              <span className="text-xs font-bold" style={{ color: "hsl(38 65% 56%)" }}>{activeJobs.length}</span>
            </div>
          )}
        </div>

        <div className="px-4 pb-3">
          <button
            onClick={() => setAddressOpen(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors"
            style={{ background: "hsl(0 0% 100% / 0.08)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
          >
            <MapPin className="h-4 w-4 shrink-0" style={{ color: "hsl(38 65% 56%)" }} />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] leading-none" style={{ color: "hsl(0 0% 100% / 0.5)" }}>Deliver to</p>
              <p className="text-sm font-semibold leading-snug text-white line-clamp-1 mt-0.5">
                {station.label || "Set your delivery address"}
              </p>
            </div>
            <span className="text-xs font-semibold shrink-0" style={{ color: "hsl(38 65% 56%)" }}>Change</span>
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
                <Users className="w-4 h-4" style={{ color: "hsl(38 65% 56%)" }} />
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
                      style={{ background: "hsl(38 65% 56% / 0.1)", color: "hsl(38 65% 56%)" }}>
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
              <span className="shrink-0" style={{ color: "hsl(38 65% 56%)" }}>{b.icon}</span>
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
            style={{ borderColor: "hsl(38 65% 56% / 0.2)", background: "hsl(38 65% 56% / 0.05)" }}
          >
            <MapPin className="w-6 h-6 mx-auto" style={{ color: "hsl(38 65% 56%)" }} />
            <p className="text-sm font-semibold text-foreground">Location access needed</p>
            <p className="text-xs text-muted-foreground">Enable location or set an address to see nearby riders</p>
            <button onClick={() => setAddressOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "hsl(220 40% 18%)" }}>
              Set address manually
            </button>
          </motion.div>
        )}
      </div>

      <AddressSelectorSheet open={addressOpen} onOpenChange={setAddressOpen} contextType="global" />
    </div>
  );
}
