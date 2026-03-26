/**
 * RiderLivePage — /rider/live — RIDER ONLY workspace.
 * Premium Uber/Careem-grade rider interface.
 * Online/offline toggle, live offers, active missions, earnings, station context.
 */
import { useEffect, useState } from "react";
import { useDriverMissions, type DeliveryJob } from "@/hooks/useDriverMissions";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Power, Package, MapPin, Check, X, Clock,
  DollarSign, TrendingUp, Bike, Car, Users, Zap,
  CloudRain, Sun, Cloud, Navigation, Phone, MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const WEATHER_ICON: Record<string, React.ReactNode> = {
  clear: <Sun className="w-3.5 h-3.5 text-amber-400" />,
  cloudy: <Cloud className="w-3.5 h-3.5 text-muted-foreground" />,
  rain: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
  storm: <CloudRain className="w-3.5 h-3.5 text-red-400" />,
};

const STATUS_FLOW: Record<string, { next: string; label: string; emoji: string }> = {
  accepted: { next: "rider_arriving_pickup", label: "Navigate to Pickup", emoji: "🧭" },
  rider_arriving_pickup: { next: "rider_arrived_pickup", label: "Arrived at Pickup", emoji: "📍" },
  rider_arrived_pickup: { next: "picked_up", label: "Confirm Pickup", emoji: "📦" },
  picked_up: { next: "rider_arriving_dropoff", label: "Navigate to Dropoff", emoji: "🚀" },
  rider_arriving_dropoff: { next: "completed", label: "Complete Delivery", emoji: "✅" },
  in_progress: { next: "completed", label: "Complete Delivery", emoji: "✅" },
};

