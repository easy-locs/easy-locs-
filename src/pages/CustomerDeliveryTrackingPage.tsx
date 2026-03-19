import { useParams } from "react-router-dom";
import { useCustomerTracking } from "@/hooks/useCustomerTracking";
import { validateDelivery } from "@/lib/dispatch/delivery-validation";
import { canValidateDelivery } from "@/lib/dispatch/delivery-state-guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, CheckCircle, Clock, Truck, AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  awaiting_dispatch: { label: "Finding driver…", color: "bg-yellow-100 text-yellow-800" },
  driver_assigned: { label: "Driver assigned", color: "bg-blue-100 text-blue-800" },
  arriving_pickup: { label: "Driver arriving at pickup", color: "bg-indigo-100 text-indigo-800" },
  picked_up: { label: "Order picked up", color: "bg-purple-100 text-purple-800" },
  in_progress: { label: "On the way", color: "bg-purple-200 text-purple-900" },
  delivered_unvalidated: { label: "Delivered — confirm below", color: "bg-emerald-100 text-emerald-800" },
  delivered_validated: { label: "Delivery confirmed ✓", color: "bg-emerald-200 text-emerald-900" },
  failed_delivery: { label: "Delivery failed", color: "bg-red-100 text-red-800" },
  self_delivery: { label: "Merchant delivery", color: "bg-sky-100 text-sky-800" },
};

export default function CustomerDeliveryTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, job, latestLocation, loading } = useCustomerTracking(orderId ?? null);
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!order) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Order not found</div>;
  }

  const ds = order.delivery_status ?? "awaiting_dispatch";
  const statusInfo = STATUS_LABELS[ds] ?? { label: ds, color: "bg-muted text-muted-foreground" };
  const canValidate = canValidateDelivery(ds).ok;

  const handleValidate = async () => {
    if (!orderId || !job?.id) return;
    setValidating(true);
    try {
      await validateDelivery({
        orderId,
        dispatchJobId: job.id,
        method: "customer_code",
        validationCode: code || undefined,
      });
      toast.success("Delivery confirmed!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setValidating(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Truck className="w-5 h-5" /> Delivery Tracking
      </h1>

      {/* Status */}
      <Card>
        <CardContent className="p-4 text-center space-y-2">
          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          {job?.estimated_duration_min && ds !== "delivered_validated" && ds !== "failed_delivery" && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Est. ~{job.estimated_duration_min} min
            </p>
          )}
        </CardContent>
      </Card>

      {/* Driver + location info */}
      {job?.assigned_driver_id && (
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              <span className="text-foreground">Driver assigned</span>
            </div>
            {latestLocation && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <MapPin className="w-3 h-3" />
                <span>Last update: {new Date(latestLocation.recorded_at).toLocaleTimeString()}</span>
                {latestLocation.speed_kmh && <span>• {Number(latestLocation.speed_kmh).toFixed(0)} km/h</span>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {["awaiting_dispatch", "driver_assigned", "arriving_pickup", "picked_up", "in_progress", "delivered_unvalidated", "delivered_validated"].map((step) => {
            const info = STATUS_LABELS[step];
            const reached = statusRank(ds) >= statusRank(step);
            return (
              <div key={step} className={`flex items-center gap-2 text-sm ${reached ? "text-foreground" : "text-muted-foreground/40"}`}>
                {reached ? <CheckCircle className="w-4 h-4 text-green-500" /> : <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />}
                {info?.label ?? step}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Validation panel */}
      {canValidate && (
        <Card className="border-primary">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Confirm Delivery</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the delivery code to confirm receipt</p>
            <Input
              placeholder="Delivery code (optional)"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            <Button className="w-full" onClick={handleValidate} disabled={validating}>
              {validating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Confirm Delivery
            </Button>
          </CardContent>
        </Card>
      )}

      {ds === "delivered_validated" && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
            <p className="font-medium text-foreground">Delivery Confirmed</p>
            {order.delivery_validated_at && <p className="text-xs text-muted-foreground">{new Date(order.delivery_validated_at).toLocaleString()}</p>}
          </CardContent>
        </Card>
      )}

      {ds === "failed_delivery" && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-destructive" />
            <p className="font-medium text-foreground">Delivery Failed</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function statusRank(s: string): number {
  const order = ["awaiting_dispatch", "driver_assigned", "arriving_pickup", "picked_up", "in_progress", "delivered_unvalidated", "delivered_validated"];
  return order.indexOf(s);
}
