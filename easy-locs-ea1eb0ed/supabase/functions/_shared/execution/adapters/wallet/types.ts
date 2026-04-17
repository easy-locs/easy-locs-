/**
 * WalletAdapter — payload typings + validation (task #926, L7 P1).
 *
 * Four governed wallet task types share a single adapter implementation:
 *   - WALLET_CREDIT    (CRITICAL — always pending_review unless policy-approved)
 *   - WALLET_DEBIT     (CRITICAL — always pending_review unless policy-approved)
 *   - WALLET_TRANSFER  (CRITICAL — dual-leg ledger move, dual_admin policy)
 *   - WALLET_FREEZE    (CRITICAL — sensitive operational override)
 *
 * The canonical risk classifier already recognises the `WALLET_*` prefix as
 * CRITICAL, so this adapter does not introduce a new risk axis.
 */

export const WALLET_DOMAIN = "wallet";

export const WALLET_TASK_TYPES = {
  CREDIT: "WALLET_CREDIT",
  DEBIT: "WALLET_DEBIT",
  TRANSFER: "WALLET_TRANSFER",
  FREEZE: "WALLET_FREEZE",
} as const;

export type WalletTaskType =
  (typeof WALLET_TASK_TYPES)[keyof typeof WALLET_TASK_TYPES];

export const WALLET_ERROR_CODES = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
  WALLET_FROZEN: "WALLET_FROZEN",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  MUTATION_FAILED: "MUTATION_FAILED",
  VERIFICATION_MISMATCH: "VERIFICATION_MISMATCH",
  ADAPTER_DISABLED: "ADAPTER_DISABLED",
} as const;

export type WalletErrorCode =
  (typeof WALLET_ERROR_CODES)[keyof typeof WALLET_ERROR_CODES];

export interface WalletSnapshot {
  id: string;
  owner_id: string | null;
  /** Balance in the wallet's minor unit (e.g. cents). Source of truth. */
  balance_minor: number | null;
  currency: string | null;
  status: "active" | "frozen" | "closed" | string | null;
  updated_at: string | null;
}

export interface WalletLedgerSnapshot {
  /** Pair of snapshots for the credit/debit ledger move. */
  source: WalletSnapshot | null;
  target: WalletSnapshot | null;
}

export interface CreditDebitPayload {
  walletId: string;
  amount_minor: number;
  currency: string;
  reason: string;
  initiatedBy: string;
  reference?: string;
  payload_hash?: string;
}

export interface TransferPayload {
  sourceWalletId: string;
  targetWalletId: string;
  amount_minor: number;
  currency: string;
  reason: string;
  initiatedBy: string;
  reference?: string;
  payload_hash?: string;
}

export interface FreezePayload {
  walletId: string;
  reason: string;
  initiatedBy: string;
  /** "freeze" → status="frozen"; "unfreeze" → status="active" */
  action: "freeze" | "unfreeze";
  payload_hash?: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  reason?: string;
}

function ensureString(v: unknown): string | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  return v.trim();
}

function ensurePositiveInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (!Number.isInteger(v) || v <= 0) return null;
  return v;
}

export function validateCreditDebitPayload(p: unknown): ValidationResult<CreditDebitPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const o = p as Record<string, unknown>;
  const walletId = ensureString(o.walletId);
  const currency = ensureString(o.currency);
  const reason = ensureString(o.reason);
  const initiatedBy = ensureString(o.initiatedBy);
  const amount_minor = ensurePositiveInt(o.amount_minor);
  if (!walletId) return { ok: false, reason: "walletId is required" };
  if (!currency) return { ok: false, reason: "currency is required" };
  if (!reason) return { ok: false, reason: "reason is required (audit trail)" };
  if (!initiatedBy) return { ok: false, reason: "initiatedBy is required" };
  if (amount_minor === null) return { ok: false, reason: "amount_minor must be a positive integer" };
  return {
    ok: true,
    data: {
      walletId,
      amount_minor,
      currency,
      reason,
      initiatedBy,
      reference: typeof o.reference === "string" ? o.reference : undefined,
      payload_hash: typeof o.payload_hash === "string" ? o.payload_hash : undefined,
    },
  };
}

export function validateTransferPayload(p: unknown): ValidationResult<TransferPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const o = p as Record<string, unknown>;
  const sourceWalletId = ensureString(o.sourceWalletId);
  const targetWalletId = ensureString(o.targetWalletId);
  const currency = ensureString(o.currency);
  const reason = ensureString(o.reason);
  const initiatedBy = ensureString(o.initiatedBy);
  const amount_minor = ensurePositiveInt(o.amount_minor);
  if (!sourceWalletId) return { ok: false, reason: "sourceWalletId is required" };
  if (!targetWalletId) return { ok: false, reason: "targetWalletId is required" };
  if (sourceWalletId === targetWalletId) return { ok: false, reason: "source and target must differ" };
  if (!currency) return { ok: false, reason: "currency is required" };
  if (!reason) return { ok: false, reason: "reason is required (audit trail)" };
  if (!initiatedBy) return { ok: false, reason: "initiatedBy is required" };
  if (amount_minor === null) return { ok: false, reason: "amount_minor must be a positive integer" };
  return {
    ok: true,
    data: {
      sourceWalletId,
      targetWalletId,
      amount_minor,
      currency,
      reason,
      initiatedBy,
      reference: typeof o.reference === "string" ? o.reference : undefined,
      payload_hash: typeof o.payload_hash === "string" ? o.payload_hash : undefined,
    },
  };
}

export function validateFreezePayload(p: unknown): ValidationResult<FreezePayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const o = p as Record<string, unknown>;
  const walletId = ensureString(o.walletId);
  const reason = ensureString(o.reason);
  const initiatedBy = ensureString(o.initiatedBy);
  const action = o.action === "freeze" || o.action === "unfreeze" ? o.action : null;
  if (!walletId) return { ok: false, reason: "walletId is required" };
  if (!reason) return { ok: false, reason: "reason is required (audit trail)" };
  if (!initiatedBy) return { ok: false, reason: "initiatedBy is required" };
  if (!action) return { ok: false, reason: "action must be 'freeze' or 'unfreeze'" };
  return {
    ok: true,
    data: {
      walletId,
      reason,
      initiatedBy,
      action,
      payload_hash: typeof o.payload_hash === "string" ? o.payload_hash : undefined,
    },
  };
}
