/**
 * useCanonicalMeBridge — Thin wrapper around useMeRealtimeSync.
 * useMeRealtimeSync already listens to ME_REFRESH and WALLET_BALANCE_UPDATED
 * via platformBus. No duplicate listeners needed here.
 */
import { useMeRealtimeSync } from "@/hooks/useMeRealtimeSync";

export function useCanonicalMeBridge() {
  const me = useMeRealtimeSync();
  return me;
}
