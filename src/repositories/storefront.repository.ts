/**
 * storefront.repository — All DB operations for storefront components.
 * Covers deal rooms, digital products, returns/refunds.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Deal Room ──

export async function updateDealCounter(dealId: string, amount: number) {
  await (supabase as any).from("deal_rooms").update({
    counter_offer_amount: amount,
    status: "counter_offer",
    updated_at: new Date().toISOString(),
  }).eq("id", dealId);
}

export async function acceptDeal(dealId: string, amount: number) {
  await (supabase as any).from("deal_rooms").update({
    status: "accepted",
    accepted_amount: amount,
    updated_at: new Date().toISOString(),
  }).eq("id", dealId);
}

export async function rejectDeal(dealId: string) {
  await (supabase as any).from("deal_rooms").update({
    status: "cancelled",
    updated_at: new Date().toISOString(),
  }).eq("id", dealId);
}

export async function convertDealToOrder(deal: any, shopId: string) {
  const amount = deal.accepted_amount || deal.current_offer_amount || 0;
  const { data: order } = await (supabase as any).from("storefront_orders").insert({
    shop_id: shopId,
    seller_id: deal.seller_id,
    buyer_id: deal.buyer_id,
    total_amount: amount,
    currency: deal.currency || "AED",
    status: "pending",
    source: "deal_room",
  }).select().single();

  if (order) {
    await (supabase as any).from("deal_rooms").update({
      converted_order_id: order.id,
      status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", deal.id);
  }
  return order;
}

// ── Digital Products ──

export async function createDigitalProduct(shopId: string, userId: string, form: any) {
  await (supabase as any).from("storefront_digital_products").insert({
    shop_id: shopId,
    user_id: userId,
    title: form.title,
    description: form.description || null,
    price: parseFloat(form.price),
    product_type: form.product_type,
    file_url: form.file_url || null,
    preview_url: form.preview_url || null,
    download_limit: parseInt(form.download_limit) || 5,
    currency: form.currency || "AED",
    status: "active",
  });
}

export async function purchaseDigitalProduct(productId: string, buyerId: string, shopId: string, downloadLimit: number) {
  await (supabase as any).from("storefront_digital_purchases").insert({
    product_id: productId,
    buyer_id: buyerId,
    shop_id: shopId,
    max_downloads: downloadLimit,
  });
}

export async function incrementProductSales(productId: string, currentSales: number) {
  await (supabase as any).from("storefront_digital_products").update({
    total_sales: currentSales + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", productId);
}

export async function incrementDownloadCount(purchaseId: string, currentCount: number) {
  await (supabase as any).from("storefront_digital_purchases").update({
    download_count: currentCount + 1,
  }).eq("id", purchaseId);
}

// ── Returns & Refunds ──

export async function createReturn(shopId: string, orderId: string, reason: string, type: string) {
  await (supabase as any).from("storefront_returns").insert({
    shop_id: shopId,
    order_id: orderId,
    reason,
    return_type: type,
    status: "requested",
  });
}

export async function updateReturnStatus(returnId: string, status: string, notes?: string) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === "refunded") updates.refunded_at = new Date().toISOString();
  if (notes) updates.admin_notes = notes;
  await (supabase as any).from("storefront_returns").update(updates).eq("id", returnId);
}
