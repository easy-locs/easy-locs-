/**
 * Wallet Engine v2 — Client-side layer that delegates sensitive ops to wallet-ops edge function.
 * Handles non-sensitive reads + orchestrates server-side calls.
 * Currency-aware: never hardcodes AED.
 */
import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import { getCurrencyFromCountry } from "@/lib/currency";

async function walletOps(action: string, payload: Record<string, unknown> = {}) {
  try {
    const { data, error } = await db.functions.invoke("wallet-ops", {
      body: { action, ...payload },
    });
    if (error) throw new Error(error.message || "Wallet operation failed");
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[WALLET] walletOps(${action}) failed:`, message);
    throw new Error(`Wallet operation "${action}" failed: ${message}`);
  }
}

// ── 1. getOrCreateWalletAccount ───────────────────────────
export async function getOrCreateWalletAccount(params: {
  ownerType: string;
  ownerUserId?: string;
  ownerProfileId?: string;
  currency?: string;
  countryCode?: string;
}) {
  const currency = params.currency ?? getCurrencyFromCountry(params.countryCode);
  let query = db("wallet_accounts").select("*").eq("owner_type", params.ownerType).eq("currency", currency);
  if (params.ownerUserId) query = query.eq("owner_user_id", params.ownerUserId);
  if (params.ownerProfileId) query = query.eq("owner_profile_id", params.ownerProfileId);

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing;

  const { data, error } = await db
    .from("wallet_accounts")
    .insert({
      owner_type: params.ownerType,
      owner_user_id: params.ownerUserId ?? null,
      owner_profile_id: params.ownerProfileId ?? null,
      currency,
      status: "active",
      balance: 0,
      available_balance: 0,
      pending_balance: 0,
      balance_cash: 0,
      balance_bonus: 0,
      balance_locked: 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ── 2. setWalletPin (server-side) ─────────────────────────
export async function setWalletPin(walletAccountId: string, rawPin: string) {
  return walletOps("set_pin", { wallet_account_id: walletAccountId, pin: rawPin });
}

// ── 3. verifyWalletPin (server-side) ──────────────────────
export async function verifyWalletPin(walletAccountId: string, rawPin: string) {
  const result = await walletOps("verify_pin", { wallet_account_id: walletAccountId, pin: rawPin });
  return result?.verified === true;
}

// ── 4. calculateCommission (read-only) ────────────────────
export async function calculateCommission(params: {
  vertical: string;
  countryCode: string;
  city?: string;
  grossAmount: number;
}) {
  let query = db
    .from("commission_rules")
    .select("*")
    .eq("vertical", params.vertical)
    .eq("country_code", params.countryCode)
    .eq("active", true)
    .limit(1);

  if (params.city) query = query.eq("city", params.city);
  const { data } = await query.maybeSingle();
  let rule = data;

  if (!rule && params.city) {
    const { data: fb } = await db
      .from("commission_rules")
      .select("*")
      .eq("vertical", params.vertical)
      .eq("country_code", params.countryCode)
      .is("city", null)
      .eq("active", true)
      .maybeSingle();
    rule = fb;
  }

  const rate = rule?.commission_rate ?? 0.05;
  const discount = rule?.commission_discount ?? 0;
  const commissionAmount = Number((params.grossAmount * rate).toFixed(2));
  const discountAmount = Number((commissionAmount * discount).toFixed(2));

  return {
    commissionMode: rule?.commission_mode ?? "cash",
    commissionRate: rate,
    commissionAmount,
    discountAmount,
    finalCommissionAmount: Number((commissionAmount - discountAmount).toFixed(2)),
  };
}

// ── 5. calculateDeliveryPrice (read-only) ─────────────────
export async function calculateDeliveryPrice(params: {
  countryCode: string;
  city?: string;
  distanceKm: number;
  isPeak?: boolean;
  isNight?: boolean;
  isPremiumZone?: boolean;
}) {
  const currency = getCurrencyFromCountry(params.countryCode);

  let query = db
    .from("delivery_pricing_rules")
    .select("*")
    .eq("country_code", params.countryCode)
    .eq("active", true);

  if (params.city) query = query.eq("city", params.city);
  const { data } = await query.maybeSingle();
  let rule = data;

  if (!rule && params.city) {
    const { data: fb } = await db
      .from("delivery_pricing_rules")
      .select("*")
      .eq("country_code", params.countryCode)
      .is("city", null)
      .eq("active", true)
      .maybeSingle();
    rule = fb;
  }

  if (!rule) return { deliveryFee: 5, currency, breakdown: { base: 5, distance: 0, multipliers: 1 } };

  let fee = Number(rule.base_fee) + params.distanceKm * Number(rule.per_km_rate);
  let multiplier = 1;
  if (params.isPeak) multiplier *= Number(rule.peak_multiplier);
  if (params.isNight) multiplier *= Number(rule.night_multiplier);
  if (params.isPremiumZone) multiplier *= Number(rule.premium_zone_multiplier);

  fee *= multiplier;
  fee = Math.max(fee, Number(rule.min_fee));
  if (rule.max_fee != null) fee = Math.min(fee, Number(rule.max_fee));

  return { deliveryFee: Number(fee.toFixed(2)), currency, breakdown: { base: Number(rule.base_fee), distance: params.distanceKm * Number(rule.per_km_rate), multipliers: multiplier } };
}

// ── 6. prepareOrderSplit (universal 3-party engine) ───────
export async function prepareOrderSplit(params: {
  orderId: string;
  grossAmount: number;
  deliveryFee: number;
  commissionAmount: number;
  merchantWalletId: string;
  driverWalletId?: string;
  platformWalletId: string;
  isSelfDelivery?: boolean;
  currency?: string;
}) {
  const driverAmount = params.driverWalletId && !params.isSelfDelivery ? params.deliveryFee : 0;
  const merchantAmount = Number((params.grossAmount - params.commissionAmount - driverAmount).toFixed(2));
  const platformAmount = params.commissionAmount;

  const splits: any[] = [
    { order_id: params.orderId, split_party_type: "merchant", wallet_account_id: params.merchantWalletId, gross_amount: params.grossAmount, net_amount: merchantAmount, split_status: "pending" },
    { order_id: params.orderId, split_party_type: "platform", wallet_account_id: params.platformWalletId, gross_amount: params.commissionAmount, net_amount: platformAmount, split_status: "pending" },
  ];

  if (params.driverWalletId && driverAmount > 0) {
    splits.push({ order_id: params.orderId, split_party_type: "driver", wallet_account_id: params.driverWalletId, gross_amount: params.deliveryFee, net_amount: driverAmount, split_status: "pending" });
  }

  if (params.isSelfDelivery && params.deliveryFee > 0) {
    splits[0].net_amount = Number((merchantAmount + params.deliveryFee).toFixed(2));
  }

  const { error } = await db("wallet_order_splits").insert(splits);
  if (error) throw error;

  await db("orders").update({
    gross_amount: params.grossAmount,
    delivery_fee: params.deliveryFee,
    platform_commission_amount: params.commissionAmount,
    merchant_net_amount: splits[0].net_amount,
    driver_amount: driverAmount,
  }).eq("id", params.orderId);

  platformBus.emit("commerce:intent_prepared", { orderId: params.orderId, stage: "split_prepared" }, "wallet");
  return { merchantAmount: splits[0].net_amount, driverAmount, platformAmount };
}

// ── 7–10. Payment lifecycle (all server-side) ─────────────
export async function authorizeWalletPayment(params: {
  orderId: string;
  customerWalletId: string;
  amount: number;
  pin: string;
  currency?: string;
}) {
  const result = await walletOps("authorize", {
    order_id: params.orderId,
    customer_wallet_id: params.customerWalletId,
    amount: params.amount,
    pin: params.pin,
    currency: params.currency,
  });
  platformBus.emit("commerce:payment_authorized", { orderId: params.orderId, amount: params.amount, stage: "authorized" }, "wallet");
  return result;
}

export async function captureWalletPayment(params: { orderId: string }) {
  const result = await walletOps("capture", { order_id: params.orderId });
  platformBus.emit("commerce:payment_captured", { orderId: params.orderId, stage: "captured" }, "wallet");
  return result;
}

export async function settleOrderPaymentV2(params: { orderId: string }) {
  const result = await walletOps("settle", { order_id: params.orderId });
  platformBus.emit("commerce:payment_settled", { orderId: params.orderId, stage: "settled" }, "wallet");
  return result;
}

export async function reverseOrderPayment(params: { orderId: string }) {
  const result = await walletOps("reverse", { order_id: params.orderId });
  platformBus.emit("commerce:payment_reversed", { orderId: params.orderId, stage: "reversed" }, "wallet");
  return result;
}

// ── Approve flagged review ────────────────────────────────
export async function approveWalletReview(params: { orderId: string }) {
  const result = await walletOps("approve_review", { order_id: params.orderId });
  platformBus.emit("commerce:payment_authorized", { orderId: params.orderId, stage: "review_approved" }, "wallet");
  return result;
}

// ── Attach driver split later ─────────────────────────────
export async function attachDriverToSplit(params: {
  orderId: string;
  driverWalletId: string;
  deliveryFee: number;
}) {
  const { data: existing } = await db
    .from("wallet_order_splits")
    .select("id")
    .eq("order_id", params.orderId)
    .eq("split_party_type", "driver")
    .maybeSingle();

  if (existing) {
    await db("wallet_order_splits").update({
      wallet_account_id: params.driverWalletId,
      net_amount: params.deliveryFee,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await db("wallet_order_splits").insert({
      order_id: params.orderId,
      split_party_type: "driver",
      wallet_account_id: params.driverWalletId,
      gross_amount: params.deliveryFee,
      net_amount: params.deliveryFee,
      split_status: "pending",
    });
  }

  const { data: merchantSplit } = await db
    .from("wallet_order_splits")
    .select("id, net_amount")
    .eq("order_id", params.orderId)
    .eq("split_party_type", "merchant")
    .single();

  if (merchantSplit) {
    await db("wallet_order_splits").update({
      net_amount: Number((Number(merchantSplit.net_amount) - params.deliveryFee).toFixed(2)),
      updated_at: new Date().toISOString(),
    }).eq("id", merchantSplit.id);
  }

  await db("orders").update({
    driver_wallet_id: params.driverWalletId,
    driver_amount: params.deliveryFee,
  }).eq("id", params.orderId);

  return { ok: true };
}
