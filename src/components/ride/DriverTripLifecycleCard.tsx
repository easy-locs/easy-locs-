/**
 * DriverTripLifecycleCard — Driver-side UI to advance ride through lifecycle stages.
 * Integrates Orbit notifications and wallet settlement at each transition.
 */
import { useState } from "react";
import {
  markDriverArrived,
  confirmRidePickup,
  completeRide,
} from "@/lib/rides/ride-lifecycle";
import {
  orbitRideArrived,
  orbitRideStarted,
  orbitRideCompleted,
} from "@/lib/orbit/orbit-ride-notifications";
import { settleRide } from "@/lib/wallet/settle-ride";

export default function DriverTripLifecycleCard({
  rideRequestId,
  driverId,
  threadId,
  riderId,
}: {
  rideRequestId: string;
  driverId: string;
  threadId?: string | null;
  riderId?: string | null;
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
          onClick={() =>
            act(async () => {
              await markDriverArrived(rideRequestId, driverId);
              if (threadId) await orbitRideArrived(threadId, rideRequestId);
            }, "arrived")
          }
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground active:scale-[0.97] transition-transform"
        >
          {loading ? "Updating…" : "Mark arrived"}
        </button>
      )}

      {step === "arrived" && (
        <button
          onClick={() =>
            act(async () => {
              await confirmRidePickup(rideRequestId, driverId);
              if (threadId) await orbitRideStarted(threadId, rideRequestId);
            }, "started")
          }
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground active:scale-[0.97] transition-transform"
        >
          {loading ? "Updating…" : "Confirm pickup"}
        </button>
      )}

      {step === "started" && (
        <button
          onClick={() =>
            act(async () => {
              const finalAmount = 32;
              await completeRide(rideRequestId, driverId, finalAmount);

              if (riderId) {
                await settleRide({
                  rideRequestId,
                  riderId,
                  driverId,
                  amount: finalAmount,
                  threadId,
                });
              }

              if (threadId) {
                await orbitRideCompleted(threadId, rideRequestId, finalAmount);
              }
            }, "completed")
          }
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
