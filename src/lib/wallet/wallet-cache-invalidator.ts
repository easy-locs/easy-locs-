/**
 * wallet-cache-invalidator — Atomic unit: invalidate wallet-related TanStack caches.
 * Single responsibility: cache sync for wallet domain.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

let queryClientRef: any = null;

const WALLET_QUERY_KEYS = [
  "wallet-balance",
  "wallet-transactions",
  "wallet-account",
  "wallet-ledger",
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
    platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => invalidateWalletCaches()),
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => invalidateWalletCaches()),
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_FAILED, () => invalidateWalletCaches()),
    platformBus.on("wallet:transfer_completed" as any, () => invalidateWalletCaches()),
    platformBus.on("wallet:topup_initiated" as any, () => invalidateWalletCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
