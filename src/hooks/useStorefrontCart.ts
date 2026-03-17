/**
 * useStorefrontCart — Universal cart hook for storefront shops.
 * Manages add/remove/update/clear with Supabase persistence.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  item_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  title?: string;
  photo_url?: string;
}

export function useStorefrontCart(shopId: string | undefined) {
  const { user } = useAuth();
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load or create cart
  const ensureCart = useCallback(async (): Promise<string | null> => {
    if (!shopId || !user) return null;
    if (cartId) return cartId;

    const { data: existing } = await (supabase as any)
      .from("storefront_carts")
      .select("id")
      .eq("shop_id", shopId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      setCartId(existing.id);
      return existing.id;
    }

    const { data: newCart } = await (supabase as any)
      .from("storefront_carts")
      .insert({ shop_id: shopId, user_id: user.id, currency: "EUR" })
      .select("id")
      .single();

    if (newCart) {
      setCartId(newCart.id);
      return newCart.id;
    }
    return null;
  }, [shopId, user, cartId]);

  // Load items
  const loadItems = useCallback(async (cId: string) => {
    const { data } = await (supabase as any)
      .from("storefront_cart_items")
      .select("*, catalog_items(title, photo_url)")
      .eq("cart_id", cId);

    setItems(
      (data || []).map((d: any) => ({
        id: d.id,
        item_id: d.item_id,
        variant_id: d.variant_id,
        quantity: d.quantity,
        unit_price: d.unit_price,
        title: d.catalog_items?.title,
        photo_url: d.catalog_items?.photo_url,
      }))
    );
  }, []);

  useEffect(() => {
    if (cartId) loadItems(cartId);
  }, [cartId, loadItems]);

  // Init cart on mount
  useEffect(() => {
    if (shopId && user) {
      ensureCart();
    }
  }, [shopId, user, ensureCart]);

  const addItem = useCallback(async (itemId: string, price: number, variantId?: string) => {
    setLoading(true);
    try {
      const cId = await ensureCart();
      if (!cId) return;

      // PASS104: Stock validation before adding
      const { data: stockInfo } = await (supabase as any)
        .from("catalog_items")
        .select("track_inventory, stock_quantity, available")
        .eq("id", itemId)
        .single();

      if (stockInfo && !stockInfo.available) {
        toast.error("This item is currently unavailable");
        return;
      }
      if (stockInfo?.track_inventory && stockInfo.stock_quantity != null) {
        const existingQty = items.find(i => i.item_id === itemId)?.quantity || 0;
        if (existingQty + 1 > stockInfo.stock_quantity) {
          toast.error(`Only ${stockInfo.stock_quantity} left in stock`);
          return;
        }
      }

      // Check existing
      const existing = items.find(i => i.item_id === itemId && i.variant_id === (variantId || null));
      if (existing) {
        await (supabase as any)
          .from("storefront_cart_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
      } else {
        await (supabase as any)
          .from("storefront_cart_items")
          .insert({
            cart_id: cId,
            item_id: itemId,
            variant_id: variantId || null,
            quantity: 1,
            unit_price: price,
          });
      }
      await loadItems(cId);
      toast.success("Added to cart");
    } catch (e: any) {
      toast.error(e.message || "Failed to add item");
    } finally {
      setLoading(false);
    }
  }, [ensureCart, items, loadItems]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      await (supabase as any).from("storefront_cart_items").delete().eq("id", cartItemId);
    } else {
      await (supabase as any).from("storefront_cart_items").update({ quantity }).eq("id", cartItemId);
    }
    if (cartId) loadItems(cartId);
  }, [cartId, loadItems]);

  const removeItem = useCallback(async (cartItemId: string) => {
    await (supabase as any).from("storefront_cart_items").delete().eq("id", cartItemId);
    if (cartId) loadItems(cartId);
  }, [cartId, loadItems]);

  const clearCart = useCallback(async () => {
    if (!cartId) return;
    await (supabase as any).from("storefront_cart_items").delete().eq("cart_id", cartId);
    setItems([]);
  }, [cartId]);

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return { items, total, itemCount, loading, addItem, updateQuantity, removeItem, clearCart, cartId };
}
