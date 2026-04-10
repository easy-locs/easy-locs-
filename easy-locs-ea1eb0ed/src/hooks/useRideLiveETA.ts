/**
 * useRideLiveETA — polls live ETA for an active ride job.
 * Read-only consumer of the live ETA engine.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { computeLiveETA, type LiveETA } from "@/lib/mobility/live-eta-computer";

const POLL_INTERVAL_MS = 10_000; // 10s

export function useRideLiveETA(jobId: string | null, isActive: boolean) {
  const [eta, setEta] = useState<LiveETA | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!jobId) return;
    const result = await computeLiveETA(jobId);
    if (result) setEta(result);
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !isActive) {
      setEta(null);
      return;
    }

    void refresh();
    timerRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [jobId, isActive, refresh]);

  return eta;
}
