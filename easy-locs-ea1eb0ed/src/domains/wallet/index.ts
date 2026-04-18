/**
 * Canonical wallet domain entry point (Phase 1).
 *
 * Single import surface for wallet across the platform. Re-exports the
 * existing wallet service, ports, and canonical types. No new logic here.
 *
 * Rules (binding):
 *   - All new code touching wallet state MUST import from `@/domains/wallet`.
 *   - The wallet service is the only sanctioned writer of ledger rows.
 *   - This file MUST NOT add new wallet logic. Only re-exports.
 */

// Canonical wallet types.
export type {
  CanonicalWalletState,
  CanonicalWalletTransaction,
  CurrencyCode,
} from "@/domains/shared/canonical-types";

// Domain ports (use-cases + repository contracts).
export type {
  WalletAccount,
  LedgerEntry,
  TransferIntent,
  WalletUseCases,
  WalletRepository,
  LedgerRepository,
  PaymentGatewayPort,
  WalletSecurityPort,
  WalletEventPort,
} from "./ports";

// Canonical wallet service factory.
export { createWalletService } from "./service";

// Wallet event channel (platform-bus topics for wallet domain).
export * from "./events";
