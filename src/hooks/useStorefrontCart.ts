/**
 * useStorefrontCart — Universal cart hook for storefront shops.
 * DB calls delegated to storefront-repository.
 */
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  findActiveCart, createCart, fetchCartItems, fetchItemStock,
  upsertCartItem, deleteCartItem, updateCartItemQuantity, clearCartItems,
} from "@/repositories/storefront-repository";

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

  const ensureCart = useCallback(async (): Promise<string | null> => {
    if (!shopId || !user) return null;
    if (cartId) return cartId;

    const existing = await findActiveCart(shopId, user.id);
    if (existing) { setCartId(existing.id); return existing.id; }

    const newCart = await createCart(shopId, user.id);
    if (newCart) { setCartId(newCart.id); return newCart.id; }
    return null;
  }, [shopId, user, cartId]);

  const loadItems = useCallback(async (cId: string) => {
    const data = await fetchCartItems(cId);
    setItems(
      data.map((d: any) => ({
        id: d.id, item_id: d.item_id, variant_id: d.variant_id,
        quantity: d.quantity, unit_price: d.unit_price,
        title: d.catalog_items?.title, photo_url: d.catalog_items?.photo_url,
      }))
    );
  }, []);

  useEffect(() => { if (cartId) loadItems(cartId); }, [cartId, loadItems]);
  useEffect(() => { if (shopId && user) ensureCart(); }, [shopId, user, ensureCart]);

  const addItem = useCallback(async (itemId: string, price: number, variantId?: string) => {
    setLoading(true);
    try {
      const cId = await ensureCart();
      if (!cId) return;

      const stockInfo = await fetchItemStock(itemId);
      if (stockInfo && !stockInfo.available) { toast.error("This item is currently unavailable"); return; }
      if (stockInfo?.track_inventory && stockInfo.stock_quantity != null) {
        const existingQty = items.find(i => i.item_id === itemId)?.quantity || 0;
        if (existingQty + 1 > stockInfo.stock_quantity) { toast.error(`Only ${stockInfo.stock_quantity} left in stock`); return; }
      }

      const existing = items.find(i => i.item_id === itemId && i.variant_id === (variantId || null));
      await upsertCartItem(cId, itemId, variantId || null, existing ? existing.quantity + 1 : 1, price, existing?.id);
      await loadItems(cId);
      toast.success("Added to cart");
    } catch (e: any) {
      toast.error(e.message || "Failed to add item");
    } finally {
      setLoading(false);
    }
  }, [ensureCart, items, loadItems]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    await updateCartItemQuantity(cartItemId, quantity);
    if (cartId) loadItems(cartId);
  }, [cartId, loadItems]);

  const removeItem = useCallback(async (cartItemId: string) => {
    await deleteCartItem(cartItemId);
    if (cartId) loadItems(cartId);
  }, [cartId, loadItems]);

  const clearCart = useCallback(async () => {
    if (!cartId) return;
    await clearCartItems(cartId);
    setItems([]);
  }, [cartId]);

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return { items, total, itemCount, loading, addItem, updateQuantity, removeItem, clearCart, cartId };
}
