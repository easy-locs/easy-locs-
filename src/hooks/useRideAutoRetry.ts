/**
 * useRideAutoRetry — Auto-retry wrapper for ride flow with configurable retry count.
 */
import { useCallback, useRef, useState } from "react";
import { useRideFlow } from "@/hooks/useRideFlow";
import type { RideFlowResult } from "@/lib/orchestrator/ride-orchestrator";

export function useRideAutoRetry(opts: Parameters<typeof useRideFlow>[0]) {
  const { start, loading, result } = useRideFlow(opts);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetrying, setAutoRetrying] = useState(false);
  const retryTimerRef = useRef<number | null>(null);

  const run = useCallback(async () => {
    return start();
  }, [start]);

  const scheduleRetry = useCallback(async (): Promise<RideFlowResult | null> => {
    if (retryCount >= 2) return null;

    setAutoRetrying(true);

    return new Promise((resolve) => {
      retryTimerRef.current = window.setTimeout(async () => {
        setRetryCount((v) => v + 1);
        const next = await start();
        setAutoRetrying(false);
        resolve(next);
      }, 2500);
    });
  }, [retryCount, start]);

  const resetRetries = useCallback(() => {
    setRetryCount(0);
    setAutoRetrying(false);
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  return {
    run,
    loading,
    result,
    retryCount,
    autoRetrying,
    scheduleRetry,
    resetRetries,
  };
}
