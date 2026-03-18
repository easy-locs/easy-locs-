/**
 * useRideFlow — Hook wrapping the ride orchestrator with loading/error state.
 */
import { useState, useCallback } from "react";
import { startRideFlow, type RideFlowResult } from "@/lib/orchestrator/ride-orchestrator";
import { toast } from "sonner";

interface UseRideFlowOpts {
  userId: string | undefined;
  userLat: number | null;
  userLng: number | null;
  drivers: Array<{ id: string; lat: number; lng: number; status: "available" | "busy"; type: "taxi" | "delivery"; rating: number; acceptance_rate?: number }>;
  distanceKm: number;
  durationMin: number;
  countryCode?: string;
}

export function useRideFlow(opts: UseRideFlowOpts) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RideFlowResult | null>(null);

  const start = useCallback(async (): Promise<RideFlowResult | null> => {
    if (!opts.userId || !opts.userLat || !opts.userLng) {
      toast.error("Location required to book a ride");
      return null;
    }

    setLoading(true);
    try {
      const res = await startRideFlow({
        userId: opts.userId,
        userLat: opts.userLat,
        userLng: opts.userLng,
        drivers: opts.drivers,
        distanceKm: opts.distanceKm,
        durationMin: opts.durationMin,
        countryCode: opts.countryCode,
      });
      setResult(res);
      return res;
    } catch (e: any) {
      toast.error(e.message || "Could not start ride");
      return null;
    } finally {
      setLoading(false);
    }
  }, [opts]);

  return { start, loading, result };
}
