/**
 * WishlistSaveLater — Wishlist system with lists, sharing, price alerts
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Heart, Share2, Bell, Trash2, Plus, Copy, Check, Globe, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode?: "buyer" | "seller";
  catalogItems?: any[];
}

export default function WishlistSaveLater({ shopId, mode = "buyer", catalogItems = [] }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertItemId, setAlertItemId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: wishlists = [], isLoading } = useQuery({
    queryKey: ["wishlists", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_wishlists")
        .select("*, storefront_wishlist_items(*)")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && mode === "buyer",
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["price-alerts", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_price_alerts")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && mode === "buyer",
  });

  const createWishlist = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_wishlists").insert({
        user_id: user!.id,
        shop_id: shopId,
        name: newName || "My Wishlist",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlists"] }); setNewName(""); toast.success("Wishlist created"); },
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      await (supabase as any).from("storefront_wishlists").update({ is_public: !isPublic }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlists"] }),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      await (supabase as any).from("storefront_wishlist_items").delete().eq("id", itemId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlists"] }),
  });

  const deleteWishlist = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_wishlists").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlists"] }); toast.success("Wishlist deleted"); },
  });

  const createAlert = useMutation({
    mutationFn: async () => {
      if (!alertItemId || !alertPrice) return;
      const item = catalogItems.find((i: any) => i.id === alertItemId);
      await (supabase as any).from("storefront_price_alerts").insert({
        user_id: user!.id,
        item_id: alertItemId,
        shop_id: shopId,
        target_price: parseFloat(alertPrice),
        original_price: item?.price || 0,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["price-alerts"] }); setAlertPrice(""); setAlertItemId(null); toast.success("Price alert set"); },
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_price_alerts").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-alerts"] }),
  });

  const shareWishlist = async (token: string) => {
    const url = `${window.location.origin}/s/${shopId}?wishlist=${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    toast.success("Link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  if (!user) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Heart className="w-4 h-4 text-destructive" />
            Wishlists & Price Alerts
          </h3>
          <Badge variant="outline" className="text-2xs">{wishlists.length} lists</Badge>
        </div>

        {/* Create new */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New wishlist name..."
            className="flex-1 h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-xs" onClick={() => createWishlist.mutate()} disabled={createWishlist.isPending}>
            <Plus className="w-3 h-3 mr-1" /> Create
          </Button>
        </div>

        {/* Wishlists */}
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : wishlists.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No wishlists yet. Create one above!</p>
        ) : (
          <div className="space-y-3">
            {wishlists.map((wl: any) => (
              <div key={wl.id} className="border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{wl.name}</span>
                    <Badge variant="secondary" className="text-2xs">
                      {wl.storefront_wishlist_items?.length || 0} items
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => togglePublic.mutate({ id: wl.id, isPublic: wl.is_public })}>
                      {wl.is_public ? <Globe className="w-3.5 h-3.5 text-primary" /> : <Lock className="w-3.5 h-3.5" />}
                    </Button>
                    {wl.is_public && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => shareWishlist(wl.share_token)}>
                        {copied === wl.share_token ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteWishlist.mutate(wl.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {(wl.storefront_wishlist_items || []).map((item: any) => {
                  const catalog = catalogItems.find((c: any) => c.id === item.item_id);
                  return (
                    <div key={item.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{catalog?.title || "Product"}</p>
                        <p className="text-2xs text-muted-foreground">
                          Added at {item.price_at_add?.toFixed(2) || "—"}
                          {catalog?.price && catalog.price < item.price_at_add && (
                            <span className="text-primary ml-1">↓ Now {catalog.price.toFixed(2)}</span>
                          )}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem.mutate(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Price Alerts */}
        <div className="border-t border-border pt-3 space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Price Alerts
          </h4>
          <div className="flex gap-2">
            <select
              value={alertItemId || ""}
              onChange={e => setAlertItemId(e.target.value || null)}
              className="flex-1 h-8 text-xs rounded-md border border-border bg-card px-2"
            >
              <option value="">Select product...</option>
              {catalogItems.map((item: any) => (
                <option key={item.id} value={item.id}>{item.title} ({item.price})</option>
              ))}
            </select>
            <Input
              type="number"
              value={alertPrice}
              onChange={e => setAlertPrice(e.target.value)}
              placeholder="Target"
              className="w-20 h-8 text-xs"
            />
            <Button size="sm" className="h-8 text-xs" onClick={() => createAlert.mutate()} disabled={!alertItemId || !alertPrice}>
              Set
            </Button>
          </div>
          {alerts.map((alert: any) => {
            const item = catalogItems.find((c: any) => c.id === alert.item_id);
            return (
              <div key={alert.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg p-2">
                <Bell className={`w-3 h-3 ${alert.triggered ? "text-primary" : "text-muted-foreground"}`} />
                <span className="flex-1 truncate">{item?.title || "Product"}: alert at ≤{alert.target_price}</span>
                {alert.triggered && <Badge className="text-2xs bg-primary/10 text-primary">Triggered!</Badge>}
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteAlert.mutate(alert.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
