/**
 * MobilityDeliveryPage — /mobility/delivery — Dispatch orchestration hub.
 * Careem-style delivery mode selector, not a raw courier form.
 */
import { useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { CustomerJobCard } from "@/components/rides/CustomerJobCard";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Package, Clock, CheckCircle2,
  UtensilsCrossed, ShoppingCart, Send, Gift, Briefcase, Bike
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";

const DELIVERY_MODES = [
  {
    id: "order",
    label: "Order Food & Grocery",
    description: "Browse restaurants, supermarkets, pharmacies",
    icon: UtensilsCrossed,
    route: "/food",
    color: "hsl(var(--primary))",
    emoji: "🍕",
  },
  {
    id: "bring",
    label: "Bring Me Something",
    description: "Pick up from any location and deliver to you",
    icon: ShoppingCart,
    route: "/mobility/delivery/bring",
    color: "hsl(var(--accent))",
    emoji: "📦",
  },
  {
    id: "parcel",
    label: "Send Parcel / Document",
    description: "Ship items with tracking, signature, OTP",
    icon: Send,
    route: "/mobility/delivery/parcel",
    color: "hsl(142 76% 36%)",
    emoji: "📄",
  },
  {
    id: "gift",
    label: "Gift Someone",
    description: "Send a gift with a personal message",
    icon: Gift,
    route: "/mobility/delivery/gift",
    color: "hsl(330 81% 60%)",
    emoji: "🎁",
  },
  {
    id: "errand",
    label: "Custom Errand",
    description: "Describe a task — we'll handle the rest",
    icon: Briefcase,
    route: "/mobility/delivery/errand",
    color: "hsl(38 92% 50%)",
    emoji: "✨",
  },
];

export default function MobilityDeliveryPage() {
  const navigate = useNavigate();
  const { jobs, loading, hydrateMyJobs, refreshJob } = useCustomerMobilityStore();
  const { location } = useCurrentLocation();

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
              {location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Set your address to see delivery options"}
            </p>
          </div>
          {activeJobs.length > 0 && (
            <Badge variant="default" className="animate-pulse">{activeJobs.length} active</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
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
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${mode.color}15` }}
                >
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
        {deliveryJobs.filter(j => ["completed"].includes(j.status)).length > 0 && (
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
