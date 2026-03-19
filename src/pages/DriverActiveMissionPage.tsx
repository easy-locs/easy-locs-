import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDispatchJob } from "@/hooks/useDispatchLive";
import { useDriverTrackingLoop } from "@/hooks/useDriverTrackingLoop";
import { updateDeliveryMilestone, type DeliveryMilestone } from "@/lib/dispatch/dispatch-live-tracking";
import { canAdvanceToMilestone, isTerminalStatus } from "@/lib/dispatch/delivery-state-guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency";
import { MapPin, Navigation, Package, CheckCircle, Loader2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

const MILESTONES: { key: DeliveryMilestone; label: string; icon: any }[] = [
  { key: "driver_arriving_pickup", label: "Arriving Pickup", icon: Navigation },
  { key: "picked_up", label: "Picked Up", icon: Package },
  { key: "in_progress", label: "In Progress", icon: Navigation },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

export default function DriverActiveMissionPage() {
  const { dispatchJobId } = useParams<{ dispatchJobId: string }>();
  const { user } = useAuth();
  const { job, offers } = useDispatchJob(dispatchJobId);
  const [driverProfileId, setDriverProfileId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any).from("driver_profiles").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => setDriverProfileId(data?.id ?? null));
  }, [user?.id]);

  const isActive = job && !isTerminalStatus(job.dispatch_status);

  const { tracking, error: trackingError, lastPublished } = useDriverTrackingLoop({
    driverProfileId,
    dispatchJobId: dispatchJobId ?? null,
    orderId: job?.order_id ?? null,
    active: !!isActive,
  });

  const handleMilestone = async (milestone: DeliveryMilestone) => {
    if (!job || !dispatchJobId) return;
    const guard = canAdvanceToMilestone(job.dispatch_status, milestone);
    if (!guard.ok) { toast.error(guard.reason); return; }

    setAdvancing(true);
    try {
      await updateDeliveryMilestone({ dispatchJobId, orderId: job.order_id, milestone });
      toast.success(`Status updated: ${milestone}`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setAdvancing(false);
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const terminal = isTerminalStatus(job.dispatch_status);

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Package className="w-5 h-5" /> Active Mission
      </h1>

      {/* Status card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant={terminal ? "secondary" : "default"}>{job.dispatch_status}</Badge>
            <span className="text-lg font-bold">{formatMoney(Number(job.delivery_fee ?? 0), job.currency)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {Number(job.distance_km ?? 0).toFixed(1)} km</div>
            <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{job.estimated_duration_min} min</div>
            <div>Order: <span className="font-mono text-xs">{job.order_id?.slice(0, 8)}</span></div>
            <div>{job.city ?? job.country_code}</div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking indicator */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${tracking ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-muted-foreground">{tracking ? "Live tracking" : "Tracking paused"}</span>
          </div>
          {lastPublished && <span className="text-xs text-muted-foreground">{lastPublished.toLocaleTimeString()}</span>}
          {trackingError && <span className="text-xs text-destructive">{trackingError}</span>}
        </CardContent>
      </Card>

      {/* Milestone progression */}
      {!terminal && (
        <Card>
          <CardHeader><CardTitle className="text-base">Delivery Progress</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {MILESTONES.map(({ key, label, icon: Icon }) => {
              const guard = canAdvanceToMilestone(job.dispatch_status, key);
              const isPast = !guard.ok && guard.reason?.includes("Already");
              const isNext = guard.ok;

              return (
                <Button
                  key={key}
                  className="w-full justify-start"
                  variant={isPast ? "ghost" : isNext ? "default" : "outline"}
                  disabled={!isNext || advancing}
                  onClick={() => handleMilestone(key)}
                >
                  {advancing && isNext ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className={`w-4 h-4 mr-2 ${isPast ? "text-green-500" : ""}`} />
                  )}
                  {label}
                  {isPast && <CheckCircle className="w-3 h-3 ml-auto text-green-500" />}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Terminal state */}
      {terminal && (
        <Card className="border-muted">
          <CardContent className="p-6 text-center">
            {job.dispatch_status === "delivered" || job.dispatch_status === "validated" ? (
              <>
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="font-medium text-foreground">Mission Complete</p>
                <p className="text-sm text-muted-foreground">{job.dispatch_status === "validated" ? "Delivery validated" : "Awaiting validation"}</p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-destructive" />
                <p className="font-medium text-foreground">Mission {job.dispatch_status}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
