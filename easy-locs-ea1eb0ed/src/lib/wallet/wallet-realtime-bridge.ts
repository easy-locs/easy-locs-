import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { registerSubscription } from "@/lib/realtime/subscription-registry";
import { platformBus } from "@/lib/shared/platform-bus";
import { registerChannel, recordEvent, unregisterChannel } from "@/lib/runtime/realtime-monitor";
import { APP_EVENTS } from "@/lib/platform/events";

const CHANNEL_NAME = "wallet-realtime";

export function subscribeWalletRealtime(walletId: string, onUpdate: () => void): () => void {
  if (!walletId) return () => {};

  return registerSubscription(`wallet.balance:${walletId}`, () => {
    registerChannel(CHANNEL_NAME, "wallet");

    const channel = createRealtimeChannel(`wallet-balance-${walletId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "wallet_balances_v2", filter: `wallet_id=eq.${walletId}` },
        () => {
          recordEvent(CHANNEL_NAME);
          platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, { walletId }, "wallet-realtime");
          onUpdate();
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log(`[wallet-realtime] Channel subscribed for wallet ${walletId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[wallet-realtime] Channel error for wallet ${walletId} — realtime updates unavailable`);
        } else if (status === "TIMED_OUT") {
          console.warn(`[wallet-realtime] Channel timed out for wallet ${walletId}`);
        }
      });

    return () => {
      unregisterChannel(CHANNEL_NAME);
      removeRealtimeChannel(channel);
    };
  });
}
