import { useState, useCallback, useEffect, useRef } from "react";
import { runUnifiedGlobalEngine, type UnifiedEngineReport } from "@/lib/engines/unified-global-engine";

interface UseAutonomousEngineOptions {
  enabled?: boolean;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  intervalMs?: number;
}

export function useAutonomousEngine(options: UseAutonomousEngineOptions = {}) {
  const { enabled = true, country = null, city = null, timezone = null, intervalMs = 300_000 } = options;

  const [report, setReport] = useState<UnifiedEngineReport | null>(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const execute = useCallback(() => {
    if (!enabled) return;
    setRunning(true);
    try {
      const engineReport = runUnifiedGlobalEngine({ country, city, timezone });
      setReport(engineReport);
    } catch (e) {
      console.error("[AutonomousEngine] Error:", e);
    } finally {
      setRunning(false);
    }
  }, [enabled, country, city, timezone]);

  useEffect(() => {
    if (!enabled) return;
    const timeout = setTimeout(execute, 800);
    intervalRef.current = setInterval(execute, intervalMs);
    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, execute, intervalMs]);

  return { report, businessState: null, execute, running };
}
