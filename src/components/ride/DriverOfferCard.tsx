/**
 * DriverOfferCard — Driver-side card to accept/reject incoming ride offers.
 */
import { useState } from "react";
import { acceptRideOffer } from "@/lib/rides/accept-ride-offer";

export default function DriverOfferCard({
  rideRequestId,
  driverId,
}: {
  rideRequestId: string;
  driverId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<"idle" | "accepted" | "lost">("idle");

  const handleAccept = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await acceptRideOffer(rideRequestId, driverId);
      if (!result.ok) {
        setState("lost");
        return;
      }
      setState("accepted");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="text-sm font-semibold">New ride request</div>

      {state === "idle" && (
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          {loading ? "Accepting..." : "Accept"}
        </button>
      )}

      {state === "accepted" && (
        <div className="text-sm text-green-500 font-semibold">Ride accepted</div>
      )}

      {state === "lost" && (
        <div className="text-sm text-muted-foreground">
          Another driver got it first
        </div>
      )}
    </div>
  );
}
