import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Trash2, Loader2, Package } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export default function WishlistPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      const { data } = await cFrom("user_wishlist_items")
        .select("*, catalog_items(id, title, price, photo_url, photo_urls, available, stock_quantity, compare_at_price, shop_id, storefront_pages!catalog_items_shop_id_fkey(name, slug, currency))")
        .eq("user_id", user!.id)
        .order("added_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const removeItem = async (wishlistId: string) => {
    await cFrom("user_wishlist_items").delete().eq("id", wishlistId);
    qc.invalidateQueries({ queryKey: ["wishlist", user?.id] });
    toast.success("Removed from wishlist");
  };

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="My Wishlist" icon={<Heart className="h-5 w-5 text-red-500" />} backTo="/me" />
      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : wishlistItems.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-10 w-10 text-muted-foreground/40" />}
            title="Your wishlist is empty"
            description="Save products you love by tapping the heart icon"
          />
        ) : (
          <div className="space-y-3">
            {wishlistItems.map((wi: any) => {
              const item = wi.catalog_items;
              if (!item) return null;
              const shop = item.storefront_pages;
              const photo = item.photo_url || (item.photo_urls && item.photo_urls[0]);
              const inStock = item.available && item.stock_quantity > 0;

              return (
                <AppCard key={wi.id}>
                  <CardContent className="p-3 flex gap-3">
                    <Link to={`/product/${item.id}`} className="shrink-0">
                      {photo ? (
                        <img src={photo} alt={item.title} className="w-20 h-20 rounded-lg object-cover" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0 space-y-1">
                      <Link to={`/product/${item.id}`}>
                        <p className="text-sm font-semibold line-clamp-2">{item.title}</p>
                      </Link>
                      {shop && <p className="text-[0.625rem] text-muted-foreground">{shop.name}</p>}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{item.price} {shop?.currency || "AED"}</span>
                        {item.compare_at_price > item.price && (
                          <span className="text-[0.625rem] text-muted-foreground line-through">{item.compare_at_price}</span>
                        )}
                      </div>
                      <Badge variant={inStock ? "secondary" : "destructive"} className="text-[0.625rem]">
                        {inStock ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(wi.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </AppCard>
              );
            })}
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
