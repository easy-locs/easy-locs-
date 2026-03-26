/**
 * DriverDashboard — Canonical driver dashboard.
 * Uses useDriverMissions (mobility_jobs) + rider_presence for online status.
 */
import { useState, useEffect } from "react";
import DeliveryHeatmapPanel from "@/components/delivery/DeliveryHeatmapPanel";
import DriverStatusQuickCard from "@/components/driver/DriverStatusQuickCard";
import DriverPositioningCard from "@/components/driver/DriverPositioningCard";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { motion, AnimatePresence } from "framer-motion";
import {
  Power, Navigation, Package, Clock, CheckCircle2,
  XCircle, MapPin, ChevronRight, TrendingUp, Star,
  Truck, AlertCircle,
} from "lucide-react";
import { useDriverMissions, type DeliveryJob } from "@/hooks/useDriverMissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  assigned: { label: "Nouvelle mission", emoji: "📩", color: "hsl(var(--warning))" },
  accepted: { label: "Acceptée", emoji: "✅", color: "hsl(var(--info))" },
  in_progress: { label: "En cours", emoji: "🚗", color: "hsl(var(--accent))" },
  completed: { label: "Terminée", emoji: "🏁", color: "hsl(var(--primary))" },
  cancelled: { label: "Annulée", emoji: "❌", color: "hsl(var(--destructive))" },
};

function MissionCard({ mission, onAccept, onPickup, onDeliver, onCancel }: {
  mission: DeliveryJob;
  onAccept: () => void;
  onPickup: () => void;
  onDeliver: () => void;
  onCancel: () => void;
}) {
  const cfg = STATUS_CONFIG[mission.status] || STATUS_CONFIG.assigned;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div layout className="rounded-xl overflow-hidden bg-card border border-border/30">
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => { setExpanded(!expanded); haptic("light"); }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted">
          <span className="text-lg">{cfg.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{mission.package_description || "Mission"}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground truncate">{mission.dropoff_address || "—"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {mission.delivery_fee != null && (
            <span className="text-xs font-bold text-primary">{mission.delivery_fee.toFixed(2)} {mission.currency || "AED"}</span>
          )}
          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/30 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px]">📦</span>
                  <div><p className="text-[10px] font-semibold text-muted-foreground">Retrait</p><p className="text-xs text-foreground">{mission.pickup_address || "—"}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[10px]">📍</span>
                  <div><p className="text-[10px] font-semibold text-muted-foreground">Livraison</p><p className="text-xs text-foreground">{mission.dropoff_address || "—"}</p></div>
                </div>
              </div>
              <div className="flex gap-2">
                {mission.status === "assigned" && (
                  <>
                    <Button size="sm" className="flex-1 text-xs h-9" onClick={onAccept}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accepter</Button>
                    <Button size="sm" variant="outline" className="text-xs h-9 text-destructive" onClick={onCancel}><XCircle className="h-3.5 w-3.5" /></Button>
                  </>
                )}
                {mission.status === "accepted" && (
                  <Button size="sm" className="flex-1 text-xs h-9" onClick={onPickup}><Package className="h-3.5 w-3.5 mr-1" /> Colis récupéré</Button>
                )}
                {mission.status === "in_progress" && (
                  <Button size="sm" className="flex-1 text-xs h-9" onClick={onDeliver}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Livré</Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const { activeMissions, completedMissions, stats, loading: missionsLoading, acceptMission, updateStatus, confirmDelivery } = useDriverMissions();
  const [tab, setTab] = useState<"active" | "history" | "heatmap">("active");
  const [isOnline, setIsOnline] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any).from("rider_presence").select("is_online").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => { setIsOnline(data?.is_online ?? false); setSessionLoading(false); });
  }, [user?.id]);

  const handleToggleOnline = async () => {
    if (!user?.id) return;
    haptic("medium");
    const newStatus = !isOnline;
    await (supabase as any).from("rider_presence").upsert({
      user_id: user.id, is_online: newStatus, is_available: newStatus,
      current_status: newStatus ? "online" : "offline", last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setIsOnline(newStatus);
    toast.success(newStatus ? "Vous êtes en ligne !" : "Vous êtes hors ligne");
  };

  const loading = sessionLoading || missionsLoading;

  return (
    <div className="app-mobile-page pb-20 bg-background">
      <MobilePageHeader title="Driver Hub" backTo="/dashboard" />
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] text-muted-foreground">Manage your missions</p>
          <motion.button whileTap={{ scale: 0.92 }} onClick={handleToggleOnline}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all border ${
              isOnline ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"
            }`}>
            <Power className="h-4 w-4" />
            {isOnline ? "Online" : "Offline"}
          </motion.button>
        </div>

        <div className="space-y-2 mb-3">
          <DriverStatusQuickCard />
          <DriverPositioningCard driverId={user?.id ?? undefined} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Missions", value: stats.completed, icon: CheckCircle2 },
            { label: "Revenus", value: `${stats.totalEarnings.toFixed(0)}`, icon: TrendingUp },
            { label: "Active", value: stats.active, icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl px-3 py-3 text-center bg-card border border-border/30">
              <Icon className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-sm font-bold text-foreground">{value}</p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mx-4 mb-3 p-1 rounded-xl bg-muted/50">
        {(["active", "heatmap", "history"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); haptic("light"); }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {t === "active" ? `Missions (${stats.active})` : t === "heatmap" ? "🔥 Demande" : "Historique"}
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center py-16">
            <Truck className="h-8 w-8 animate-pulse text-muted-foreground/30" />
            <p className="text-[11px] mt-2 text-muted-foreground">Chargement…</p>
          </div>
        ) : tab === "heatmap" ? (
          <DeliveryHeatmapPanel />
        ) : tab === "active" ? (
          activeMissions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Navigation className="h-7 w-7 text-muted-foreground/25" />
              <p className="text-sm font-semibold text-foreground mt-3">{isOnline ? "En attente de missions" : "Passez en ligne"}</p>
            </div>
          ) : activeMissions.map(m => (
            <MissionCard key={m.id} mission={m}
              onAccept={() => { haptic("medium"); acceptMission(m.id).then(() => toast.success("Acceptée !")).catch(() => toast.error("Erreur")); }}
              onPickup={() => { haptic("medium"); updateStatus(m.id, "in_progress").then(() => toast.success("Récupéré")).catch(() => toast.error("Erreur")); }}
              onDeliver={() => { haptic("medium"); updateStatus(m.id, "completed").then(() => toast.success("Livré !")).catch(() => toast.error("Erreur")); }}
              onCancel={() => { haptic("warning"); updateStatus(m.id, "cancelled", "driver_declined").then(() => toast("Refusée")).catch(() => toast.error("Erreur")); }}
            />
          ))
        ) : (
          completedMissions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Clock className="h-7 w-7 text-muted-foreground/20" />
              <p className="text-xs mt-2 text-muted-foreground">Aucun historique</p>
            </div>
          ) : completedMissions.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/30">
              <span className="text-base">{(STATUS_CONFIG[m.status] || STATUS_CONFIG.completed).emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{m.package_description || "Mission"}</p>
                <p className="text-[10px] text-muted-foreground">{m.delivered_at ? new Date(m.delivered_at).toLocaleDateString("fr") : "—"}</p>
              </div>
              {m.delivery_fee != null && (
                <span className={`text-xs font-bold ${m.status === "completed" ? "text-primary" : "text-destructive"}`}>
                  {m.status === "completed" ? "+" : ""}{m.delivery_fee.toFixed(2)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
