/**
 * useRuntimeSupervisor — React hook for consuming runtime supervisor state.
 */
import { useState, useEffect, useCallback } from "react";
import { getRuntimeSnapshot, type RuntimeSnapshot } from "@/lib/runtime/supervisor";
import { subscribeTraces } from "@/lib/runtime/flow-tracer";
import { subscribeHealth } from "@/lib/runtime/health-aggregator";
import { subscribeAnomalies } from "@/lib/runtime/anomaly-detector";
import { subscribeMonitor } from "@/lib/runtime/realtime-monitor";

export function useRuntimeSupervisor(pollIntervalMs = 5000) {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>(() => getRuntimeSnapshot());

  const refresh = useCallback(() => {
    setSnapshot(getRuntimeSnapshot());
  }, []);

  useEffect(() => {
    const unsubs = [
      subscribeTraces(refresh),
      subscribeHealth(refresh),
      subscribeAnomalies(refresh),
      subscribeMonitor(refresh),
    ];
    const timer = setInterval(refresh, pollIntervalMs);
    return () => {
      unsubs.forEach(u => u());
      clearInterval(timer);
    };
  }, [refresh, pollIntervalMs]);

  return snapshot;
}
