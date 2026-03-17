/**
 * ReorderEngine — PASS133: One-tap reorder from past orders.
 * Auto-detects favorites, shows quick reorder from buyer dashboard and shop page.
 * Optimized for fast repeat purchases (food / delivery use case).
 */
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Star, ShoppingBag, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useStorefrontCart } from "@/hooks/useStorefrontCart";

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

interface Props {
  shopId: string;
  compact?: boolean;
}

export default function ReorderEngine({ shopId, compact = false }: Props) {
  const { user } = useAuth();
  const cart = useStorefrontCart(shopId);

  // Fetch past completed orders for this buyer in this shop
  const { data, isLoading } = useQuery({
    queryKey: ["reorder-data", shopId, user?.id],
    queryFn: async () => {
      // Get completed orders with items
      const { data: orders } = await (supabase as any)
        .from("storefront_orders")
        .select("id, total, currency, created_at, storefront_order_items(id, item_id, title, quantity, unit_price, variant_id)")
        .eq("shop_id", shopId)
        .eq("buyer_id", user!.id)
        .in("status", ["completed", "shipped"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (!orders || orders.length === 0) return { lastOrder: null, favorites: [], orderCount: 0 };

      // Count item frequency across all orders to detect favorites
      const itemFreq = new Map<string, { item_id: string; title: string; unit_price: number; count: number; variant_id: string | null }>();
      for (const order of orders) {
        for (const item of (order.storefront_order_items || [])) {
          if (!item.item_id) continue;
          const key = `${item.item_id}-${item.variant_id || ""}`;
          const existing = itemFreq.get(key);
          if (existing) {
            existing.count += item.quantity || 1;
          } else {
            itemFreq.set(key, {
              item_id: item.item_id,
              title: item.title,
              unit_price: item.unit_price || 0,
              count: item.quantity || 1,
              variant_id: item.variant_id,
            });
          }
        }
      }

      // Sort by frequency — top items are favorites
      const favorites = Array.from(itemFreq.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        lastOrder: orders[0],
        favorites,
        orderCount: orders.length,
      };
    },
    enabled: !!shopId && !!user,
    staleTime: 60_000,
  });

  const reorderAll = useCallback(async (order: any) => {
    const items = order.storefront_order_items || [];
    if (items.length === 0) {
      toast.error("No items in this order");
      return;
    }

    let added = 0;
    for (const item of items) {
      if (!item.item_id) continue;
      for (let i = 0; i < (item.quantity || 1); i++) {
        await cart.addItem(item.item_id, item.unit_price || 0, item.variant_id || undefined);
        added++;
      }
    }
    toast.success(`${added} item${added > 1 ? "s" : ""} added to cart`);
  }, [cart]);

  const addFavorite = useCallback(async (fav: any) => {
    await cart.addItem(fav.item_id, fav.unit_price, fav.variant_id || undefined);
  }, [cart]);

  if (isLoading) return null;
  if (!data || (!data.lastOrder && data.favorites.length === 0)) return null;

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {data.lastOrder && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[10px] gap-1 shrink-0"
            onClick={() => reorderAll(data.lastOrder)}
            disabled={cart.loading}
          >
            <RotateCcw className="h-3 w-3" /> Reorder last ({fmtPrice(data.lastOrder.total, data.lastOrder.currency)})
          </Button>
        )}
        {data.favorites.slice(0, 3).map((fav) => (
          <Button
            key={`${fav.item_id}-${fav.variant_id}`}
            size="sm"
            variant="ghost"
            className="h-8 text-[10px] gap-1 shrink-0"
            onClick={() => addFavorite(fav)}
            disabled={cart.loading}
          >
            <Star className="h-3 w-3 text-warning" /> {fav.title?.slice(0, 20)}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-warning" /> Quick Reorder
          </h4>
          <Badge variant="outline" className="text-[8px]">{data.orderCount} past orders</Badge>
        </div>

        {/* Last order — one-tap reorder */}
        {data.lastOrder && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium">Last order</p>
              <p className="text-[9px] text-muted-foreground">
                {(data.lastOrder.storefront_order_items || []).length} items · {fmtPrice(data.lastOrder.total, data.lastOrder.currency)}
              </p>
            </div>
            <Button
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => reorderAll(data.lastOrder)}
              disabled={cart.loading}
            >
              <RotateCcw className="h-3 w-3" /> Reorder
            </Button>
          </div>
        )}

        {/* Favorites auto-detected */}
        {data.favorites.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
              <Star className="h-3 w-3 text-warning" /> Your favorites
            </p>
            <div className="space-y-1">
              {data.favorites.map((fav) => (
                <div key={`${fav.item_id}-${fav.variant_id}`} className="flex items-center gap-2 py-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{fav.title}</p>
                    <p className="text-[9px] text-muted-foreground">Ordered {fav.count}x · {fmtPrice(fav.unit_price)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[9px]"
                    onClick={() => addFavorite(fav)}
                    disabled={cart.loading}
                  >
                    + Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
