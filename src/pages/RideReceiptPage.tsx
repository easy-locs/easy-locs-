/**
 * RideReceiptPage — /ride/receipt/:rideRequestId
 */
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";

export default function RideReceiptPage() {
  const { rideRequestId } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <BackCard />
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <h1 className="text-lg font-bold text-foreground">Ride receipt</h1>
          <p className="text-xs text-muted-foreground">
            Receipt for ride {rideRequestId}
          </p>
        </div>
      </div>
    </div>
  );
}
