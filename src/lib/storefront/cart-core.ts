/**
 * Cart core — guest-aware cart for storefront ordering.
 */
import { supabase } from "@/integrations/supabase/client";
import { getGuestId } from "@/lib/auth/guest-session";

async function tryGetCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getOrCreateActiveCart(params: {
  merchantProfileId: string;
  workspaceId?: string;
  shopId?: string;
}) {
  const userId = await tryGetCurrentUserId();
  const guestId = userId ? null : getGuestId();

  let query = (supabase as any)
    .from("storefront_carts")
    .select("*")
    .eq("shop_id", params.shopId ?? params.merchantProfileId)
    .eq("status", "active");

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("guest_id", guestId);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing;

  const insertPayload: Record<string, any> = {
    shop_id: params.shopId ?? params.merchantProfileId,
    currency: "AED",
    status: "active",
  };

  if (userId) insertPayload.user_id = userId;
  else insertPayload.guest_id = guestId;

  const { data, error } = await (supabase as any)
    .from("storefront_carts")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addCartItem(params: {
  cartId: string;
  itemId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}) {
  const { data: existing } = await (supabase as any)
    .from("storefront_cart_items")
    .select("*")
    .eq("cart_id", params.cartId)
    .eq("item_id", params.itemId)
    .eq("variant_id", params.variantId ?? null)
    .maybeSingle();

  if (existing) {
    const { data, error } = await (supabase as any)
      .from("storefront_cart_items")
      .update({ quantity: existing.quantity + params.quantity })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await (supabase as any)
    .from("storefront_cart_items")
    .insert({
      cart_id: params.cartId,
      item_id: params.itemId,
      variant_id: params.variantId ?? null,
      quantity: params.quantity,
      unit_price: params.unitPrice,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeCartItem(cartItemId: string) {
  const { error } = await (supabase as any)
    .from("storefront_cart_items")
    .delete()
    .eq("id", cartItemId);
  if (error) throw error;
}

export async function clearCart(cartId: string) {
  const { error } = await (supabase as any)
    .from("storefront_cart_items")
    .delete()
    .eq("cart_id", cartId);
  if (error) throw error;
}
