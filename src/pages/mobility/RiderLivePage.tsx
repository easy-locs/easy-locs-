/**
 * RiderLivePage — /rider/live — RIDER ONLY workspace.
 * Online/offline, offers, active missions, earnings summary.
 * No customer booking UI. No merchant UI.
 */
import { useEffect, useState } from "react";
import { useDriverMissions, type DeliveryJob } from "@/hooks/useDriverMissions";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Power, Package, CheckCircle2, Clock, MapPin, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RiderLivePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeMissions, completedMissions, stats, loading, acceptMission, updateStatus, confirmDelivery } = useDriverMissions();
  const offers = useRiderDispatchStore(s => s.offers);
  const hydrateOffers = useRiderDispatchStore(s => s.hydrateOffers);
  const acceptOffer = useRiderDispatchStore(s => s.acceptOffer);
  const rejectOffer = useRiderDispatchStore(s => s.rejectOffer);

  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => { hydrateOffers(); }, []);

  // Check rider_presence for online status
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
    toast.success(newStatus ? "You're online!" : "You're offline");
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Rider Hub</h1>
            <p className="text-xs text-muted-foreground">Missions · Offers · Earnings</p>
          </div>
          <button onClick={toggleOnline} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
            isOnline ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" : "bg-muted text-muted-foreground border border-border"
          }`}>
            <Power className="h-4 w-4" />
            {isOnline ? "Online" : "Offline"}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border/30 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.active}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
          <div className="bg-card border border-border/30 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="bg-card border border-border/30 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stats.totalEarnings.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Earnings</p>
          </div>
        </div>

        {/* Offers */}
        {offers.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-foreground">New Offers</h2>
            {offers.map(offer => (
              <div key={offer.id} className="bg-card border border-primary/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground capitalize">{offer.job?.job_type?.replace(/_/g, ' ') ?? "Job"}</span>
                  <Badge variant="outline" className="text-[10px]">{offer.status}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => acceptOffer(offer.id).catch((e: any) => toast.error(e.message))}>
                    <Check className="h-3 w-3" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1 text-destructive" onClick={() => rejectOffer(offer.id).catch((e: any) => toast.error(e.message))}>
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active missions */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">Active Missions</h2>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />)}</div>
          ) : activeMissions.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{isOnline ? "Waiting for missions..." : "Go online to receive missions"}</p>
            </div>
          ) : activeMissions.map(m => (
            <div key={m.id} className="bg-card border border-border/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground capitalize">{m.job_type.replace(/_/g, ' ')}</span>
                <Badge variant="secondary" className="text-[10px]">{m.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 text-emerald-500" /> {m.pickup_address || "Pickup"}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> {m.dropoff_address || "Dropoff"}</p>
              </div>
              {m.current_price != null && <p className="text-xs font-semibold text-foreground">{m.current_price} {m.currency}</p>}
              <div className="flex gap-2">
                {m.status === "accepted" && (
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => updateStatus(m.id, "picked_up").then(() => toast.success("Picked up!")).catch(() => toast.error("Error"))}>
                    📦 Picked up
                  </Button>
                )}
                {(m.status === "picked_up" || m.status === "in_progress") && (
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => confirmDelivery(m.id).then(() => toast.success("Delivered!")).catch(() => toast.error("Error"))}>
                    ✅ Delivered
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        {completedMissions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-foreground">Recent History</h2>
            {completedMissions.slice(0, 10).map(m => (
              <div key={m.id} className="bg-card border border-border/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground capitalize">{m.job_type.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-muted-foreground">{m.completed_at ? new Date(m.completed_at).toLocaleDateString() : "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.current_price != null && <span className="text-xs font-bold text-foreground">{m.current_price} {m.currency}</span>}
                  <Badge variant={m.status === "completed" ? "default" : "secondary"} className="text-[10px]">{m.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
