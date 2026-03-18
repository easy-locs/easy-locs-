/**
 * DriverTripLifecycleCard — Driver-side UI to advance ride through lifecycle stages.
 */
import { useState } from "react";
import { markDriverArrived, confirmRidePickup, completeRide } from "@/lib/rides/ride-lifecycle";

export default function DriverTripLifecycleCard({
  rideRequestId,
  driverId,
}: {
  rideRequestId: string;
  driverId: string;
}) {
  const [step, setStep] = useState<"assigned" | "arrived" | "started" | "completed">("assigned");
  const [loading, setLoading] = useState(false);

  const act = async (fn: () => Promise<unknown>, next: typeof step) => {
    if (loading) return;
    setLoading(true);
    try {
      await fn();
      setStep(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Trip lifecycle</p>

      {step === "assigned" && (
        <button
          onClick={() => act(() => markDriverArrived(rideRequestId, driverId), "arrived")}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground active:scale-[0.97] transition-transform"
        >
          {loading ? "Updating…" : "Mark arrived"}
        </button>
      )}

      {step === "arrived" && (
        <button
          onClick={() => act(() => confirmRidePickup(rideRequestId, driverId), "started")}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.97] transition-transform"
        >
          {loading ? "Updating…" : "Confirm pickup"}
        </button>
      )}

      {step === "started" && (
        <button
          onClick={() => act(() => completeRide(rideRequestId, driverId, 32), "completed")}
          className="w-full rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground active:scale-[0.97] transition-transform"
        >
          {loading ? "Completing…" : "Complete ride"}
        </button>
      )}

      {step === "completed" && (
        <p className="text-sm font-semibold text-success text-center py-2">✅ Ride completed</p>
      )}
    </div>
  );
}
