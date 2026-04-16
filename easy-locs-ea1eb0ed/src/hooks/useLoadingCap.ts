/**
 * useLoadingCap — enforce a hard cap on "loading" duration for dashboard cards.
 *
 * Per the dashboard audit sign-off: any card stuck in loading state for more
 * than `capMs` (default 10s) must auto-degrade to an error state so the UI
 * does not show a forever-skeleton.
 *
 * Usage:
 *   const capped = useLoadingCap(loading, { capMs: 10_000 });
 *   if (capped.timedOut) return <ErrorState onRetry={refresh} />;
 */
import { useEffect, useRef, useState } from "react";

export interface LoadingCapOptions {
  capMs?: number;
}

export interface LoadingCapResult {
  timedOut: boolean;
  reset: () => void;
}

export function useLoadingCap(loading: boolean, options: LoadingCapOptions = {}): LoadingCapResult {
  const { capMs = 10_000 } = options;
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading) {
      startRef.current = null;
      if (timedOut) setTimedOut(false);
      return;
    }
    if (startRef.current === null) startRef.current = Date.now();
    const handle = window.setTimeout(() => {
      setTimedOut(true);
    }, capMs);
    return () => {
      window.clearTimeout(handle);
    };
  }, [loading, capMs, timedOut]);

  return {
    timedOut,
    reset: () => {
      startRef.current = null;
      setTimedOut(false);
    },
  };
}
