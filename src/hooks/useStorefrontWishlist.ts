/**
 * useStorefrontWishlist — Buyer-side wishlist for storefront items.
 * Toggle favorites, check status, load full list.
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useStorefrontWishlist(shopId: string | undefined) {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadWishlist = useCallback(async () => {
    if (!user || !shopId) return;
    const { data } = await (supabase as any)
      .from("storefront_wishlist")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("shop_id", shopId);
    setWishlistIds(new Set((data || []).map((d: any) => d.item_id)));
  }, [user, shopId]);

  useEffect(() => { loadWishlist(); }, [loadWishlist]);

  const toggle = useCallback(async (itemId: string) => {
    if (!user || !shopId) return;
    setLoading(true);
    try {
      if (wishlistIds.has(itemId)) {
        await (supabase as any)
          .from("storefront_wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", itemId);
        setWishlistIds(prev => { const n = new Set(prev); n.delete(itemId); return n; });
      } else {
        await (supabase as any)
          .from("storefront_wishlist")
          .insert({ user_id: user.id, shop_id: shopId, item_id: itemId });
        setWishlistIds(prev => new Set(prev).add(itemId));
      }
    } finally {
      setLoading(false);
    }
  }, [user, shopId, wishlistIds]);

  const isFavorite = useCallback((itemId: string) => wishlistIds.has(itemId), [wishlistIds]);

  return { wishlistIds, toggle, isFavorite, loading, count: wishlistIds.size };
}
