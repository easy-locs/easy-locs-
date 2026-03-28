/**
 * wallet-realtime-bridge — Atomic unit: subscribe to wallet balance changes in realtime.
 * Single responsibility: realtime sync for wallet state.
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { registerChannel, recordEvent, unregisterChannel } from "@/lib/runtime/realtime-monitor";
import { APP_EVENTS } from "@/lib/platform/events";

const CHANNEL_NAME = "wallet-realtime";

export function subscribeWalletRealtime(walletId: string, onUpdate: () => void): () => void {
  if (!walletId) return () => {};

  registerChannel(CHANNEL_NAME, "wallet");

  const channel = supabase
    .channel(`wallet-balance-${walletId}`)
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table: "wallet_balances_v2", filter: `wallet_id=eq.${walletId}` },
      () => {
        recordEvent(CHANNEL_NAME);
        platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, { walletId }, "wallet-realtime");
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    unregisterChannel(CHANNEL_NAME);
    supabase.removeChannel(channel);
  };
}
