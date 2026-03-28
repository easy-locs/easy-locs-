/**
 * wallet-cache-invalidator — Atomic unit: invalidate wallet-related TanStack caches.
 * Uses canonical APP_EVENTS.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

let queryClientRef: any = null;

const WALLET_QUERY_KEYS = [
  "wallet-balance", "wallet-transactions", "wallet-account", "wallet-ledger",
] as const;

export function registerWalletQueryClient(qc: any) {
  queryClientRef = qc;
}

export function invalidateWalletCaches() {
  if (!queryClientRef) return;
  for (const key of WALLET_QUERY_KEYS) {
    queryClientRef.invalidateQueries({ queryKey: [key] });
  }
}

export function installWalletCacheListener(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED as any, () => invalidateWalletCaches()),
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS as any, () => invalidateWalletCaches()),
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_FAILED as any, () => invalidateWalletCaches()),
    platformBus.on(APP_EVENTS.WALLET_TRANSFER_COMPLETED as any, () => invalidateWalletCaches()),
    platformBus.on(APP_EVENTS.WALLET_TOPUP_INITIATED as any, () => invalidateWalletCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
