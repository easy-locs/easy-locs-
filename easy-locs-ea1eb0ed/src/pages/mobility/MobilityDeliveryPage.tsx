/**
 * MobilityDeliveryPage — Hire a Rider hub.
 * Focused on dispatching a rider for any delivery need.
 * No duplicated sections — clean hierarchy.
 */
import { useEffect, useMemo, useState, Component, type ReactNode } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import * as repo from "@/repositories/mobility.repository";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";
import {
  ArrowLeft, Send, Gift, Briefcase, ShoppingCart,
  MapPin, Clock, Shield, ChevronRight, Package,
  Navigation, Zap, Bike, Users,
} from "lucide-react";
import { MobilityLiveMap } from "@/components/mobility/MobilityLiveMap";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { cn } from "@/lib/utils";

class MapSafeBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-border/15 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 p-6 flex flex-col items-center gap-2 text-center">
          <MapPin className="w-6 h-6 text-primary/60" />
          <p className="text-xs font-bold text-foreground">Live Map</p>
          <p className="text-[10px] text-muted-foreground">Riders are being tracked in your area</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const RIDER_SERVICES = [
  {
    id: "bring",
    label: "Bring Me Something",
    description: "Pick up from any location and deliver to you",
    icon: ShoppingCart,
    route: "/mobility/delivery/bring",
    emoji: "📦",
    gradient: "from-blue-500/10 to-cyan-500/5",
    accent: "text-blue-500",
    etaKey: "parcel" as const,
  },
  {
    id: "parcel",
    label: "Send a Parcel",
    description: "Documents, packages — tracked with OTP",
    icon: Send,
    route: "/mobility/delivery/parcel",
    emoji: "📄",
    gradient: "from-violet-500/10 to-purple-500/5",
    accent: "text-violet-500",
    etaKey: "parcel" as const,
  },
  {
    id: "gift",
    label: "Gift Delivery",
    description: "Surprise someone with a personal touch",
    icon: Gift,
    route: "/mobility/delivery/gift",
    emoji: "🎁",
    gradient: "from-pink-500/10 to-rose-500/5",
    accent: "text-pink-500",
    etaKey: "parcel" as const,
  },
  {
    id: "errand",
    label: "Custom Errand",
    description: "Tell us what you need — we handle the rest",
    icon: Briefcase,
    route: "/mobility/delivery/errand",
    emoji: "✨",
    gradient: "from-emerald-500/10 to-teal-500/5",
    accent: "text-emerald-500",
    etaKey: "parcel" as const,
  },
];

export default function MobilityDeliveryPage() {
  const navigate = useNavigate();
  const [addressOpen, setAddressOpen] = useState(false);
  const { jobs, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const brain = usePlatformBrain();
  const station = brain.arbitration;
  const currentLocation = brain.geo.selectedLocation;
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
  const riderCount = station.riderCount;
  const avgEta = station.etas?.parcel ?? station.etas?.food ?? null;

  return (
    <div className="app-mobile-page bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-primary shrink-0" />
              <h1 className="text-lg font-bold text-foreground tracking-tight">Hire a Rider</h1>
            </div>
          </div>
          {activeJobs.length > 0 && (
            <Badge variant="default" className="animate-pulse gap-1">
              <Package className="h-3 w-3" /> {activeJobs.length}
            </Badge>
          )}
        </div>

        <div className="px-4 pb-3">
          <button
            onClick={() => setAddressOpen(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-border/20 bg-card/60 hover:bg-card transition-colors"
          >
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] text-muted-foreground leading-none">Deliver to</p>
              <p className="text-sm font-semibold leading-snug text-foreground line-clamp-1 mt-0.5">
                {station.label || "Set your delivery address"}
              </p>
            </div>
            <span className="text-xs text-primary font-semibold shrink-0">Change</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5 app-mobile-content">

        {/* ══ Live Status Bar ══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-2xl border border-border/20 bg-card/60 px-4 py-3"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Users className="w-4 h-4 text-primary" />
                {riderCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
              </div>
              <span className="text-sm font-bold text-foreground">{riderCount}</span>
              <span className="text-xs text-muted-foreground">riders nearby</span>
            </div>
            {avgEta != null && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">{avgEta}</span>
                <span className="text-xs text-muted-foreground">min avg</span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">LIVE</span>
        </motion.div>

        {/* ══ Live Map ══ */}
        <MapSafeBoundary>
          <MobilityLiveMap mode="delivery" nearbyRiders={riderCount > 0 ? riderCount : 3} />
        </MapSafeBoundary>

        {/* ══ Active Deliveries ══ */}
        {activeJobs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Deliveries</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            {activeJobs.map(j => <CustomerJobCard key={j.id} job={j} />)}
          </motion.div>
        )}

        {/* ══ Rider Services ══ */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">What do you need?</p>
          {RIDER_SERVICES.map((svc, i) => (
            <motion.button
              key={svc.id}
              onClick={() => navigate(svc.route)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border border-border/20",
                "bg-gradient-to-r text-left transition-all",
                "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                "active:scale-[0.98]",
                svc.gradient
              )}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-background/80 shadow-sm">
                {svc.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold leading-snug text-foreground">{svc.label}</p>
                  {station.etas[svc.etaKey] != null && (
                    <span className="shrink-0 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
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

        {/* ══ Trust Badges ══ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="grid grid-cols-2 gap-2 py-1">
          {[
            { icon: <Navigation className="h-3.5 w-3.5" />, label: "Real-time tracking" },
            { icon: <Zap className="h-3.5 w-3.5" />, label: "Fast pickup" },
            { icon: <Shield className="h-3.5 w-3.5" />, label: "Verified riders" },
            { icon: <Package className="h-3.5 w-3.5" />, label: "Insured parcels" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30">
              <span className="text-primary shrink-0">{b.icon}</span>
              <span className="text-[11px] text-muted-foreground font-medium leading-snug">{b.label}</span>
            </div>
          ))}
        </motion.div>

        {/* ══ Recent Deliveries ══ */}
        {deliveryJobs.filter(j => j.status === "completed").length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent</p>
            {deliveryJobs
              .filter(j => j.status === "completed")
              .slice(0, 3)
              .map(j => (
                <div key={j.id} className="bg-card border border-border/20 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground capitalize">{j.job_type.replace(/_/g, " ")}</span>
                    <Badge variant="secondary" className="text-[10px]">Completed</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {j.pickup_label || j.pickup_address} → {j.dropoff_label || j.dropoff_address}
                  </p>
                </div>
              ))}
          </div>
        )}

        {/* ══ Location prompt ══ */}
        {permissionState === "denied" && !station.label && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-center space-y-2"
          >
            <MapPin className="w-6 h-6 text-orange-500 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Location access needed</p>
            <p className="text-xs text-muted-foreground">Enable location or select an address to see nearby riders</p>
            <button
              onClick={() => setAddressOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
            >
              Set address manually
            </button>
          </motion.div>
        )}
      </div>

      <AddressSelectorSheet open={addressOpen} onOpenChange={setAddressOpen} contextType="global" />
    </div>
  );
}
