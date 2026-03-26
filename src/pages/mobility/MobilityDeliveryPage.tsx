/**
 * MobilityDeliveryPage — Premium Delivery Hub with live station context,
 * animated hero, quick actions slider, smart suggestions, trending section.
 */
import { useEffect, useMemo } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, UtensilsCrossed, ShoppingCart, Send, Gift, Briefcase,
  Car, Users, CloudRain, Sun, Cloud, Zap, ChevronRight,
  MapPin, Clock, Shield, Sparkles, TrendingUp, Package,
  Navigation, AlertTriangle, CloudLightning, Bike,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useArbitratedStation } from "@/hooks/useArbitratedStation";
import { useLocationStore } from "@/stores/locationStore";
import { cn } from "@/lib/utils";

/* ═══ Quick Actions — horizontal scroll ═══ */
const QUICK_ACTIONS = [
  { id: "doc", emoji: "📄", label: "Send document", etaKey: "parcel" as const, route: "/mobility/delivery/parcel" },
  { id: "grocery", emoji: "🛒", label: "Grocery", etaKey: "grocery" as const, route: "/grocery" },
  { id: "food", emoji: "🍕", label: "Order food", etaKey: "food" as const, route: "/food" },
  { id: "gift", emoji: "🎁", label: "Gift", etaKey: "parcel" as const, route: "/mobility/delivery/gift" },
  { id: "express", emoji: "⚡", label: "Express", etaKey: "parcel" as const, route: "/mobility/delivery/bring" },
];

/* ═══ Main Mode Cards ═══ */
const DELIVERY_MODES = [
  {
    id: "order", label: "Order Food & Grocery",
    description: "Restaurants, supermarkets, pharmacies",
    icon: UtensilsCrossed, route: "/food", emoji: "🍕",
    gradient: "from-orange-500/10 to-red-500/5",
    accent: "text-orange-500", etaKey: "food" as const,
    stat: (s: any) => s.station?.merchant_deliverable_count ? `${s.station.merchant_deliverable_count} restaurants` : null,
  },
  {
    id: "bring", label: "Bring Me Something",
    description: "Pick up from any location",
    icon: ShoppingCart, route: "/mobility/delivery/bring", emoji: "📦",
    gradient: "from-blue-500/10 to-cyan-500/5",
    accent: "text-blue-500", etaKey: "parcel" as const,
    stat: (s: any) => s.riderCount > 0 ? "rider available now" : null,
  },
  {
    id: "parcel", label: "Send Parcel / Document",
    description: "Track, sign, OTP verification",
    icon: Send, route: "/mobility/delivery/parcel", emoji: "📄",
    gradient: "from-violet-500/10 to-purple-500/5",
    accent: "text-violet-500", etaKey: "parcel" as const,
    stat: () => null,
  },
  {
    id: "gift", label: "Gift Someone",
    description: "Surprise with a personal message",
    icon: Gift, route: "/mobility/delivery/gift", emoji: "🎁",
    gradient: "from-pink-500/10 to-rose-500/5",
    accent: "text-pink-500", etaKey: "parcel" as const,
    stat: () => null,
  },
  {
    id: "errand", label: "Custom Errand",
    description: "Tell us — we handle the rest",
    icon: Briefcase, route: "/mobility/delivery/errand", emoji: "✨",
    gradient: "from-emerald-500/10 to-teal-500/5",
    accent: "text-emerald-500", etaKey: "parcel" as const,
    stat: () => null,
  },
];

const WEATHER_ICON: Record<string, React.ReactNode> = {
  clear: <Sun className="w-3.5 h-3.5 text-amber-400" />,
  cloudy: <Cloud className="w-3.5 h-3.5 text-muted-foreground" />,
  rain: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
  storm: <CloudLightning className="w-3.5 h-3.5 text-red-400" />,
};

