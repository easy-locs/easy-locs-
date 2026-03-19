import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverMissionOffers } from "@/hooks/useDriverMissionOffers";
import { useDriverActiveMission } from "@/hooks/useDriverActiveMission";
import { acceptDriverOffer, declineDriverOffer } from "@/lib/dispatch/dispatch-engine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency";
import { MapPin, Clock, Truck, Check, X, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function DriverMissionInboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driverProfileId, setDriverProfileId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any).from("driver_profiles").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => setDriverProfileId(data?.id ?? null));
  }, [user?.id]);

  const { offers, loading } = useDriverMissionOffers(driverProfileId);
  const { job: activeJob } = useDriverActiveMission(driverProfileId);

  const handleAccept = async (offerId: string, dpId: string) => {
    setBusy(offerId);
    try {
      await acceptDriverOffer({ offerId, driverProfileId: dpId });
      toast.success("Mission accepted!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to accept");
    }
    setBusy(null);
  };

  const handleDecline = async (offerId: string, dpId: string) => {
    setBusy(offerId);
    try {
      await declineDriverOffer({ offerId, driverProfileId: dpId });
      toast.info("Mission declined");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to decline");
    }
    setBusy(null);
  };

  const now = Date.now();

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Truck className="w-5 h-5" /> Mission Inbox
      </h1>

      {/* Active mission banner */}
      {activeJob && (
        <Card className="border-primary bg-primary/5 cursor-pointer" onClick={() => navigate(`/driver/mission/${activeJob.id}`)}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <Badge className="bg-primary text-primary-foreground">{activeJob.dispatch_status}</Badge>
              <p className="text-sm text-foreground mt-1">Active mission in progress</p>
            </div>
            <Navigation className="w-5 h-5 text-primary" />
          </CardContent>
        </Card>
      )}

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}

      {!loading && !offers.length && (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No pending missions</p>
          <p className="text-xs">New offers will appear here in real time</p>
        </div>
      )}

      {offers.map((offer: any) => {
        const job = offer.dispatch_jobs_v2;
        if (!job) return null;
        const expiresAt = offer.expires_at ? new Date(offer.expires_at).getTime() : 0;
        const expired = expiresAt > 0 && expiresAt < now;
        const isBusy = busy === offer.id;

        return (
          <Card key={offer.id} className={`transition-all ${expired ? "opacity-50" : "border-border"}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{expired ? "Expired" : "New Mission"}</Badge>
                  {offer.ranking_score && (
                    <span className="text-xs text-muted-foreground">Score: {Number(offer.ranking_score).toFixed(0)}</span>
                  )}
                </div>
                <span className="text-lg font-bold text-foreground">
                  {formatMoney(Number(job.delivery_fee ?? 0), job.currency)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>{Number(job.distance_km ?? 0).toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>~{job.estimated_duration_min ?? "?"} min</span>
                </div>
              </div>

              {job.city && (
                <p className="text-xs text-muted-foreground">{job.city} • {job.country_code}</p>
              )}

              {/* Expiry countdown */}
              {!expired && expiresAt > 0 && (
                <ExpiryCountdown expiresAt={expiresAt} />
              )}

              {!expired && (
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => handleAccept(offer.id, offer.driver_profile_id)}
                    disabled={isBusy}
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecline(offer.id, offer.driver_profile_id)}
                    disabled={isBusy}
                  >
                    <X className="w-4 h-4 mr-1" /> Decline
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ExpiryCountdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));

  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (remaining <= 0) return null;
  return (
    <div className={`text-xs font-medium ${remaining < 10 ? "text-destructive" : "text-muted-foreground"}`}>
      Expires in {remaining}s
    </div>
  );
}
