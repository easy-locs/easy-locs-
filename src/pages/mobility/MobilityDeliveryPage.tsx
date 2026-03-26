/**
 * MobilityDeliveryPage — /mobility/delivery — Careem-style Dispatch Hub.
 * Premium entry with live station context, animated hero, 5 delivery modes.
 */
import { useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, UtensilsCrossed, ShoppingCart, Send, Gift, Briefcase,
  Car, Users, Store, CloudRain, Sun, Cloud, Zap, ChevronRight,
  MapPin, Clock, Shield, Sparkles, TrendingUp, Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useArbitratedStation } from "@/hooks/useArbitratedStation";
import { cn } from "@/lib/utils";

const DELIVERY_MODES = [
  {
    id: "order",
    label: "Order Food & Grocery",
    description: "Restaurants, supermarkets, pharmacies",
    icon: UtensilsCrossed,
    route: "/food",
    emoji: "🍕",
    gradient: "from-orange-500/10 to-red-500/5",
    accent: "text-orange-500",
    etaKey: "food" as const,
  },
  {
    id: "bring",
    label: "Bring Me Something",
    description: "Pick up from any location",
    icon: ShoppingCart,
    route: "/mobility/delivery/bring",
    emoji: "📦",
    gradient: "from-blue-500/10 to-cyan-500/5",
    accent: "text-blue-500",
    etaKey: "parcel" as const,
  },
  {
    id: "parcel",
    label: "Send Parcel / Document",
    description: "Track, sign, OTP verification",
    icon: Send,
    route: "/mobility/delivery/parcel",
    emoji: "📄",
    gradient: "from-violet-500/10 to-purple-500/5",
    accent: "text-violet-500",
    etaKey: "parcel" as const,
  },
  {
    id: "gift",
    label: "Gift Someone",
    description: "Surprise with a personal message",
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
    description: "Tell us — we handle the rest",
    icon: Briefcase,
    route: "/mobility/delivery/errand",
    emoji: "✨",
    gradient: "from-emerald-500/10 to-teal-500/5",
    accent: "text-emerald-500",
    etaKey: "parcel" as const,
  },
];

const POPULAR_SUGGESTIONS = [
  { label: "Send documents", eta: "15 min", icon: "📄" },
  { label: "Grocery delivery", eta: "20 min", icon: "🛒" },
  { label: "Flowers delivery", eta: "25 min", icon: "💐" },
];

const WEATHER_ICON: Record<string, React.ReactNode> = {
  clear: <Sun className="w-3.5 h-3.5 text-amber-400" />,
  cloudy: <Cloud className="w-3.5 h-3.5 text-muted-foreground" />,
  rain: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
  storm: <CloudRain className="w-3.5 h-3.5 text-red-400" />,
};

