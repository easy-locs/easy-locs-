/**
 * Hook for the Unified Global UX/UI/Digital/Lead/Payment Engine.
 * Runs on mount and provides the full report + manual re-run.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  runUnifiedGlobalEngine,
  type UnifiedEngineReport,
} from "@/lib/engines/unified-global-engine";

interface UseUnifiedGlobalEngineOptions {
  enabled?: boolean;
  autoRun?: boolean;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  /** Re-run interval in ms (default: 5 min) */
  intervalMs?: number;
}

export function useUnifiedGlobalEngine(options: UseUnifiedGlobalEngineOptions = {}) {
  const {
    enabled = true,
    autoRun = true,
    country = null,
    city = null,
    timezone = null,
    intervalMs = 300_000,
  } = options;

  const [report, setReport] = useState<UnifiedEngineReport | null>(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const execute = useCallback(() => {
    if (!enabled) return;
    setRunning(true);
    try {
      const result = runUnifiedGlobalEngine({ country, city, timezone });
      setReport(result);
    } catch (e) {
      console.error("[UnifiedGlobalEngine] Error:", e);
    } finally {
      setRunning(false);
    }
  }, [enabled, country, city, timezone]);

  useEffect(() => {
    if (!enabled || !autoRun) return;

    // Delay first run to let DOM settle
    const timeout = setTimeout(execute, 500);

    intervalRef.current = setInterval(execute, intervalMs);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, autoRun, execute, intervalMs]);

  return { report, execute, running };
}
