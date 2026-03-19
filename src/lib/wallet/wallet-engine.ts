/**
 * Wallet-first commerce engine — core service layer.
 * Handles wallet CRUD, PIN security, commission, delivery pricing,
 * order splits, and the full authorize → capture → settle → reverse lifecycle.
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

// ── Helpers ───────────────────────────────────────────────
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input + "_easylocs_wallet_v2");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── 1. getOrCreateWalletAccount ───────────────────────────
export async function getOrCreateWalletAccount(params: {
  ownerType: string;
  ownerUserId?: string;
  ownerProfileId?: string;
  currency?: string;
}) {
  const currency = params.currency ?? "AED";

  // Try to find existing
  let query = (supabase as any).from("wallet_accounts").select("*").eq("owner_type", params.ownerType).eq("currency", currency);
  if (params.ownerUserId) query = query.eq("owner_user_id", params.ownerUserId);
  if (params.ownerProfileId) query = query.eq("owner_profile_id", params.ownerProfileId);

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing;

  // Create new
  const { data, error } = await (supabase as any)
    .from("wallet_accounts")
    .insert({
      owner_type: params.ownerType,
      owner_user_id: params.ownerUserId ?? null,
      owner_profile_id: params.ownerProfileId ?? null,
      currency,
      status: "active",
      balance: 0,
      available_balance: 0,
      balance_cash: 0,
      balance_bonus: 0,
      balance_locked: 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ── 2. setWalletPin ──────────────────────────────────────
export async function setWalletPin(walletAccountId: string, rawPin: string) {
  const pinHash = await sha256(rawPin);
  const { error } = await (supabase as any)
    .from("wallet_pins")
    .upsert({
      wallet_account_id: walletAccountId,
      pin_hash: pinHash,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "wallet_account_id" });

  if (error) throw error;
  return { ok: true };
}

// ── 3. verifyWalletPin ───────────────────────────────────
export async function verifyWalletPin(walletAccountId: string, rawPin: string): Promise<boolean> {
  const { data: pin, error } = await (supabase as any)
    .from("wallet_pins")
    .select("*")
    .eq("wallet_account_id", walletAccountId)
    .single();

  if (error || !pin) return false;

  // Check lock
  if (pin.locked_until && new Date(pin.locked_until) > new Date()) {
    return false;
  }

  const inputHash = await sha256(rawPin);
  if (inputHash !== pin.pin_hash) {
    const attempts = (pin.failed_attempts ?? 0) + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await (supabase as any)
      .from("wallet_pins")
      .update({ failed_attempts: attempts, locked_until: lockUntil, updated_at: new Date().toISOString() })
      .eq("wallet_account_id", walletAccountId);
    return false;
  }

  // Success — reset
  await (supabase as any)
    .from("wallet_pins")
    .update({ failed_attempts: 0, locked_until: null, last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("wallet_account_id", walletAccountId);

  return true;
}

// ── 4. calculateCommission ───────────────────────────────
export async function calculateCommission(params: {
  vertical: string;
  countryCode: string;
  city?: string;
  grossAmount: number;
}) {
  let query = (supabase as any)
    .from("commission_rules")
    .select("*")
    .eq("vertical", params.vertical)
    .eq("country_code", params.countryCode)
    .eq("active", true)
    .limit(1);

  if (params.city) query = query.eq("city", params.city);

  const { data } = await query.maybeSingle();

  // Fallback: try without city
  let rule = data;
  if (!rule && params.city) {
    const { data: fallback } = await (supabase as any)
      .from("commission_rules")
      .select("*")
      .eq("vertical", params.vertical)
      .eq("country_code", params.countryCode)
      .is("city", null)
      .eq("active", true)
      .maybeSingle();
    rule = fallback;
  }

  const rate = rule?.commission_rate ?? 0.05;
  const discount = rule?.commission_discount ?? 0;
  const commissionAmount = Number((params.grossAmount * rate).toFixed(2));
  const discountAmount = Number((commissionAmount * discount).toFixed(2));
  const finalCommissionAmount = Number((commissionAmount - discountAmount).toFixed(2));

  return {
    commissionMode: rule?.commission_mode ?? "cash",
    commissionRate: rate,
    commissionAmount,
    discountAmount,
    finalCommissionAmount,
  };
}

// ── 5. calculateDeliveryPrice ────────────────────────────
export async function calculateDeliveryPrice(params: {
  countryCode: string;
  city?: string;
  distanceKm: number;
  isPeak?: boolean;
  isNight?: boolean;
  isPremiumZone?: boolean;
}) {
  let query = (supabase as any)
    .from("delivery_pricing_rules")
    .select("*")
    .eq("country_code", params.countryCode)
    .eq("active", true);

  if (params.city) query = query.eq("city", params.city);

  const { data } = await query.maybeSingle();
  let rule = data;

  if (!rule && params.city) {
    const { data: fb } = await (supabase as any)
      .from("delivery_pricing_rules")
      .select("*")
      .eq("country_code", params.countryCode)
      .is("city", null)
      .eq("active", true)
      .maybeSingle();
    rule = fb;
  }

  if (!rule) {
    return { deliveryFee: 5, breakdown: { base: 5, distance: 0, multipliers: 1 } };
  }

  let fee = Number(rule.base_fee) + params.distanceKm * Number(rule.per_km_rate);
  let multiplier = 1;
  if (params.isPeak) multiplier *= Number(rule.peak_multiplier);
  if (params.isNight) multiplier *= Number(rule.night_multiplier);
  if (params.isPremiumZone) multiplier *= Number(rule.premium_zone_multiplier);

  fee *= multiplier;
  fee = Math.max(fee, Number(rule.min_fee));
  if (rule.max_fee != null) fee = Math.min(fee, Number(rule.max_fee));
  fee = Number(fee.toFixed(2));

  return { deliveryFee: fee, breakdown: { base: Number(rule.base_fee), distance: params.distanceKm * Number(rule.per_km_rate), multipliers: multiplier } };
}

// ── 6. prepareOrderSplit ─────────────────────────────────
export async function prepareOrderSplit(params: {
  orderId: string;
  grossAmount: number;
  deliveryFee: number;
  commissionAmount: number;
  merchantWalletId: string;
  driverWalletId?: string;
  platformWalletId: string;
}) {
  const merchantAmount = Number((params.grossAmount - params.commissionAmount - params.deliveryFee).toFixed(2));
  const driverAmount = params.deliveryFee;
  const platformAmount = params.commissionAmount;

  const splits: any[] = [
    { order_id: params.orderId, split_party_type: "merchant", wallet_account_id: params.merchantWalletId, gross_amount: params.grossAmount, net_amount: merchantAmount, split_status: "pending" },
    { order_id: params.orderId, split_party_type: "platform", wallet_account_id: params.platformWalletId, gross_amount: params.commissionAmount, net_amount: platformAmount, split_status: "pending" },
  ];

  if (params.driverWalletId && driverAmount > 0) {
    splits.push({ order_id: params.orderId, split_party_type: "driver", wallet_account_id: params.driverWalletId, gross_amount: params.deliveryFee, net_amount: driverAmount, split_status: "pending" });
  }

  const { error } = await (supabase as any).from("wallet_order_splits").insert(splits);
  if (error) throw error;

  // Update order amounts
  await (supabase as any).from("orders").update({
    gross_amount: params.grossAmount,
    delivery_fee: params.deliveryFee,
    platform_commission_amount: params.commissionAmount,
    merchant_net_amount: merchantAmount,
    driver_amount: driverAmount,
  }).eq("id", params.orderId);

  return { merchantAmount, driverAmount, platformAmount };
}

// ── 7. authorizeWalletPayment ────────────────────────────
export async function authorizeWalletPayment(params: {
  orderId: string;
  customerWalletId: string;
  amount: number;
  pin: string;
}) {
  // Verify PIN
  const valid = await verifyWalletPin(params.customerWalletId, params.pin);
  if (!valid) throw new Error("Invalid wallet PIN");

  // Check balance
  const { data: wallet } = await (supabase as any).from("wallet_accounts").select("balance_cash").eq("id", params.customerWalletId).single();
  if (!wallet || Number(wallet.balance_cash) < params.amount) throw new Error("Insufficient balance");

  // Create transaction
  const { data: tx, error: txErr } = await (supabase as any).from("wallet_transactions").insert({
    type: "order_payment",
    direction: "debit",
    user_id: (await supabase.auth.getUser()).data.user?.id,
    amount: params.amount,
    currency: "AED",
    status: "authorized",
    reference_type: "order",
    reference_id: params.orderId,
    description: `Payment for order`,
  }).select("*").single();
  if (txErr) throw txErr;

  // Create ledger lock
  await (supabase as any).from("wallet_ledger_entries").insert({
    wallet_account_id: params.customerWalletId,
    direction: "debit",
    amount: params.amount,
    currency: "AED",
    entry_type: "lock",
    reference_type: "wallet_transaction",
    reference_id: tx.id,
    status: "posted",
  });

  // Lock funds on wallet
  await (supabase as any).from("wallet_accounts").update({
    balance_cash: Number(wallet.balance_cash) - params.amount,
    balance_locked: params.amount,
    updated_at: new Date().toISOString(),
  }).eq("id", params.customerWalletId);

  // Update order
  await (supabase as any).from("orders").update({
    payment_status: "authorized",
    wallet_status: "authorized",
    payment_mode: "wallet_internal",
    customer_wallet_id: params.customerWalletId,
  }).eq("id", params.orderId);

  platformBus.emit("wallet:payment_completed", { orderId: params.orderId, amount: params.amount, stage: "authorized" }, "wallet");
  return { transactionId: tx.id };
}

// ── 8. captureWalletPayment ──────────────────────────────
export async function captureWalletPayment(params: { orderId: string }) {
  await (supabase as any).from("orders").update({
    payment_status: "held_in_escrow",
    wallet_status: "captured",
  }).eq("id", params.orderId);

  platformBus.emit("wallet:payment_completed", { orderId: params.orderId, stage: "captured" }, "wallet");
  return { ok: true };
}

// ── 9. settleOrderPayment ────────────────────────────────
export async function settleOrderPaymentV2(params: { orderId: string }) {
  // Get splits
  const { data: splits } = await (supabase as any)
    .from("wallet_order_splits")
    .select("*")
    .eq("order_id", params.orderId)
    .eq("split_status", "pending");

  if (!splits?.length) throw new Error("No pending splits found");

  for (const split of splits) {
    if (split.net_amount <= 0) continue;

    // Credit destination wallet
    const { data: destWallet } = await (supabase as any)
      .from("wallet_accounts")
      .select("balance_cash")
      .eq("id", split.wallet_account_id)
      .single();

    if (destWallet) {
      await (supabase as any).from("wallet_accounts").update({
        balance_cash: Number(destWallet.balance_cash) + split.net_amount,
        updated_at: new Date().toISOString(),
      }).eq("id", split.wallet_account_id);

      // Ledger credit
      await (supabase as any).from("wallet_ledger_entries").insert({
        wallet_account_id: split.wallet_account_id,
        direction: "credit",
        amount: split.net_amount,
        currency: "AED",
        entry_type: "settlement",
        reference_type: "order",
        reference_id: params.orderId,
        status: "posted",
      });
    }

    // Mark split settled
    await (supabase as any).from("wallet_order_splits").update({
      split_status: "settled",
      updated_at: new Date().toISOString(),
    }).eq("id", split.id);
  }

  // Unlock customer funds (already debited at authorize)
  const { data: order } = await (supabase as any).from("orders").select("customer_wallet_id, gross_amount").eq("id", params.orderId).single();
  if (order?.customer_wallet_id) {
    const { data: cw } = await (supabase as any).from("wallet_accounts").select("balance_locked").eq("id", order.customer_wallet_id).single();
    if (cw) {
      await (supabase as any).from("wallet_accounts").update({
        balance_locked: Math.max(0, Number(cw.balance_locked) - Number(order.gross_amount)),
        updated_at: new Date().toISOString(),
      }).eq("id", order.customer_wallet_id);
    }
  }

  // Update order
  await (supabase as any).from("orders").update({
    payment_status: "settled",
    wallet_status: "settled",
    settlement_status: "settled",
  }).eq("id", params.orderId);

  platformBus.emit("wallet:payment_completed", { orderId: params.orderId, stage: "settled" }, "wallet");
  return { ok: true };
}

// ── 10. reverseOrderPayment ──────────────────────────────
export async function reverseOrderPayment(params: { orderId: string }) {
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("customer_wallet_id, gross_amount, wallet_status")
    .eq("id", params.orderId)
    .single();

  if (!order) throw new Error("Order not found");

  // Refund customer
  if (order.customer_wallet_id) {
    const { data: cw } = await (supabase as any).from("wallet_accounts").select("balance_cash, balance_locked").eq("id", order.customer_wallet_id).single();
    if (cw) {
      await (supabase as any).from("wallet_accounts").update({
        balance_cash: Number(cw.balance_cash) + Number(order.gross_amount),
        balance_locked: Math.max(0, Number(cw.balance_locked) - Number(order.gross_amount)),
        updated_at: new Date().toISOString(),
      }).eq("id", order.customer_wallet_id);

      // Reversal ledger
      await (supabase as any).from("wallet_ledger_entries").insert({
        wallet_account_id: order.customer_wallet_id,
        direction: "credit",
        amount: Number(order.gross_amount),
        currency: "AED",
        entry_type: "reversal",
        reference_type: "order",
        reference_id: params.orderId,
        status: "posted",
      });
    }
  }

  // Reverse splits
  await (supabase as any).from("wallet_order_splits").update({
    split_status: "reversed",
    updated_at: new Date().toISOString(),
  }).eq("order_id", params.orderId);

  // Update order
  await (supabase as any).from("orders").update({
    payment_status: "reversed",
    wallet_status: "reversed",
    settlement_status: "reversed",
    status: "cancelled",
  }).eq("id", params.orderId);

  platformBus.emit("wallet:payment_completed", { orderId: params.orderId, stage: "reversed" }, "wallet");
  return { ok: true };
}