export default function MobilityDeliveryPage() {
  const navigate = useNavigate();
  const { jobs, loading: jobsLoading, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const station = useArbitratedStation();

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

  const deliveryTypes = ["food_delivery", "grocery_delivery", "parcel_delivery", "errand"];
  const deliveryJobs = jobs.filter(j => deliveryTypes.includes(j.job_type));
  const activeJobs = deliveryJobs.filter(j => !["completed", "cancelled", "failed_no_rider", "expired"].includes(j.status));

  const riderCount = station.station?.rider_supply ?? 0;
  const avgEta = station.etas?.food ?? station.etas?.parcel ?? null;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Delivery</h1>
          </div>
          {activeJobs.length > 0 && (
            <Badge variant="default" className="animate-pulse gap-1">
              <Package className="h-3 w-3" /> {activeJobs.length} active
            </Badge>
          )}
        </div>

        {/* Address bar */}
        <div className="px-4 pb-3">
          <button
            onClick={() => navigate("/address")}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-border/20 bg-card/60 hover:bg-card transition-colors"
          >
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs text-muted-foreground">Delivering to</p>
              <p className="text-sm font-semibold text-foreground truncate">
                {station.label || "Set your delivery address"}
              </p>
            </div>
            <span className="text-xs text-primary font-semibold shrink-0">Change</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Live Station Context Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-card/80 backdrop-blur-md p-4 space-y-3"
        >
          {/* Top stats row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Users className="w-4 h-4 text-primary" />
                  {riderCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </div>
                <span className="text-sm font-bold text-foreground">{riderCount}</span>
                <span className="text-xs text-muted-foreground">riders</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">{avgEta ?? "—"}</span>
                <span className="text-xs text-muted-foreground">min avg</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {station.station && (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/40">
                    {WEATHER_ICON[station.station.weather_type ?? "clear"] ?? <Sun className="w-3.5 h-3.5" />}
                    <span className="text-[10px] text-foreground capitalize">{station.station.weather_type ?? "clear"}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/40">
                    <Car className={cn("w-3.5 h-3.5",
                      station.station.traffic_level === "heavy" || station.station.traffic_level === "severe"
                        ? "text-orange-400" : "text-emerald-400"
                    )} />
                    <span className="text-[10px] text-foreground capitalize">{station.station.traffic_level ?? "normal"}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ETA chips row */}
          <div className="flex gap-2 flex-wrap">
            {station.etas.taxi != null && (
              <EtaChip emoji="🚕" label="Taxi" eta={station.etas.taxi} />
            )}
            {station.etas.food != null && (
              <EtaChip emoji="🍽️" label="Food" eta={station.etas.food} />
            )}
            {station.etas.grocery != null && (
              <EtaChip emoji="🛒" label="Grocery" eta={station.etas.grocery} />
            )}
            {station.etas.parcel != null && (
              <EtaChip emoji="📦" label="Parcel" eta={station.etas.parcel} />
            )}
            {station.station && station.station.surge_multiplier > 1.05 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                <Zap className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-bold text-destructive">
                  {Math.round((station.station.surge_multiplier - 1) * 100)}% surge
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Active deliveries */}
        {activeJobs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Deliveries</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            {activeJobs.map(j => <CustomerJobCard key={j.id} job={j} />)}
          </motion.div>
        )}

        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center py-2"
        >
          <h2 className="text-xl font-bold text-foreground tracking-tight">Need something delivered?</h2>
          <p className="text-sm text-muted-foreground mt-1">Fast, safe, anywhere.</p>
        </motion.div>

        {/* Popular suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Popular right now</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {POPULAR_SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => navigate("/mobility/delivery/parcel")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/20 bg-card/60 whitespace-nowrap hover:border-primary/30 transition-all shrink-0"
              >
                <span>{s.icon}</span>
                <span className="text-xs font-medium text-foreground">{s.label}</span>
                <span className="text-[10px] text-muted-foreground">· {s.eta}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Delivery Mode Cards */}
        <div className="space-y-2.5">
          {DELIVERY_MODES.map((mode, i) => (
            <motion.button
              key={mode.id}
              onClick={() => navigate(mode.route)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border border-border/20",
                "bg-gradient-to-r text-left transition-all",
                "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                "active:scale-[0.98]",
                mode.gradient
              )}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-background/80 shadow-sm">
                {mode.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{mode.label}</p>
                  {station.etas[mode.etaKey] != null && (
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                      ~{station.etas[mode.etaKey]}min
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </motion.button>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-2 py-2"
        >
          {[
            { icon: <MapPin className="h-3.5 w-3.5" />, label: "Real-time tracking" },
            { icon: <Zap className="h-3.5 w-3.5" />, label: "Fast delivery" },
            { icon: <Shield className="h-3.5 w-3.5" />, label: "Verified riders" },
            { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Secure payments" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30">
              <span className="text-primary">{b.icon}</span>
              <span className="text-xs text-muted-foreground font-medium">{b.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Recent deliveries */}
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
                    <Badge variant="secondary" className="text-[9px]">Completed</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    📍 {j.pickup_label || j.pickup_address} → 🏁 {j.dropoff_label || j.dropoff_address}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EtaChip({ emoji, label, eta }: { emoji: string; label: string; eta: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/10">
      <span className="text-xs">{emoji}</span>
      <span className="text-[10px] font-semibold text-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">{eta}min</span>
    </div>
  );
}
