import { supabase } from "@/integrations/supabase/client";

export async function detectAbandonedCart(params: { cartId: string }) {
  const { data: cart, error: cartError } = await (supabase as any)
    .from("storefront_carts")
    .select("*")
    .eq("id", params.cartId)
    .maybeSingle();

  if (cartError) throw cartError;
  if (!cart || cart.status !== "active") return null;

  const { data: items, error: itemsError } = await (supabase as any)
    .from("storefront_cart_items")
    .select("*")
    .eq("cart_id", params.cartId);

  if (itemsError) throw itemsError;

  const subtotal = Number(
    (items ?? []).reduce((sum: number, row: any) => sum + Number(row.unit_price ?? 0) * Number(row.quantity ?? 1), 0).toFixed(2)
  );
  const itemCount = (items ?? []).reduce((sum: number, row: any) => sum + Number(row.quantity ?? 1), 0);

  const { data, error } = await (supabase as any)
    .from("abandoned_cart_events")
    .insert({
      workspace_id: cart.workspace_id ?? null,
      cart_id: cart.id,
      customer_user_id: cart.user_id ?? null,
      guest_id: cart.guest_id ?? null,
      subtotal,
      item_count: itemCount,
      status: "detected",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markAbandonedCartContacted(eventId: string) {
  const { data, error } = await (supabase as any)
    .from("abandoned_cart_events")
    .update({ status: "contacted" })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markAbandonedCartConverted(eventId: string) {
  const { data, error } = await (supabase as any)
    .from("abandoned_cart_events")
    .update({ status: "converted", converted_at: new Date().toISOString() })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
