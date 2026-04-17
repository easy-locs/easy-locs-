/**
 * PaymentsAdapter — payload typings + validation (task #926, L7 P1).
 *
 * Three governed payment task types share a single adapter implementation:
 *   - FINANCIAL_CHARGE   (CRITICAL — always pending_review unless policy-approved)
 *   - FINANCIAL_REFUND   (CRITICAL — always pending_review unless policy-approved)
 *   - FINANCIAL_PAYOUT   (CRITICAL — always pending_review unless policy-approved)
 *
 * The canonical risk classifier (`src/core/execution/risk-classification.ts`)
 * already recognises the `FINANCIAL_*` prefix as CRITICAL, so this adapter does
 * NOT introduce a new risk axis (per agent-migration-inventory.md §6).
 */

export const PAYMENTS_DOMAIN = "payments";

export const PAYMENTS_TASK_TYPES = {
  CHARGE: "FINANCIAL_CHARGE",
  REFUND: "FINANCIAL_REFUND",
  PAYOUT: "FINANCIAL_PAYOUT",
} as const;

export type PaymentsTaskType =
  (typeof PAYMENTS_TASK_TYPES)[keyof typeof PAYMENTS_TASK_TYPES];

export const PAYMENTS_ERROR_CODES = {
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  PROVIDER_REJECTED: "PROVIDER_REJECTED",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  MUTATION_FAILED: "MUTATION_FAILED",
  VERIFICATION_MISMATCH: "VERIFICATION_MISMATCH",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  ADAPTER_DISABLED: "ADAPTER_DISABLED",
} as const;

export type PaymentsErrorCode =
  (typeof PAYMENTS_ERROR_CODES)[keyof typeof PAYMENTS_ERROR_CODES];

export interface PaymentSnapshot {
  id: string;
  status: string | null;
  amount_minor: number | null;
  currency: string | null;
  provider: string | null;
  provider_reference: string | null;
  /** ISO timestamp of last status change in the source-of-truth row. */
  updated_at: string | null;
}

export interface ChargePayload {
  paymentId: string;
  amount_minor: number;
  currency: string;
  payerId: string;
  payeeId?: string;
  provider: string;
  provider_reference?: string;
  payload_hash?: string;
  reason?: string;
}

export interface RefundPayload {
  paymentId: string;
  amount_minor: number;
  currency: string;
  reason: string;
  initiatedBy: string;
  payload_hash?: string;
}

export interface PayoutPayload {
  payoutId: string;
  recipientId: string;
  amount_minor: number;
  currency: string;
  destination: string;
  initiatedBy: string;
  payload_hash?: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  reason?: string;
}

function ensureString(v: unknown, field: string): string | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  return v.trim();
}

function ensurePositiveInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (!Number.isInteger(v) || v <= 0) return null;
  return v;
}

export function validateChargePayload(p: unknown): ValidationResult<ChargePayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const o = p as Record<string, unknown>;
  const paymentId = ensureString(o.paymentId, "paymentId");
  const currency = ensureString(o.currency, "currency");
  const payerId = ensureString(o.payerId, "payerId");
  const provider = ensureString(o.provider, "provider");
  const amount_minor = ensurePositiveInt(o.amount_minor);
  if (!paymentId) return { ok: false, reason: "paymentId is required" };
  if (!currency) return { ok: false, reason: "currency is required" };
  if (!payerId) return { ok: false, reason: "payerId is required" };
  if (!provider) return { ok: false, reason: "provider is required" };
  if (amount_minor === null) return { ok: false, reason: "amount_minor must be a positive integer" };
  return {
    ok: true,
    data: {
      paymentId,
      amount_minor,
      currency,
      payerId,
      provider,
      payeeId: typeof o.payeeId === "string" ? o.payeeId : undefined,
      provider_reference: typeof o.provider_reference === "string" ? o.provider_reference : undefined,
      payload_hash: typeof o.payload_hash === "string" ? o.payload_hash : undefined,
      reason: typeof o.reason === "string" ? o.reason : undefined,
    },
  };
}

export function validateRefundPayload(p: unknown): ValidationResult<RefundPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const o = p as Record<string, unknown>;
  const paymentId = ensureString(o.paymentId, "paymentId");
  const currency = ensureString(o.currency, "currency");
  const reason = ensureString(o.reason, "reason");
  const initiatedBy = ensureString(o.initiatedBy, "initiatedBy");
  const amount_minor = ensurePositiveInt(o.amount_minor);
  if (!paymentId) return { ok: false, reason: "paymentId is required" };
  if (!currency) return { ok: false, reason: "currency is required" };
  if (!reason) return { ok: false, reason: "reason is required (refunds are auditable)" };
  if (!initiatedBy) return { ok: false, reason: "initiatedBy is required (operator id)" };
  if (amount_minor === null) return { ok: false, reason: "amount_minor must be a positive integer" };
  return {
    ok: true,
    data: {
      paymentId,
      amount_minor,
      currency,
      reason,
      initiatedBy,
      payload_hash: typeof o.payload_hash === "string" ? o.payload_hash : undefined,
    },
  };
}

export function validatePayoutPayload(p: unknown): ValidationResult<PayoutPayload> {
  if (!p || typeof p !== "object") return { ok: false, reason: "payload must be an object" };
  const o = p as Record<string, unknown>;
  const payoutId = ensureString(o.payoutId, "payoutId");
  const recipientId = ensureString(o.recipientId, "recipientId");
  const currency = ensureString(o.currency, "currency");
  const destination = ensureString(o.destination, "destination");
  const initiatedBy = ensureString(o.initiatedBy, "initiatedBy");
  const amount_minor = ensurePositiveInt(o.amount_minor);
  if (!payoutId) return { ok: false, reason: "payoutId is required" };
  if (!recipientId) return { ok: false, reason: "recipientId is required" };
  if (!currency) return { ok: false, reason: "currency is required" };
  if (!destination) return { ok: false, reason: "destination is required" };
  if (!initiatedBy) return { ok: false, reason: "initiatedBy is required" };
  if (amount_minor === null) return { ok: false, reason: "amount_minor must be a positive integer" };
  return {
    ok: true,
    data: {
      payoutId,
      recipientId,
      amount_minor,
      currency,
      destination,
      initiatedBy,
      payload_hash: typeof o.payload_hash === "string" ? o.payload_hash : undefined,
    },
  };
}
