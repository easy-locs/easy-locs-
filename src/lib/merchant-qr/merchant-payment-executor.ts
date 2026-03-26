/**
 * Merchant Payment Executor — scan → resolve → validate → confirm → execute → split.
 * Single entry point for all merchant QR payment flows.
 */
import { supabase } from "@/integrations/supabase/client";
import { walletTransfer } from "@/payments/wallet-hooks";
import { notifyPaymentSuccess, notifyWalletCredit } from "@/lib/engines/notification-event-dispatcher";
import {
  validateMerchantQr,
  calculateSplit,
  generateIdempotencyKey,
  isDuplicatePayment,
  recordPaymentAttempt,
} from "./merchant-qr-engine";
import type { MerchantQrPayload, MerchantPaymentResult } from "./types";

/* ═══════════════════════════════════════════════════════════════
   1. MERCHANT RESOLVER — resolve merchant from QR payload
   ═══════════════════════════════════════════════════════════════ */

export interface ResolvedMerchant {
  merchantId: string;
  merchantName: string;
  ownerUserId: string;
  walletId: string;
  walletStatus: "active" | "locked" | "missing";
  currency: string;
  shopSlug?: string;
  logoUrl?: string;
}

async function resolveMerchant(merchantId: string): Promise<ResolvedMerchant | null> {
  // Try storefront_pages first (most merchants)
  const { data: shop } = await supabase
    .from("storefront_pages")
    .select("id, name, user_id, slug, logo_url, currency")
    .eq("id", merchantId)
    .maybeSingle();

  if (!shop) return null;

  // Resolve wallet
  const { data: wallet } = await supabase
    .from("wallet_accounts")
    .select("id, status")
    .eq("owner_user_id", shop.user_id)
    .eq("status", "active")
    .maybeSingle();

  return {
    merchantId: shop.id,
    merchantName: shop.name || "Merchant",
    ownerUserId: shop.user_id,
    walletId: wallet?.id || "",
    walletStatus: wallet ? (wallet.status as "active" | "locked") : "missing",
    currency: shop.currency || "AED",
    shopSlug: shop.slug || undefined,
    logoUrl: shop.logo_url || undefined,
  };
}

/* ═══════════════════════════════════════════════════════════════
   2. PAYMENT EXECUTION PIPELINE
   ═══════════════════════════════════════════════════════════════ */

