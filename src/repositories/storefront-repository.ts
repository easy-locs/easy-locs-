/**
 * storefront-repository — DB operations for storefront (analytics, cart, coupons).
 */
import { supabase } from "@/integrations/supabase/client";

// ── Analytics ──
export async function insertAnalyticsEvent(payload: Record<string, any>) {
  await (supabase as any).from("storefront_analytics_events").insert(payload);
}

// ── Cart ──
export async function findActiveCart(shopId: string, userId: string) {
  const { data } = await (supabase as any)
    .from("storefront_carts")
    .select("id")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export async function createCart(shopId: string, userId: string) {
  const { data } = await (supabase as any)
    .from("storefront_carts")
    .insert({ shop_id: shopId, user_id: userId, currency: "EUR" })
    .select("id")
    .single();
  return data;
}

export async function fetchCartItems(cartId: string) {
  const { data } = await (supabase as any)
    .from("storefront_cart_items")
    .select("*, catalog_items(title, photo_url)")
    .eq("cart_id", cartId);
  return data ?? [];
}

export async function fetchItemStock(itemId: string) {
  const { data } = await (supabase as any)
    .from("catalog_items")
    .select("track_inventory, stock_quantity, available")
    .eq("id", itemId)
    .single();
  return data;
}

export async function upsertCartItem(
  cartId: string,
  itemId: string,
  variantId: string | null,
  quantity: number,
  unitPrice: number,
  existingId?: string,
) {
  if (existingId) {
    await (supabase as any).from("storefront_cart_items").update({ quantity }).eq("id", existingId);
  } else {
    await (supabase as any).from("storefront_cart_items").insert({
      cart_id: cartId, item_id: itemId, variant_id: variantId, quantity, unit_price: unitPrice,
    });
  }
}

export async function deleteCartItem(cartItemId: string) {
  await (supabase as any).from("storefront_cart_items").delete().eq("id", cartItemId);
}

export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  if (quantity <= 0) {
    await deleteCartItem(cartItemId);
  } else {
    await (supabase as any).from("storefront_cart_items").update({ quantity }).eq("id", cartItemId);
  }
}

export async function clearCartItems(cartId: string) {
  await (supabase as any).from("storefront_cart_items").delete().eq("cart_id", cartId);
}

// ── Coupons ──
export async function fetchCouponByCode(shopId: string, code: string) {
  const { data } = await (supabase as any)
    .from("storefront_coupons")
    .select("*")
    .eq("shop_id", shopId)
    .eq("code", code.trim().toUpperCase())
    .eq("active", true)
    .maybeSingle();
  return data;
}

export async function countCouponUsage(couponId: string, userId: string) {
  const { count } = await (supabase as any)
    .from("storefront_coupon_usage")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId)
    .eq("user_id", userId);
  return count || 0;
}

export async function recordCouponUsage(couponId: string, userId: string, orderId: string | null, discountAmount: number) {
  await (supabase as any).from("storefront_coupon_usage").insert({
    coupon_id: couponId, user_id: userId, order_id: orderId, discount_amount: discountAmount,
  });
}

// ── QR Shop Resolution ──
export async function resolveShopBySlug(slug: string) {
  const { data } = await (supabase as any)
    .from("storefront_pages")
    .select("user_id, name, route_status")
    .eq("slug", slug)
    .neq("route_status", "broken")
    .maybeSingle();
  return data;
}
