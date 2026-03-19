/**
 * Dispatch ↔ Wallet Linkage — Connects driver assignment to order wallet splits.
 * Uses the unified wallet engine for all operations.
 */
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateWalletAccount, attachDriverToSplit } from "@/lib/wallet/wallet-engine";
import { getCurrencyFromCountry } from "@/lib/currency";

// ── 1. Attach driver wallet to order ──────────────────────
export async function attachDriverWalletToOrder(params: {
  orderId: string;
  driverProfileId: string;
  driverUserId: string;
  deliveryFee: number;
  countryCode?: string;
}) {
  const currency = getCurrencyFromCountry(params.countryCode);

  // Get or create driver wallet
  const driverWallet = await getOrCreateWalletAccount({
    ownerType: "driver",
    ownerUserId: params.driverUserId,
    currency,
    countryCode: params.countryCode,
  });

  // Update order with driver wallet reference
  await (supabase as any)
    .from("orders")
    .update({
      driver_wallet_id: driverWallet.id,
      driver_amount: params.deliveryFee,
      delivery_status: "driver_assigned",
    } as any)
    .eq("id", params.orderId);

  // Attach or update driver split
  await attachDriverToSplit({
    orderId: params.orderId,
    driverWalletId: driverWallet.id,
    deliveryFee: params.deliveryFee,
  });

  return { driverWalletId: driverWallet.id };
}

// ── 2. Late driver assignment (payment already captured) ──
export async function handleLateDriverAssignment(params: {
  orderId: string;
  driverProfileId: string;
  driverUserId: string;
  deliveryFee: number;
  countryCode?: string;
}) {
  // Same logic — attachDriverToSplit is idempotent (upsert split)
  return attachDriverWalletToOrder(params);
}

// ── 3. Self-delivery settlement ───────────────────────────
export async function handleSelfDeliverySettlement(params: {
  orderId: string;
}) {
  // No external driver split needed
  // Merchant keeps delivery economics
  // Just ensure no driver split exists or mark it N/A
  const { data: existingSplits } = await (supabase as any)
    .from("wallet_order_splits")
    .select("id")
    .eq("order_id", params.orderId)
    .eq("split_party_type", "driver");

  if (existingSplits?.length) {
    await (supabase as any)
      .from("wallet_order_splits")
      .update({ split_status: "cancelled", net_amount: 0 } as any)
      .eq("order_id", params.orderId)
      .eq("split_party_type", "driver");
  }

  return { ok: true, selfDelivery: true };
}
