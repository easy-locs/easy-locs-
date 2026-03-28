/**
 * useRuntimeSupervisor — React hook for consuming runtime supervisor state.
 */
import { useState, useEffect, useCallback } from "react";
import { getRuntimeSnapshot, type RuntimeSnapshot } from "@/lib/runtime/supervisor";
import { subscribeTraces } from "@/lib/runtime/flow-tracer";
import { subscribeHealth } from "@/lib/runtime/health-aggregator";
import { subscribeAnomalies } from "@/lib/runtime/anomaly-detector";
import { subscribeMonitor } from "@/lib/runtime/realtime-monitor";
import { subscribeFlowIntegrity } from "@/lib/runtime/flow-integrity-validator";
import { subscribeCoupling } from "@/lib/runtime/coupling-detector";
import { subscribePropagation } from "@/lib/runtime/propagation-validator";

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
      subscribeFlowIntegrity(refresh),
      subscribeCoupling(refresh),
      subscribePropagation(refresh),
    ];
    const timer = setInterval(refresh, pollIntervalMs);
    return () => {
      unsubs.forEach(u => u());
      clearInterval(timer);
    };
  }, [refresh, pollIntervalMs]);

  return snapshot;
}