export default function MobilityDeliveryPage() {
  const navigate = useNavigate();
  const { jobs, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const station = useArbitratedStation();
  const permissionState = useLocationStore((s) => s.permissionState);
  const currentLocation = useLocationStore((s) => s.currentLocation);

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

  const riderCount = station.riderCount;
  const avgEta = station.etas?.food ?? station.etas?.parcel ?? null;
  const demandDecision = station.arbitration?.decisions?.find((d: any) => d.module === "demand");
  const isHighDemand = demandDecision && (demandDecision as any).multiplier > 1.2;
  const hasLocation = !!currentLocation || !!station.label;

  // Smart suggestions based on time/weather/demand
  const smartSuggestions = useMemo(() => {
    const hour = new Date().getHours();
    const suggestions: { label: string; reason: string; emoji: string; route: string }[] = [];

    if (hour >= 11 && hour <= 14) suggestions.push({ label: "Lunch delivery", reason: "Peak time", emoji: "🍱", route: "/food" });
    if (hour >= 18 && hour <= 21) suggestions.push({ label: "Dinner delivery", reason: "Evening rush", emoji: "🍽️", route: "/food" });
    if (station.weatherType === "rain" || station.weatherType === "storm") {
      suggestions.push({ label: "Rain fast delivery", reason: "Stay dry", emoji: "☔", route: "/mobility/delivery/bring" });
    }
    if (station.trafficLevel === "low" || station.trafficLevel === "free") {
      suggestions.push({ label: "Low traffic express", reason: "Fast routes", emoji: "🚀", route: "/mobility/delivery/bring" });
    }
    if (isHighDemand) {
      suggestions.push({ label: "Express pickup", reason: "High demand", emoji: "⚡", route: "/mobility/delivery/bring" });
    }
    suggestions.push({ label: "Document delivery", reason: "Urgent", emoji: "📋", route: "/mobility/delivery/parcel" });
    return suggestions.slice(0, 4);
  }, [station.weatherType, station.trafficLevel, isHighDemand]);

  // Trending based on demand
  const trending = useMemo(() => {
    const items = [
      { label: "Shawarma combo", tag: "fast", emoji: "🌯" },
      { label: "Grocery express", tag: "popular", emoji: "🛒" },
      { label: "Document delivery", tag: "urgent", emoji: "📄" },
    ];
    if (station.weatherType === "rain") items.unshift({ label: "Hot soup delivery", tag: "weather", emoji: "🍜" });
    return items.slice(0, 4);
  }, [station.weatherType]);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ══ Sticky Header ══ */}
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
        {/* ══ 1. HERO LIVE BLOCK ══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            "rounded-2xl border border-border/20 backdrop-blur-md p-4 space-y-3 relative overflow-hidden",
            isHighDemand
              ? "bg-gradient-to-br from-orange-500/5 via-card to-red-500/5"
              : "bg-gradient-to-br from-card to-card/80"
          )}
        >
          {/* Animated gradient sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/3 to-transparent animate-pulse pointer-events-none" />

          {/* Demand badge */}
          {isHighDemand && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">🔥 High demand</span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Bike className="w-4 h-4 text-primary" />
                  {riderCount > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
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
              {station.weatherType && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/40">
                  {WEATHER_ICON[station.weatherType] ?? <Sun className="w-3.5 h-3.5" />}
                  <span className="text-[10px] text-foreground capitalize">{station.weatherType}</span>
                </div>
              )}
              {station.trafficLevel && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/40">
                  <Car className={cn("w-3.5 h-3.5",
                    station.trafficLevel === "heavy" || station.trafficLevel === "severe" ? "text-orange-400" : "text-emerald-400"
                  )} />
                  <span className="text-[10px] text-foreground capitalize">{station.trafficLevel}</span>
                </div>
              )}
            </div>
          </div>

          {/* ETA chips */}
          <div className="flex gap-2 flex-wrap relative z-10">
            {station.etas.taxi != null && <EtaChip emoji="🚕" label="Taxi" eta={station.etas.taxi} />}
            {station.etas.food != null && <EtaChip emoji="🍽️" label="Food" eta={station.etas.food} />}
            {station.etas.grocery != null && <EtaChip emoji="🛒" label="Grocery" eta={station.etas.grocery} />}
            {station.etas.parcel != null && <EtaChip emoji="📦" label="Parcel" eta={station.etas.parcel} />}
            {station.surge > 1.05 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                <Zap className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-bold text-destructive">{Math.round((station.surge - 1) * 100)}% surge</span>
              </div>
            )}
          </div>

          {/* Safety warnings */}
          {station.warnings.length > 0 && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-destructive/5 border border-destructive/10 relative z-10">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-[10px] text-destructive">{station.warnings[0]}</p>
            </div>
          )}
        </motion.div>

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

        {/* ══ 2. QUICK ACTION SLIDER ══ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {QUICK_ACTIONS.map((a, i) => (
              <motion.button
                key={a.id}
                onClick={() => navigate(a.route)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.03 }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-border/20 bg-card/60 hover:border-primary/30 hover:shadow-md transition-all shrink-0 min-w-[76px] active:scale-95"
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">{a.label}</span>
                {station.etas[a.etaKey] != null && (
                  <span className="text-[9px] text-primary font-bold">{station.etas[a.etaKey]} min</span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ══ 3. MAIN DELIVERY MODE CARDS ══ */}
        <div className="space-y-2.5">
          {DELIVERY_MODES.map((mode, i) => {
            const extraStat = mode.stat(station);
            return (
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
                transition={{ delay: 0.15 + i * 0.04 }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 bg-background/80 shadow-sm">
                  {mode.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{mode.label}</p>
                    {station.etas[mode.etaKey] != null && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {station.etas[mode.etaKey]}min
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                  {extraStat && (
                    <p className="text-[10px] text-primary/70 mt-0.5 font-medium">• {extraStat}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* ══ 4. SMART SUGGESTIONS ══ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recommended for you</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {smartSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => navigate(s.route)}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-border/20 bg-card/60 hover:border-primary/20 transition-all text-left active:scale-[0.97]"
              >
                <span className="text-lg">{s.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{s.label}</p>
                  <p className="text-[9px] text-muted-foreground">{s.reason}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ══ 5. TRENDING SECTION ══ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trending in your area</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {trending.map((t, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/20 bg-card/60 whitespace-nowrap shrink-0">
                <span>{t.emoji}</span>
                <span className="text-xs font-medium text-foreground">{t.label}</span>
                <span className="text-[9px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">{t.tag}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ══ 6. TRUST BLOCK ══ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="grid grid-cols-2 gap-2 py-2">
          {[
            { icon: <Navigation className="h-3.5 w-3.5" />, label: "Real-time tracking" },
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
                    <Badge variant="secondary" className="text-[9px]">Completed</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    📍 {j.pickup_label || j.pickup_address} → 🏁 {j.dropoff_label || j.dropoff_address}
                  </p>
                </div>
              ))}
          </div>
        )}

        {/* Location permission prompt */}
        {permissionState === "denied" && !station.label && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-center space-y-2"
          >
            <MapPin className="w-6 h-6 text-orange-500 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Location access needed</p>
            <p className="text-xs text-muted-foreground">Enable location or select an address to see nearby options</p>
            <button
              onClick={() => navigate("/address")}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
            >
              Set address manually
            </button>
          </motion.div>
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
      <span className="text-[10px] text-primary font-bold">{eta}min</span>
    </div>
  );
}
