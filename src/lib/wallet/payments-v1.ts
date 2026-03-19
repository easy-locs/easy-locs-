/**
 * payments-v1.ts — Universal multi-vertical settlement engine for Easy-Locs.
 * Supports: onsite QR, takeaway, delivery, self-delivery, late driver, cancellation,
 * hospitality, property, retail, and multi-vendor (future).
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
  // Delivery-specific
  distanceKm?: number;
  isPeak?: boolean;
  isNight?: boolean;
  isPremiumZone?: boolean;
  vehicleType?: "bike" | "car" | "van" | "truck";
  weightKg?: number;
  volumeL?: number;
  aiSignals?: AISignals;
  // Driver
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
}

// ── Helpers ───────────────────────────────────────────────
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
  // Delegate to v2 server-side settlement
  return settleOrderPaymentV2({ orderId: params.orderId });
}

// ── Universal Order Payment Flow ──────────────────────────
export async function processUniversalPayment(input: SettlementInput): Promise<SettlementResult> {
  // 1. Get/create wallets
  const merchantWallet = await getOrCreateWalletAccount({
    ownerType: "merchant",
    ownerProfileId: input.merchantProfileId,
  });
  const platformWallet = await getOrCreateWalletAccount({ ownerType: "platform" });

  // 2. Calculate commission
  const commission = await calculateCommission({
    vertical: input.vertical,
    countryCode: input.countryCode,
    city: input.city,
    grossAmount: input.grossAmount,
  });

  // 3. Calculate delivery fee (only for delivery modes)
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

  // 4. Get driver wallet if needed
  let driverWalletId: string | undefined;
  if (needsDriver(input.orderMode, input.isSelfDelivery) && input.driverProfileId) {
    const driverWallet = await getOrCreateWalletAccount({
      ownerType: "driver",
      ownerProfileId: input.driverProfileId,
    });
    driverWalletId = driverWallet.id;
  }

  // 5. Prepare order split
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
  });

  // 6. Update order with delivery fee
  await (supabase as any).from("orders").update({
    gross_amount: totalAmount,
    delivery_fee: deliveryFee,
  }).eq("id", input.orderId);

  // 7. Authorize payment
  const auth = await authorizeWalletPayment({
    orderId: input.orderId,
    customerWalletId: input.customerWalletId,
    amount: totalAmount,
    pin: input.pin,
  });

  // 8. Capture immediately
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
  };
}

// ── Late Driver Assignment ────────────────────────────────
export async function assignDriverLate(params: {
  orderId: string;
  driverProfileId: string;
  deliveryFee: number;
}) {
  const driverWallet = await getOrCreateWalletAccount({
    ownerType: "driver",
    ownerProfileId: params.driverProfileId,
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

  // Can only cancel if not yet settled
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
  // Future: will create a partial reversal + adjustment entries
  throw new Error("Partial refunds not yet implemented — coming soon");
}
