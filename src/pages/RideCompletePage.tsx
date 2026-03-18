/**
 * RideCompletePage — /ride/complete/:rideRequestId — Post-ride rating, tip & review.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { submitRideReview } from "@/lib/rides/submit-ride-review";

export default function RideCompletePage() {
  const { rideRequestId } = useParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rideRequestId) return;
    supabase
      .from("ride_requests" as any)
      .select("*")
      .eq("id", rideRequestId)
      .single()
      .then(({ data }) => setRide(data ?? null));
  }, [rideRequestId]);

  const handleSubmit = async () => {
    if (!rideRequestId || !ride?.rider_id || !ride?.selected_driver_id) return;

    setLoading(true);
    try {
      await submitRideReview({
        rideRequestId,
        riderId: ride.rider_id,
        driverId: ride.selected_driver_id,
        rating,
        review,
        tipAmount: tip ?? 0,
        threadId: ride.thread_id ?? null,
      });

      navigate(`/ride/receipt/${rideRequestId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <BackCard />

        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-foreground">Ride completed</h1>
            <p className="text-xs text-muted-foreground">Rate the trip and add a tip</p>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Your rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`h-11 w-11 rounded-2xl border text-base transition-colors ${
                    rating >= n
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card"
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Tip</p>
            <div className="flex gap-2">
              {[5, 10, 20, 30].map((v) => (
                <button
                  key={v}
                  onClick={() => setTip(v)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    tip === v
                      ? "bg-accent text-accent-foreground"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  {v} AED
                </button>
              ))}
            </div>
          </div>

          {/* Review */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Review</p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              placeholder="Tell us about the trip"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-2xl text-sm font-bold mt-6"
          >
            {loading ? "Submitting…" : "Submit"}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Ride: {rideRequestId}
          </p>
        </div>
      </div>
    </div>
  );
}
