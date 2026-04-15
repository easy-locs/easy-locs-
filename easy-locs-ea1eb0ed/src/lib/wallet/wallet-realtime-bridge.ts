import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { registerSubscription } from "@/lib/realtime/subscription-registry";
import { platformBus } from "@/lib/shared/platform-bus";
import { registerChannel, recordEvent, unregisterChannel } from "@/lib/runtime/realtime-monitor";
import { APP_EVENTS } from "@/lib/platform/events";

const CHANNEL_NAME = "wallet-realtime";

/**
 * subscribeWalletRealtime — subscribes to realtime changes for a wallet account.
 *
 * Subscribes to wallet.wallet_accounts (canonical writable table).
 * All INSERT/UPDATE/DELETE events fire on this table.
 */
export function subscribeWalletRealtime(walletId: string, onUpdate: () => void): () => void {
  if (!walletId) return () => {};

  return registerSubscription(`wallet.balance:${walletId}`, () => {
    registerChannel(CHANNEL_NAME, "wallet");

    const handleChange = () => {
      recordEvent(CHANNEL_NAME);
      platformBus.emit(APP_EVENTS.WALLET_BALANCE_UPDATED, { walletId }, "wallet-realtime");
      onUpdate();
    };

    const channel = createRealtimeChannel(`wallet-accounts-${walletId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "wallet", table: "wallet_accounts", filter: `id=eq.${walletId}` },
        handleChange
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
