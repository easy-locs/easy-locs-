/**
 * RideReceiptPage — /ride/receipt/:rideRequestId — Post-ride receipt details.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";

export default function RideReceiptPage() {
  const { rideRequestId } = useParams();
  const [ride, setRide] = useState<any>(null);

  useEffect(() => {
    if (!rideRequestId) return;
    supabase
      .from("ride_requests" as any)
      .select("*")
      .eq("id", rideRequestId)
      .single()
      .then(({ data }) => setRide(data ?? null));
  }, [rideRequestId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <BackCard />
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h1 className="text-lg font-bold text-foreground">Ride receipt</h1>
          <p className="text-xs text-muted-foreground">
            Receipt for ride {rideRequestId}
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-foreground">{ride?.status ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Final amount</span>
              <span className="font-semibold text-foreground">
                {ride?.final_amount != null ? `${ride.final_amount} AED` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Settlement</span>
              <span className="font-medium text-foreground">{ride?.settlement_status ?? "pending"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started at</span>
              <span className="font-medium text-foreground">{ride?.trip_started_at ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed at</span>
              <span className="font-medium text-foreground">{ride?.completed_at ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
