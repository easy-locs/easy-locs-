/**
 * FAMILY: WALLET — Canonical wallet state and operations.
 * Single source of truth for balances, transactions, ledger, transfers, escrow.
 *
 * All modules MUST import wallet logic from this family.
 */

// ── Reactive hooks ──
export { useWalletRealtime } from "@/hooks/useWalletRealtime";
export { useWalletAccounts } from "@/hooks/useWalletAccounts";
export { useCanonicalWalletBridge } from "@/hooks/useCanonicalWalletBridge";
export { useWalletStore } from "@/stores/walletStore";

// ── Wallet account bootstrap ──
export { ensureWalletAccount } from "@/lib/wallet/ensureWalletAccount";

// ── Repository operations ──
export {
  createWalletTopup,
  invokeWalletPin,
  fetchWalletActivity,
} from "@/repositories/payments.repository";

// ── Escrow ──
export {
  fetchEscrowStatus,
  confirmDelivery,
  releaseEscrow,
} from "@/repositories/escrow.repository";

// ── Security PIN ──
export {
  checkPinStatus,
  setPin,
  verifyPin,
} from "@/repositories/security-pin.repository";

// Wallet family owns: wallet identity, balances (available/escrow/pending),
// transactions, ledger summary, transfers, requests, payouts,
// payment links, escrow state, settlement state, PIN security
