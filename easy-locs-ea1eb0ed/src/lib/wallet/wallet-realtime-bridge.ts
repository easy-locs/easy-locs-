import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { registerSubscription } from "@/lib/realtime/subscription-registry";
import { platformBus } from "@/lib/shared/platform-bus";
import { registerChannel, recordEvent, unregisterChannel } from "@/lib/runtime/realtime-monitor";
import { APP_EVENTS } from "@/lib/platform/events";

const CHANNEL_NAME = "wallet-realtime";

/**
 * subscribeWalletRealtime — subscribes to realtime changes for a wallet account.
 *
 * TABLE ALIGNMENT:
 * - wallet_accounts is the canonical write table (used by wallet-engine, hooks, edge functions).
 *   All INSERT/UPDATE/DELETE events fire on wallet_accounts.
 * - wallet_balances_v2 is a read-optimised VIEW; postgres realtime changes do NOT fire on views,
 *   only on base tables. Subscribing solely to wallet_balances_v2 means wallet:balance_updated
 *   is never emitted when balances change.
 *
 * FIX: Subscribe to wallet_accounts (the actual mutated table) using the account id directly,
 * AND keep wallet_balances_v2 subscription as a legacy fallback in case it's also a writable table.
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

    // Primary subscription: wallet_accounts (canonical writable table, engine writes here)
    const channel = createRealtimeChannel(`wallet-accounts-${walletId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "wallet_accounts", filter: `id=eq.${walletId}` },
        handleChange
      )
      // Secondary subscription: wallet_balances_v2 (view — only fires if RLS/trigger writes there)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "wallet_balances_v2", filter: `wallet_id=eq.${walletId}` },
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
