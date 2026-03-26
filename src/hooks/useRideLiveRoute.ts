/**
 * useRideLiveRoute — polls live route geometry + ETA for active rides.
 * Adaptive interval: 5s in-trip, 10s otherwise. Sequence guard prevents stale writes.
 */
import { useEffect, useRef, useState } from "react";
import { computeRideLiveRoute, type RideLiveRoute } from "@/lib/mobility/ride-live-route-engine";

const FAST_MS = 5000;
const SLOW_MS = 10000;

function intervalForStatus(status?: string | null) {
  if (!status) return SLOW_MS;
  if (["picked_up", "in_progress", "rider_arriving_dropoff"].includes(status)) return FAST_MS;
  return SLOW_MS;
}

export function useRideLiveRoute(jobId: string | null, enabled: boolean, status?: string | null) {
  const [route, setRoute] = useState<RideLiveRoute | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);
  const seqRef = useRef(0);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!jobId || !enabled) {
      setRoute(null);
      return;
    }

    const run = async () => {
      const seq = ++seqRef.current;
      const data = await computeRideLiveRoute(jobId);

      if (!activeRef.current || seq !== seqRef.current) return;

      setRoute(data);
      timerRef.current = setTimeout(run, intervalForStatus(data?.jobStatus ?? status));
    };

    void run();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jobId, enabled, status]);

  return route;
}
