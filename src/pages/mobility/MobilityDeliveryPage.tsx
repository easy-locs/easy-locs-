/**
 * MobilityDeliveryPage — /mobility/delivery — Dispatch orchestration hub.
 * Careem-style delivery mode selector with live station context.
 */
import { useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, UtensilsCrossed, ShoppingCart, Send, Gift, Briefcase, Bike,
  Car, Users, Store, CloudRain, Sun, Cloud, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useGeoLiveStation } from "@/hooks/useGeoLiveStation";
import { cn } from "@/lib/utils";

const DELIVERY_MODES = [
  {
    id: "order",
    label: "Order Food & Grocery",
    description: "Browse restaurants, supermarkets, pharmacies",
    icon: UtensilsCrossed,
    route: "/food",
    emoji: "🍕",
  },
  {
    id: "bring",
    label: "Bring Me Something",
    description: "Pick up from any location and deliver to you",
    icon: ShoppingCart,
    route: "/mobility/delivery/bring",
    emoji: "📦",
  },
  {
    id: "parcel",
    label: "Send Parcel / Document",
    description: "Ship items with tracking, signature, OTP",
    icon: Send,
    route: "/mobility/delivery/parcel",
    emoji: "📄",
  },
  {
    id: "gift",
    label: "Gift Someone",
    description: "Send a gift with a personal message",
    icon: Gift,
    route: "/mobility/delivery/gift",
    emoji: "🎁",
  },
  {
    id: "errand",
    label: "Custom Errand",
    description: "Describe a task — we'll handle the rest",
    icon: Briefcase,
    route: "/mobility/delivery/errand",
    emoji: "✨",
  },
];

const WEATHER_ICON: Record<string, React.ReactNode> = {
  clear: <Sun className="w-3 h-3 text-amber-400" />,
  cloudy: <Cloud className="w-3 h-3 text-muted-foreground" />,
  rain: <CloudRain className="w-3 h-3 text-blue-400" />,
  storm: <CloudRain className="w-3 h-3 text-red-400" />,
};

export default function MobilityDeliveryPage() {
  const navigate = useNavigate();
  const { jobs, loading: jobsLoading, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const { location } = useCurrentLocation();
  const station = useGeoLiveStation();

  useEffect(() => { hydrateMyJobs(); }, []);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ch = supabase
        .channel(`delivery-jobs:${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs", filter: `customer_user_id=eq.${user.id}` }, (payload: any) => {
          if (payload.new?.id) refreshJob(payload.new.id);
        })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    };
    const cleanup = setup();
    return () => { cleanup.then(fn => fn?.()); };
  }, []);

  const deliveryTypes = ["food_delivery", "grocery_delivery", "parcel_delivery"];
  const deliveryJobs = jobs.filter(j => deliveryTypes.includes(j.job_type));
  const activeJobs = deliveryJobs.filter(j => !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status));

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Delivery</h1>
            <p className="text-xs text-muted-foreground">
              {station.label
                ? `📍 ${station.label}`
                : location
                  ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                  : "Set your address to see delivery options"}
            </p>
          </div>
          {activeJobs.length > 0 && (
            <Badge variant="default" className="animate-pulse">{activeJobs.length} active</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Live Station Context */}
        {station.station && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/20 bg-card/90 backdrop-blur-md p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Live Zone</span>
              {station.zoneKey && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {station.zoneKey}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="flex items-center gap-1">
                <Car className={cn("w-3 h-3",
                  station.station.traffic_level === "heavy" || station.station.traffic_level === "severe"
                    ? "text-orange-400" : "text-emerald-400"
                )} />
                <span className="text-[10px] text-foreground capitalize">{station.station.traffic_level ?? "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                {WEATHER_ICON[station.station.weather_type ?? "clear"] ?? <Sun className="w-3 h-3 text-muted-foreground" />}
                <span className="text-[10px] text-foreground capitalize">{station.station.weather_type ?? "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] text-foreground">{station.station.rider_supply} riders</span>
              </div>
              <div className="flex items-center gap-1">
                <Store className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] text-foreground">{station.station.merchant_deliverable_count} open</span>
              </div>
            </div>
            {/* ETA chips */}
            <div className="flex gap-2 mt-2 pt-2 border-t border-border/10">
              {station.etas.taxi != null && (
                <span className="text-[10px] font-semibold text-foreground">🚕 {station.etas.taxi}min</span>
              )}
              {station.etas.food != null && (
                <span className="text-[10px] font-semibold text-foreground">🍽️ {station.etas.food}min</span>
              )}
              {station.etas.grocery != null && (
                <span className="text-[10px] font-semibold text-foreground">🛒 {station.etas.grocery}min</span>
              )}
              {station.etas.parcel != null && (
                <span className="text-[10px] font-semibold text-foreground">📦 {station.etas.parcel}min</span>
              )}
              {station.station.surge_multiplier > 1.05 && (
                <span className="text-[10px] font-bold text-destructive flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5" />
                  {Math.round((station.station.surge_multiplier - 1) * 100)}% surge
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Active deliveries banner */}
        {activeJobs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Deliveries</p>
            {activeJobs.map(j => <CustomerJobCard key={j.id} job={j} />)}
          </div>
        )}

        {/* Delivery mode cards */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">What do you need?</p>
          <div className="grid gap-3">
            {DELIVERY_MODES.map((mode, i) => (
              <motion.button
                key={mode.id}
                onClick={() => navigate(mode.route)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/30 bg-card text-left transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 bg-primary/5">
                  {mode.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{mode.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                </div>
                <Bike className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Recent deliveries */}
        {deliveryJobs.filter(j => j.status === "completed").length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent</p>
            {deliveryJobs
              .filter(j => j.status === "completed")
              .slice(0, 5)
              .map(j => (
                <div key={j.id} className="bg-card border border-border/30 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground capitalize">{j.job_type.replace(/_/g, " ")}</span>
                    <Badge variant="secondary" className="text-[9px]">{j.status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">📍 {j.pickup_label || j.pickup_address} → 🏁 {j.dropoff_label || j.dropoff_address}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
