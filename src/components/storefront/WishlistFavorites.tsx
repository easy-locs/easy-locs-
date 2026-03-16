/**
 * WishlistFavorites — Buyer wishlist with price alerts and sharing
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Heart, Share2, Bell, Trash2, Loader2, ShoppingBag, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  catalogItems?: any[];
  formatPrice?: (n: number, c?: string) => string;
}

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function WishlistFavorites({ shopId, catalogItems = [], formatPrice }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fmt = formatPrice || fmtPrice;

  // Load wishlist
  const { data: wishlist = [], isLoading } = useQuery({
    queryKey: ["wishlist", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_wishlists")
        .select("*").eq("shop_id", shopId).eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Add to wishlist
  const addToWishlist = useMutation({
    mutationFn: async (item: any) => {
      await (supabase as any).from("storefront_wishlists").insert({
        user_id: user!.id, shop_id: shopId, item_id: item.id,
        price_at_add: item.price,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlist"] }); toast.success("Added to wishlist ❤️"); },
  });

  // Remove from wishlist
  const removeFromWishlist = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_wishlists").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlist"] }); toast.success("Removed from wishlist"); },
  });

  // Toggle alerts
  const toggleAlert = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      await (supabase as any).from("storefront_wishlists").update({ [field]: value }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlist"] }); },
  });

  // Share wishlist
  const shareWishlist = useMutation({
    mutationFn: async () => {
      const itemIds = wishlist.map((w: any) => w.item_id);
      const { data } = await (supabase as any).from("storefront_wishlist_shares").insert({
        user_id: user!.id, shop_id: shopId, item_ids: itemIds,
      }).select("share_token").single();
      return data?.share_token;
    },
    onSuccess: (token) => {
      if (token) {
        navigator.clipboard?.writeText(`${window.location.origin}/s/wishlist/${token}`);
        toast.success("Wishlist link copied!");
      }
    },
  });

  if (!user) return null;
  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  const wishlistItemIds = new Set(wishlist.map((w: any) => w.item_id));

  // Match wishlist items with catalog
  const wishlistWithDetails = wishlist.map((w: any) => {
    const item = catalogItems.find((ci: any) => ci.id === w.item_id);
    return { ...w, item };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4 text-destructive" /> Wishlist ({wishlist.length})
        </h3>
        {wishlist.length > 0 && (
          <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1"
            onClick={() => shareWishlist.mutate()} disabled={shareWishlist.isPending}>
            <Share2 className="h-3 w-3" /> Share
          </Button>
        )}
      </div>

      {/* Quick add buttons for items not in wishlist */}
      {catalogItems.filter(ci => !wishlistItemIds.has(ci.id)).length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {catalogItems.filter(ci => !wishlistItemIds.has(ci.id)).slice(0, 5).map((item: any) => (
            <Button key={item.id} size="sm" variant="outline" className="text-[9px] h-7 shrink-0 gap-1"
              onClick={() => addToWishlist.mutate(item)} disabled={addToWishlist.isPending}>
              <Heart className="h-2.5 w-2.5" /> {item.title?.slice(0, 15)}
            </Button>
          ))}
        </div>
      )}

      {wishlistWithDetails.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">Your wishlist is empty — tap ❤️ on products to save them</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {wishlistWithDetails.map((w: any) => {
            const item = w.item;
            const priceDropped = item && w.price_at_add && item.price < w.price_at_add;
            return (
              <Card key={w.id} className={priceDropped ? "border-success/30" : ""}>
                <CardContent className="p-2.5 flex items-start gap-2">
                  {item?.photo_url ? (
                    <img src={item.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{item?.title || "Product"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-primary">
                        {item ? fmt(item.price, item.currency) : "N/A"}
                      </span>
                      {priceDropped && (
                        <Badge className="text-[7px] bg-success/20 text-success">Price dropped!</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Bell className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[8px] text-muted-foreground">Price</span>
                        <Switch className="scale-75" checked={w.notify_price_drop}
                          onCheckedChange={v => toggleAlert.mutate({ id: w.id, field: "notify_price_drop", value: v })} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-muted-foreground">Stock</span>
                        <Switch className="scale-75" checked={w.notify_back_in_stock}
                          onCheckedChange={v => toggleAlert.mutate({ id: w.id, field: "notify_back_in_stock", value: v })} />
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0"
                    onClick={() => removeFromWishlist.mutate(w.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
