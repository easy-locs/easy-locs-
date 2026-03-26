/**
 * useRideLiveRoute — polls live route geometry + ETA for active rides.
 */
import { useEffect, useRef, useState } from "react";
import { computeRideLiveRoute, type RideLiveRoute } from "@/lib/mobility/ride-live-route-engine";

const POLL_MS = 7000;

export function useRideLiveRoute(jobId: string | null, enabled: boolean) {
  const [route, setRoute] = useState<RideLiveRoute | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId || !enabled) {
      setRoute(null);
      return;
    }

    const run = async () => {
      const data = await computeRideLiveRoute(jobId);
      setRoute(data);
    };

    void run();
    timerRef.current = setInterval(run, POLL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [jobId, enabled]);

  return route;
}
