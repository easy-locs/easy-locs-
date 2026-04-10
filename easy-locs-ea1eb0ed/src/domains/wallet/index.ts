/**
 * DOMAIN: WALLET — Canonical payment engine, ledger, and financial truth.
 *
 * Wallet is the SOLE source of truth for:
 * - balance, transactions, payment intents, QR payments, escrow, refunds, payouts
 *
 * INTERDIT: any other module implementing its own payment logic.
 */

// ── Canonical Types (re-export from shared SSOT) ──
export type {
  CanonicalWalletState,
  CanonicalWalletTransaction,
  CurrencyCode,
  PaymentStatus,
  IdempotencyHeader,
} from "@/domains/shared/canonical-types";

// ── Atoms ──
export { isValidAmount, isValidCurrency, buildWalletReference } from "./atoms/is-final-payment-status.atom";

// ── Microns ──
export { validatePaymentInput } from "./microns/validate-payment-input.micron";
export type { PaymentInput, ValidationResult } from "./microns/validate-payment-input.micron";
export { computeWalletDelta } from "./microns/compute-wallet-delta.micron";
export type { WalletDelta } from "./microns/compute-wallet-delta.micron";

// ── Molecules ──
export { createPaymentIntentDraft } from "./molecules/create-payment-intent.molecule";
export type { PaymentIntentDraft } from "./molecules/create-payment-intent.molecule";

// ── Selectors ──
export { selectFormattedBalance, selectTotalBalance, selectPendingTransactions, selectRecentTransactions } from "./wallet.selectors";

// ── Ports (hexagonal) ──
export type { WalletAccount, LedgerEntry, TransferIntent, WalletUseCases, WalletRepository, LedgerRepository, PaymentGatewayPort, WalletSecurityPort, WalletEventPort } from "./ports";

// ── Service ──
export { createWalletService } from "./service";

// ── Events ──
export { walletEvents } from "./events";

// ── State Machines ──
export { PAYMENT_MACHINE, transitionPayment } from "@/domains/shared/state-machines";
