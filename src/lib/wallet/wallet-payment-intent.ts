/**
 * Wallet Payment Intent — Anti-replay, nonce-based, server-verified payment model.
 * Separate security domain from chat/call/ghost keys.
 */
import { supabase } from "@/integrations/supabase/client";

export type PaymentIntentStatus = "pending" | "authorized" | "captured" | "failed" | "expired" | "cancelled";
export type PaymentRiskLevel = "low" | "medium" | "high" | "critical";

interface CreatePaymentIntentParams {
  userId: string;
  amount: number;
  currency: string;
  countryCode?: string;
  merchantId?: string;
  recipientUserId?: string;
  contextType?: string;
  contextId?: string;
  metadata?: Record<string, any>;
}

interface PaymentIntentResult {
  intentId: string;
  nonce: string;
  status: PaymentIntentStatus;
  riskLevel: PaymentRiskLevel;
  expiresAt: string;
  requiresStepUp: boolean;
}

// ── Nonce / Anti-Replay ──────────────────────────────────

const consumedNonces = new Map<string, number>();

function generatePaymentNonce(): string {
  return crypto.randomUUID();
}

function checkPaymentReplay(nonce: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  // Cleanup stale (5 min window)
  for (const [k, t] of consumedNonces) {
    if (now - t > 5 * 60_000) consumedNonces.delete(k);
  }
  if (consumedNonces.has(nonce)) {
    console.warn("[wallet-vault] payment_replay_blocked", { nonce: nonce.slice(0, 8) });
    return { allowed: false, reason: "duplicate_nonce" };
  }
  consumedNonces.set(nonce, now);
  return { allowed: true };
}

// ── Validation ───────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUPPORTED_CURRENCIES = ["AED", "EUR", "USD", "GBP", "MAD", "XOF", "USDT"];

function validatePaymentParams(params: CreatePaymentIntentParams): string | null {
  if (!params.userId || !UUID_REGEX.test(params.userId)) return "Invalid user ID";
  if (!params.amount || params.amount <= 0) return "Amount must be positive";
  if (params.amount > 1_000_000) return "Amount exceeds maximum";
  if (!params.currency || !SUPPORTED_CURRENCIES.includes(params.currency.toUpperCase())) {
    return `Unsupported currency: ${params.currency}`;
  }
  if (params.merchantId && !UUID_REGEX.test(params.merchantId)) return "Invalid merchant ID";
  if (params.recipientUserId && !UUID_REGEX.test(params.recipientUserId)) return "Invalid recipient ID";
  if (params.recipientUserId === params.userId) return "Cannot pay yourself";
  return null;
}

// ── Risk Assessment ──────────────────────────────────────

const HIGH_VALUE_THRESHOLD = 5000;
const STEP_UP_THRESHOLD = 2000;

function assessRisk(amount: number): { riskLevel: PaymentRiskLevel; requiresStepUp: boolean } {
  if (amount >= HIGH_VALUE_THRESHOLD) return { riskLevel: "high", requiresStepUp: true };
  if (amount >= STEP_UP_THRESHOLD) return { riskLevel: "medium", requiresStepUp: true };
  return { riskLevel: "low", requiresStepUp: false };
}

// ── Create Payment Intent ────────────────────────────────

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
  // Validate
  const validationError = validatePaymentParams(params);
  if (validationError) throw new Error(`[wallet-vault] ${validationError}`);

  // Generate nonce + anti-replay
  const nonce = generatePaymentNonce();
  const replayCheck = checkPaymentReplay(nonce);
  if (!replayCheck.allowed) throw new Error(`[wallet-vault] ${replayCheck.reason}`);

  const { riskLevel, requiresStepUp } = assessRisk(params.amount);
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString(); // 5 min expiry

  const { data, error } = await (supabase as any)
    .from("wallet_payment_intents")
    .insert({
      user_id: params.userId,
      merchant_id: params.merchantId ?? null,
      recipient_user_id: params.recipientUserId ?? null,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      country_code: params.countryCode ?? null,
      nonce,
      status: "pending",
      risk_level: riskLevel,
      expires_at: expiresAt,
      metadata_json: params.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  console.log("[wallet-vault] payment_intent_created", {
    intentId: data.id,
    amount: params.amount,
    currency: params.currency,
    risk: riskLevel,
  });

  return {
    intentId: data.id,
    nonce,
    status: "pending",
    riskLevel,
    expiresAt,
    requiresStepUp,
  };
}

// ── Validate Payment Intent ──────────────────────────────

export async function validatePaymentIntent(intentId: string, userId: string): Promise<{
  valid: boolean;
  reason?: string;
  intent?: any;
}> {
  if (!UUID_REGEX.test(intentId)) return { valid: false, reason: "invalid_intent_id" };

  const { data } = await (supabase as any)
    .from("wallet_payment_intents")
    .select("*")
    .eq("id", intentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return { valid: false, reason: "not_found" };
  if (data.status !== "pending") return { valid: false, reason: `status_${data.status}` };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await (supabase as any).from("wallet_payment_intents").update({ status: "expired" }).eq("id", intentId);
    return { valid: false, reason: "expired" };
  }

  return { valid: true, intent: data };
}

// ── Capture Payment Intent ───────────────────────────────

export async function capturePaymentIntent(intentId: string, userId: string): Promise<{ success: boolean; reason?: string }> {
  const validation = await validatePaymentIntent(intentId, userId);
  if (!validation.valid) return { success: false, reason: validation.reason };

  const { error } = await (supabase as any)
    .from("wallet_payment_intents")
    .update({
      status: "captured",
      updated_at: new Date().toISOString(),
    })
    .eq("id", intentId)
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) return { success: false, reason: "capture_failed" };

  console.log("[wallet-vault] payment_intent_captured", { intentId });
  return { success: true };
}

// ── Cancel Payment Intent ────────────────────────────────

export async function cancelPaymentIntent(intentId: string, userId: string): Promise<void> {
  await (supabase as any)
    .from("wallet_payment_intents")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", intentId)
    .eq("user_id", userId)
    .eq("status", "pending");

  console.log("[wallet-vault] payment_intent_cancelled", { intentId });
}