export async function executeMerchantPayment(opts: {
  payload: MerchantQrPayload;
  senderId: string;
  amount: number; // final amount (from payload or customer-entered)
  pinVerified: boolean;
}): Promise<MerchantPaymentResult> {
  const { payload, senderId, amount, pinVerified } = opts;

  // Step 1: PIN verification required
  if (!pinVerified) {
    return { ok: false, error: "PIN verification required before payment" };
  }

  // Step 2: Validate QR payload
  const validation = validateMerchantQr(payload);
  if (!validation.valid) {
    return { ok: false, error: (validation as { valid: false; reason: string }).reason };
  }

  // Step 3: Self-payment block
  const merchant = await resolveMerchant(payload.merchantId);
  if (!merchant) {
    return { ok: false, error: "Merchant not found" };
  }
  if (merchant.ownerUserId === senderId) {
    return { ok: false, error: "Cannot pay yourself" };
  }

  // Step 4: Wallet validation
  if (merchant.walletStatus !== "active") {
    return { ok: false, error: `Merchant wallet is ${merchant.walletStatus}. Payment blocked.` };
  }

  // Step 5: Duplicate payment check
  const idempotencyKey = generateIdempotencyKey(
    senderId,
    payload.merchantId,
    amount,
    payload.contextId,
  );
  if (isDuplicatePayment(idempotencyKey)) {
    return { ok: false, error: "Duplicate payment detected. Please wait before retrying." };
  }

  // Step 6: Amount validation
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Invalid payment amount" };
  }

  // Step 7: Execute wallet transfer
  try {
    recordPaymentAttempt(idempotencyKey);

    const { txId } = await walletTransfer({
      senderId,
      recipientId: merchant.ownerUserId,
      amount,
      currency: payload.currency,
      contextType: mapContextType(payload.contextType),
      contextId: payload.contextId || payload.merchantId,
      title: `Payment to ${merchant.merchantName}`,
      subtitle: payload.tableCode ? `Table ${payload.tableCode}` : undefined,
      metadata: {
        merchant_qr_mode: payload.mode,
        merchant_id: payload.merchantId,
        context_type: payload.contextType,
        agent_id: payload.agentId,
        idempotency_key: idempotencyKey,
      },
    });

    // Step 8: Calculate and record splits
    const hasDriver = payload.mode === "agent" && !!payload.agentId;
    const splitResult = calculateSplit(amount, hasDriver);

    // Record split via edge function (async, non-blocking)
    triggerCommissionSplit({
      paymentIntentId: txId,
      totalAmount: amount,
      currency: payload.currency,
      merchantId: payload.merchantId,
      driverId: payload.agentId,
      orderId: payload.contextId,
      platformRate: splitResult.platform / amount,
      merchantRate: splitResult.merchant / amount,
      driverRate: hasDriver ? splitResult.driver / amount : 0,
    });

    // Notify sender (payment success) and merchant (credit received)
    notifyPaymentSuccess(senderId, txId, amount, payload.currency).catch(console.error);
    notifyWalletCredit(merchant.ownerUserId, splitResult.merchant, payload.currency, `Payment from order`).catch(console.error);

    // Step 9: Create receipt
    const receiptId = await createReceipt({
      txId,
      senderId,
      merchantId: payload.merchantId,
      merchantName: merchant.merchantName,
      amount,
      currency: payload.currency,
      contextType: payload.contextType,
      contextId: payload.contextId,
      mode: payload.mode,
    });

    return {
      ok: true,
      transactionId: txId,
      splitResult,
      receiptId,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Payment failed. Please try again.",
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   3. RETRY LOGIC
   ═══════════════════════════════════════════════════════════════ */

export async function retryMerchantPayment(
  opts: Parameters<typeof executeMerchantPayment>[0],
  maxRetries = 2,
): Promise<MerchantPaymentResult> {
  let lastError = "";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await executeMerchantPayment(opts);
    if (result.ok) return result;

    // Don't retry validation/logic errors
    if (
      result.error?.includes("PIN") ||
      result.error?.includes("yourself") ||
      result.error?.includes("Duplicate") ||
      result.error?.includes("not found") ||
      result.error?.includes("Invalid") ||
      result.error?.includes("expired")
    ) {
      return result;
    }

    lastError = result.error || "Unknown error";
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { ok: false, error: `Payment failed after retries: ${lastError}` };
}

/* ═══════════════════════════════════════════════════════════════
   4. HELPERS
   ═══════════════════════════════════════════════════════════════ */

function mapContextType(ctx: string): string {
  const map: Record<string, string> = {
    counter: "shop",
    table: "shop",
    pos: "shop",
    invoice: "order",
    order: "order",
    checkout: "order",
    delivery: "order",
    field: "order",
    generic: "generic",
  };
  return map[ctx] || "generic";
}

async function triggerCommissionSplit(params: {
  paymentIntentId: string;
  totalAmount: number;
  currency: string;
  merchantId: string;
  driverId?: string;
  orderId?: string;
  platformRate: number;
  merchantRate: number;
  driverRate: number;
}) {
  try {
    await supabase.functions.invoke("commission-split", {
      body: {
        payment_intent_id: params.paymentIntentId,
        total_amount: params.totalAmount,
        currency: params.currency,
        merchant_id: params.merchantId,
        driver_id: params.driverId || null,
        order_id: params.orderId || null,
        platform_rate: params.platformRate,
        merchant_rate: params.merchantRate,
        driver_rate: params.driverRate,
      },
    });
  } catch (err) {
    console.error("[MerchantPayment] Split recording failed (non-blocking):", err);
  }
}

async function createReceipt(params: {
  txId: string;
  senderId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  currency: string;
  contextType: string;
  contextId?: string;
  mode: string;
}): Promise<string | undefined> {
  try {
    const receiptId = crypto.randomUUID();
    await (supabase as any).from("notifications").insert({
      id: receiptId,
      user_id: params.senderId,
      type: "payment.qr.receipt",
      title: `Payment to ${params.merchantName}`,
      body: `${params.amount} ${params.currency} • ${params.mode} QR`,
      cta_url: null,
      metadata_json: {
        actor: "client",
        domain: "wallet",
        tx_id: params.txId,
        merchant_id: params.merchantId,
        amount: params.amount,
        currency: params.currency,
        context_type: params.contextType,
        context_id: params.contextId,
        receipt: true,
      },
    });
    return receiptId;
  } catch {
    return undefined;
  }
}