export default function RiderLivePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeMissions, completedMissions, stats, loading, updateStatus, confirmDelivery } = useDriverMissions();
  const offers = useRiderDispatchStore(s => s.offers);
  const hydrateOffers = useRiderDispatchStore(s => s.hydrateOffers);
  const acceptOffer = useRiderDispatchStore(s => s.acceptOffer);
  const rejectOffer = useRiderDispatchStore(s => s.rejectOffer);
  const { arbitration: station } = usePlatformBrain();

  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => { hydrateOffers(); }, []);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any).from("rider_presence").select("is_online").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => { if (data) setIsOnline(data.is_online); });
  }, [user?.id]);

  const toggleOnline = async () => {
    if (!user?.id) return;
    const newStatus = !isOnline;
    await (supabase as any).from("rider_presence").upsert({
      user_id: user.id,
      is_online: newStatus,
      is_available: newStatus,
      current_status: newStatus ? "online" : "offline",
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setIsOnline(newStatus);
    toast.success(newStatus ? "You're online! 🟢" : "You're offline");
  };

  const handleAdvanceStatus = async (mission: DeliveryJob) => {
    const flow = STATUS_FLOW[mission.status];
    if (!flow) return;
    try {
      if (flow.next === "completed") {
        await confirmDelivery(mission.id);
      } else {
        await updateStatus(mission.id, flow.next);
      }
      toast.success(`${flow.emoji} ${flow.label}`);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  const todayEarnings = completedMissions
    .filter(m => m.status === "completed" && m.completed_at && new Date(m.completed_at).toDateString() === new Date().toDateString())
    .reduce((sum, m) => sum + (m.current_price || m.quoted_price || 0), 0);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Rider Hub</h1>
            <p className="text-xs text-muted-foreground">
              {station.label ? `📍 ${station.label}` : "Your delivery zone"}
            </p>
          </div>
          <motion.button
            onClick={toggleOnline}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              isOnline
                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shadow-sm shadow-emerald-500/10"
                : "bg-muted text-muted-foreground border border-border"
            )}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <Power className="h-4 w-4" />
              {isOnline && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
            </div>
            {isOnline ? "Online" : "Offline"}
          </motion.button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-2">
          <StatCard value={stats.active} label="Active" accent="text-primary" />
          <StatCard value={stats.completed} label="Done" accent="text-emerald-500" />
          <StatCard value={`${todayEarnings.toFixed(0)}`} label="Today" accent="text-amber-500" icon={<DollarSign className="w-3 h-3" />} />
          <StatCard value={`${stats.totalEarnings.toFixed(0)}`} label="Total" accent="text-foreground" icon={<TrendingUp className="w-3 h-3" />} />
        </motion.div>

        {/* Station context */}
        {station.zoneKey && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/20 bg-card/60 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Zone Intelligence</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{station.zoneKey}</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs text-foreground">{station.riderCount} riders</span>
              </div>
              <div className="flex items-center gap-1">
                {WEATHER_ICON[station.weatherType ?? "clear"]}
                <span className="text-xs text-foreground capitalize">{station.weatherType ?? "clear"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Car className={cn("w-3.5 h-3.5", station.trafficLevel === "heavy" ? "text-orange-400" : "text-emerald-400")} />
                <span className="text-xs text-foreground capitalize">{station.trafficLevel ?? "normal"}</span>
              </div>
              {station.surge > 1.05 && (
                <div className="flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full bg-destructive/10">
                  <Zap className="w-3 h-3 text-destructive" />
                  <span className="text-[10px] font-bold text-destructive">
                    +{Math.round((station.surge - 1) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Incoming Offers */}
        <AnimatePresence>
          {offers.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">🔔 New Offers</span>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
              {offers.map(offer => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground capitalize">
                        {offer.job?.job_type?.replace(/_/g, " ") ?? "Delivery"}
                      </span>
                    </div>
                    {offer.job?.current_price != null && (
                      <span className="text-sm font-bold text-primary">
                        {offer.job.currency ?? "AED"} {offer.job.current_price}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      {offer.job?.pickup_address || offer.job?.pickup_label || "Pickup"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Navigation className="w-3 h-3 text-primary" />
                      {offer.job?.dropoff_address || offer.job?.dropoff_label || "Dropoff"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-10 text-sm font-bold gap-1.5 bg-primary hover:bg-primary/90"
                      onClick={() => acceptOffer(offer.id).catch((e: any) => toast.error(e.message))}
                    >
                      <Check className="h-4 w-4" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 px-4 text-sm text-destructive border-destructive/30"
                      onClick={() => rejectOffer(offer.id).catch((e: any) => toast.error(e.message))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Missions */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Active Missions</h2>
          {loading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-28 bg-muted/30 rounded-2xl animate-pulse" />)}</div>
          ) : activeMissions.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Bike className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {isOnline ? "Waiting for missions..." : "Go online to receive missions"}
              </p>
            </motion.div>
          ) : activeMissions.map((m, i) => {
            const flow = STATUS_FLOW[m.status];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border/20 bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground capitalize">{m.job_type.replace(/_/g, " ")}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold">{m.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{m.pickup_address || "Pickup"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{m.dropoff_address || "Dropoff"}</span>
                  </p>
                </div>
                {m.current_price != null && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm font-bold text-foreground">{m.current_price} {m.currency}</span>
                  </div>
                )}
                {flow && (
                  <Button
                    className="w-full h-10 font-bold text-sm gap-1.5"
                    onClick={() => handleAdvanceStatus(m)}
                  >
                    {flow.emoji} {flow.label}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Recent History */}
        {completedMissions.length > 0 && (
          <div className="space-y-2 pt-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent History</h2>
            {completedMissions.slice(0, 8).map(m => (
              <div key={m.id} className="bg-card border border-border/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground capitalize">{m.job_type.replace(/_/g, " ")}</p>
                  <p className="text-[10px] text-muted-foreground">{m.completed_at ? new Date(m.completed_at).toLocaleDateString() : "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.current_price != null && (
                    <span className="text-xs font-bold text-foreground">{m.current_price} {m.currency}</span>
                  )}
                  <Badge variant={m.status === "completed" ? "default" : "secondary"} className="text-[9px]">{m.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, accent, icon }: { value: string | number; label: string; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/20 rounded-xl p-3 text-center">
      <div className={cn("flex items-center justify-center gap-0.5", accent)}>
        {icon}
        <p className="text-lg font-bold">{value}</p>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
