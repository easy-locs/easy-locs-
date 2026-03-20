import { useCallback } from "react";
import { useCallSignalsRealtime } from "@/hooks/useCallSignalsRealtime";
import { useRealtimeCallStore } from "@/stores/realtimeCallStore";

export function CallRealtimeBridge() {
  const handle = useCallback(async (row: unknown) => {
    await useRealtimeCallStore.getState().handleSignal(row as Record<string, unknown>);
  }, []);

  useCallSignalsRealtime(handle);
  return null;
}
