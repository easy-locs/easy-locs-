/**
 * Canonical QR Payment Flow — SINGLE orchestrator for all QR-initiated payments.
 *
 * Flow:
 *   SCAN → resolveQrPayload() → validateQrSession() → buildPaymentIntent()
 *   → commitWalletTransaction() → createLedgerEntries() → emitConfirmation()
 *
 * No other module may create a parallel payment path from QR scans.
 */

import { supabase } from "@/integrations/supabase/client";
import { getCanonicalIdentity, type CanonicalIdentity } from "./canonical-identity";
import { runAction } from "./run-action";
import { platformBus } from "@/lib/shared/platform-bus";

// ─── Types ─────────────────────────────────────────

export interface QrPaymentInput {
  /** Raw QR payload string */
  qrPayload: string;
  /** Pre-resolved amount (if known from QR) */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** Target type: user | shop | request */
  targetType: "user" | "shop" | "request";
  /** Target entity ID */
  targetId: string;
}

export interface QrPaymentResult {
  paymentIntentId: string;
  walletTxId: string | null;
  ledgerEntryIds: string[];
  status: "succeeded" | "pending" | "failed";
  failureReason?: string;
}

// ─── Session Validation ────────────────────────────

async function validateQrSession(
  targetId: string,
  identity: CanonicalIdentity
): Promise<{ valid: boolean; sessionId?: string; reason?: string }> {
  if (!identity.authUserId) {
    return { valid: false, reason: "Authentication required for QR payments" };
  }

  // Check for existing active session to prevent duplicates
  const { data: existing } = await (supabase as any)
    .from("qr_payment_sessions")
    .select("id, status")
    .eq("payer_user_id", identity.authUserId)
    .eq("target_id", targetId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing?.length) {
    // Reuse existing pending session
    return { valid: true, sessionId: existing[0].id };
  }

  // Create new session
  const { data: session, error } = await (supabase as any)
    .from("qr_payment_sessions")
    .insert({
      payer_user_id: identity.authUserId,
      target_id: targetId,
      status: "pending",
      device_fingerprint: identity.deviceId,
    })
    .select("id")
    .single();

  if (error) return { valid: false, reason: error.message };
  return { valid: true, sessionId: session.id };
}

// ─── Payment Intent ────────────────────────────────

async function buildPaymentIntent(params: {
  sessionId: string;
  amount: number;
  currency: string;
  targetId: string;
  payerId: string;
}): Promise<string> {
  const { data, error } = await (supabase as any)
    .from("payment_intents")
    .insert({
      session_id: params.sessionId,
      amount: params.amount,
      currency: params.currency,
      target_id: params.targetId,
      payer_user_id: params.payerId,
      status: "created",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Payment intent failed: ${error.message}`);
  return data.id;
}

// ─── Main Orchestrator ─────────────────────────────

/**
 * Execute the complete QR payment flow.
 * This is the ONLY entry point for QR-initiated payments.
 */
export async function runCanonicalQrPaymentFlow(
  input: QrPaymentInput
): Promise<QrPaymentResult> {
  const identity = await getCanonicalIdentity();

  const result = await runAction<QrPaymentResult>({
    name: "QR_PAYMENT",
    event: "qr.payment.completed",
    eventPayload: { targetId: input.targetId, amount: input.amount },
    invalidate: ["wallet", "transactions", "orders"],

    execute: async () => {
      // 1. Validate session
      const session = await validateQrSession(input.targetId, identity);
      if (!session.valid || !session.sessionId) {
        return {
          paymentIntentId: "",
          walletTxId: null,
          ledgerEntryIds: [],
          status: "failed" as const,
          failureReason: session.reason ?? "Session validation failed",
        };
      }

      // 2. Build payment intent
      const amount = input.amount ?? 0;
      const currency = input.currency ?? "AED";

      if (amount <= 0) {
        return {
          paymentIntentId: "",
          walletTxId: null,
          ledgerEntryIds: [],
          status: "failed" as const,
          failureReason: "Invalid amount",
        };
      }

      const intentId = await buildPaymentIntent({
        sessionId: session.sessionId,
        amount,
        currency,
        targetId: input.targetId,
        payerId: identity.authUserId!,
      });

      // 3. Mark session as processing
      await (supabase as any)
        .from("qr_payment_sessions")
        .update({ status: "processing" })
        .eq("id", session.sessionId);

      // 4. Commit wallet transaction via RPC
      const { data: txResult, error: txError } = await supabase.functions.invoke(
        "process-qr-payment",
        {
          body: {
            paymentIntentId: intentId,
            sessionId: session.sessionId,
            amount,
            currency,
            payerId: identity.authUserId,
            targetId: input.targetId,
            targetType: input.targetType,
          },
        }
      );

      if (txError) {
        // Rollback session
        await (supabase as any)
          .from("qr_payment_sessions")
          .update({ status: "failed" })
          .eq("id", session.sessionId);

        return {
          paymentIntentId: intentId,
          walletTxId: null,
          ledgerEntryIds: [],
          status: "failed" as const,
          failureReason: txError.message,
        };
      }

      // 5. Mark session completed
      await (supabase as any)
        .from("qr_payment_sessions")
        .update({ status: "completed" })
        .eq("id", session.sessionId);

      return {
        paymentIntentId: intentId,
        walletTxId: txResult?.walletTxId ?? null,
        ledgerEntryIds: txResult?.ledgerEntryIds ?? [],
        status: "succeeded" as const,
      };
    },
  });

  return result.data ?? {
    paymentIntentId: "",
    walletTxId: null,
    ledgerEntryIds: [],
    status: "failed",
    failureReason: result.error ?? "Unknown error",
  };
}
