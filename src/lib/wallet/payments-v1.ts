/**
 * payments-v1.ts — Universal multi-vertical settlement engine for Easy-Locs.
 * Currency-aware: resolves currency from country/merchant, never hardcodes.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  getOrCreateWalletAccount,
  calculateCommission,
  prepareOrderSplit,
  authorizeWalletPayment,
  captureWalletPayment,
  settleOrderPaymentV2,
  reverseOrderPayment,
  attachDriverToSplit,
} from "@/lib/wallet/wallet-engine";
import { calculateDynamicDeliveryPrice, type AISignals } from "@/lib/wallet/delivery-pricing-engine";
import { getCurrencyFromCountry } from "@/lib/currency";

// ── Types ─────────────────────────────────────────────────
export type OrderMode =
  | "onsite_qr"
  | "takeaway"
  | "delivery_food"
  | "delivery_retail"
  | "service_booking"
  | "hospitality_booking"
  | "property_booking";

export interface SettlementInput {
  orderId: string;
  grossAmount: number;
  orderMode: OrderMode;
  countryCode: string;
  city?: string;
  vertical: string;
  customerWalletId: string;
  merchantProfileId: string;
  pin: string;
  distanceKm?: number;
  isPeak?: boolean;
  isNight?: boolean;
  isPremiumZone?: boolean;
  vehicleType?: "bike" | "car" | "van" | "truck";
  weightKg?: number;
  volumeL?: number;
  aiSignals?: AISignals;
  driverProfileId?: string;
  isSelfDelivery?: boolean;
}

export interface SettlementResult {
  orderId: string;
  transactionId?: string;
  merchantAmount: number;
  driverAmount: number;
  platformAmount: number;
  deliveryFee: number;
  commissionAmount: number;
  walletStatus: string;
  currency: string;
}

function needsDelivery(mode: OrderMode): boolean {
  return ["delivery_food", "delivery_retail"].includes(mode);
}

function needsDriver(mode: OrderMode, isSelfDelivery?: boolean): boolean {
  return needsDelivery(mode) && !isSelfDelivery;
}

// ── Main: Settle Order Payment (unified) ──────────────────
export async function settleOrderPayment(params: {
  workspaceId?: string;
  buyerWalletId: string;
  merchantWalletId: string;
  platformWalletId?: string;
  amount: number;
  feePct?: number;
  currency?: string;
  orderId: string;
}) {
  return settleOrderPaymentV2({ orderId: params.orderId });
}

// ── Universal Order Payment Flow ──────────────────────────
export async function processUniversalPayment(input: SettlementInput): Promise<SettlementResult> {
  const currency = getCurrencyFromCountry(input.countryCode);

  const merchantWallet = await getOrCreateWalletAccount({
    ownerType: "merchant",
    ownerProfileId: input.merchantProfileId,
    countryCode: input.countryCode,
  });
  const platformWallet = await getOrCreateWalletAccount({ ownerType: "platform", countryCode: input.countryCode });

  const commission = await calculateCommission({
    vertical: input.vertical,
    countryCode: input.countryCode,
    city: input.city,
    grossAmount: input.grossAmount,
  });

  let deliveryFee = 0;
  if (needsDelivery(input.orderMode) && input.distanceKm) {
    const pricing = await calculateDynamicDeliveryPrice(
      {
        countryCode: input.countryCode,
        city: input.city,
        distanceKm: input.distanceKm,
        isPeak: input.isPeak,
        isNight: input.isNight,
        isPremiumZone: input.isPremiumZone,
        vehicleType: input.vehicleType,
        weightKg: input.weightKg,
        volumeL: input.volumeL,
      },
      input.aiSignals
    );
    deliveryFee = pricing.finalFee;
  }

  let driverWalletId: string | undefined;
  if (needsDriver(input.orderMode, input.isSelfDelivery) && input.driverProfileId) {
    const driverWallet = await getOrCreateWalletAccount({
      ownerType: "driver",
      ownerProfileId: input.driverProfileId,
      countryCode: input.countryCode,
    });
    driverWalletId = driverWallet.id;
  }

  const totalAmount = input.grossAmount + deliveryFee;
  const split = await prepareOrderSplit({
    orderId: input.orderId,
    grossAmount: totalAmount,
    deliveryFee,
    commissionAmount: commission.finalCommissionAmount,
    merchantWalletId: merchantWallet.id,
    platformWalletId: platformWallet.id,
    driverWalletId,
    isSelfDelivery: input.isSelfDelivery,
    currency,
  });

  await (supabase as any).from("orders").update({
    gross_amount: totalAmount,
    delivery_fee: deliveryFee,
    currency,
  }).eq("id", input.orderId);

  const auth = await authorizeWalletPayment({
    orderId: input.orderId,
    customerWalletId: input.customerWalletId,
    amount: totalAmount,
    pin: input.pin,
    currency,
  });

  await captureWalletPayment({ orderId: input.orderId });

  return {
    orderId: input.orderId,
    transactionId: auth?.transaction_id,
    merchantAmount: split.merchantAmount,
    driverAmount: split.driverAmount,
    platformAmount: split.platformAmount,
    deliveryFee,
    commissionAmount: commission.finalCommissionAmount,
    walletStatus: "captured",
    currency,
  };
}

// ── Late Driver Assignment ────────────────────────────────
export async function assignDriverLate(params: {
  orderId: string;
  driverProfileId: string;
  deliveryFee: number;
  countryCode?: string;
}) {
  const driverWallet = await getOrCreateWalletAccount({
    ownerType: "driver",
    ownerProfileId: params.driverProfileId,
    countryCode: params.countryCode,
  });

  await attachDriverToSplit({
    orderId: params.orderId,
    driverWalletId: driverWallet.id,
    deliveryFee: params.deliveryFee,
  });

  await (supabase as any).from("orders").update({
    driver_wallet_id: driverWallet.id,
    driver_amount: params.deliveryFee,
  }).eq("id", params.orderId);

  return { ok: true, driverWalletId: driverWallet.id };
}

// ── Cancel Before Completion ──────────────────────────────
export async function cancelOrderBeforeCompletion(orderId: string) {
  const { data: order } = await (supabase as any)
    .from("orders")
    .select("wallet_status, settlement_status")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Order not found");
  if (order.settlement_status === "settled") {
    throw new Error("Cannot cancel a settled order — use refund flow");
  }

  return reverseOrderPayment({ orderId });
}

// ── Settle After Validation ───────────────────────────────
export async function settleAfterValidation(orderId: string) {
  return settleOrderPaymentV2({ orderId });
}

// ── Partial Refund (future-ready stub) ────────────────────
export async function processPartialRefund(_params: {
  orderId: string;
  refundAmount: number;
  reason: string;
}) {
  throw new Error("Partial refunds not yet implemented — coming soon");
}
