/**
 * Thin DI seam for payments reads/writes used by PaymentsAdapter and
 * PaymentsVerifier. Keeping the seam narrow means tests can substitute an
 * in-memory repo with no Supabase / network coupling.
 *
 * Canonical tables (matches `src/repositories/payments.repository.ts` and
 * `src/lib/finance/*`):
 *   - public.payments          — charge/refund row of record
 *   - public.payouts           — payout row of record
 *
 * Only the columns the governed operations read/write are exposed.
 */

import type { PaymentSnapshot } from "./types.ts";

export interface PaymentRecord extends PaymentSnapshot {}

export interface PaymentsRepository {
  findPaymentById(id: string): Promise<PaymentRecord | null>;
  findPayoutById(id: string): Promise<PaymentRecord | null>;
  /**
   * Apply a status transition. Optimistic-concurrency guard: rejects when
   * the prior status is terminal (`succeeded`, `failed`, `refunded`,
   * `cancelled`).
   */
  setPaymentStatus(
    id: string,
    nextStatus: string,
    extra?: Record<string, unknown>,
  ): Promise<PaymentRecord | null>;
  setPayoutStatus(
    id: string,
    nextStatus: string,
    extra?: Record<string, unknown>,
  ): Promise<PaymentRecord | null>;
  /** L3 (#811) — restore a row to a previously captured snapshot. */
  restorePaymentSnapshot(snap: PaymentSnapshot): Promise<PaymentRecord | null>;
  restorePayoutSnapshot(snap: PaymentSnapshot): Promise<PaymentRecord | null>;
}

export interface MinimalSupabaseClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      };
    };
    update(values: Record<string, unknown>): {
      eq(col: string, val: unknown): {
        select(cols: string): {
          maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
        };
      };
    };
  };
}

const PAYMENT_COLUMNS =
  "id, status, amount_minor, currency, provider, provider_reference, updated_at";
const PAYOUT_COLUMNS =
  "id, status, amount_minor, currency, provider, provider_reference, updated_at";

const TERMINAL_PAYMENT_STATUSES = new Set([
  "succeeded",
  "failed",
  "refunded",
  "cancelled",
]);

const TERMINAL_PAYOUT_STATUSES = new Set([
  "paid",
  "failed",
  "cancelled",
  "reversed",
]);

function mapRow(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row.id),
    status: (row.status as string | null) ?? null,
    amount_minor: typeof row.amount_minor === "number" ? row.amount_minor : null,
    currency: (row.currency as string | null) ?? null,
    provider: (row.provider as string | null) ?? null,
    provider_reference: (row.provider_reference as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

export function createSupabasePaymentsRepository(
  sb: MinimalSupabaseClient,
): PaymentsRepository {
  async function readPayment(id: string): Promise<PaymentRecord | null> {
    const { data, error } = await sb
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`payments read failed: ${error.message}`);
    return data ? mapRow(data) : null;
  }
  async function readPayout(id: string): Promise<PaymentRecord | null> {
    const { data, error } = await sb
      .from("payouts")
      .select(PAYOUT_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`payouts read failed: ${error.message}`);
    return data ? mapRow(data) : null;
  }
  return {
    findPaymentById: readPayment,
    findPayoutById: readPayout,
    async setPaymentStatus(id, nextStatus, extra = {}) {
      const prior = await readPayment(id);
      if (prior && prior.status && TERMINAL_PAYMENT_STATUSES.has(prior.status)) {
        throw new Error(
          `payments: cannot transition from terminal status '${prior.status}' on ${id}`,
        );
      }
      const patch = { status: nextStatus, ...extra };
      const { data, error } = await sb
        .from("payments")
        .update(patch)
        .eq("id", id)
        .select(PAYMENT_COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`payments update failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
    async setPayoutStatus(id, nextStatus, extra = {}) {
      const prior = await readPayout(id);
      if (prior && prior.status && TERMINAL_PAYOUT_STATUSES.has(prior.status)) {
        throw new Error(
          `payouts: cannot transition from terminal status '${prior.status}' on ${id}`,
        );
      }
      const patch = { status: nextStatus, ...extra };
      const { data, error } = await sb
        .from("payouts")
        .update(patch)
        .eq("id", id)
        .select(PAYOUT_COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`payouts update failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
    async restorePaymentSnapshot(snap) {
      const patch = {
        status: snap.status,
        provider_reference: snap.provider_reference,
      };
      const { data, error } = await sb
        .from("payments")
        .update(patch)
        .eq("id", snap.id)
        .select(PAYMENT_COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`payments restore failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
    async restorePayoutSnapshot(snap) {
      const patch = {
        status: snap.status,
        provider_reference: snap.provider_reference,
      };
      const { data, error } = await sb
        .from("payouts")
        .update(patch)
        .eq("id", snap.id)
        .select(PAYOUT_COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`payouts restore failed: ${error.message}`);
      return data ? mapRow(data) : null;
    },
  };
}
