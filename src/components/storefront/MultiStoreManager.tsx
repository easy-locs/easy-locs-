/**
 * MultiStoreManager — Multi-store dashboard for sellers with multiple shops
 * Consolidated analytics, centralized management, store groups
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Store, Plus, BarChart3, Package, ShoppingBag, Loader2, Layers, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default function MultiStoreManager() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Load all user shops
  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["my-all-shops", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_pages")
        .select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Load store groups
  const { data: groups = [] } = useQuery({
    queryKey: ["store-groups", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_store_groups")
        .select("*, storefront_store_group_members(shop_id)")
        .eq("owner_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Load consolidated stats per shop
  const { data: shopStats = {} } = useQuery({
    queryKey: ["multi-shop-stats", user?.id],
    queryFn: async () => {
      const stats: Record<string, { orders: number; items: number }> = {};
      for (const shop of shops) {
        const [ordersRes, itemsRes] = await Promise.all([
          (supabase as any).from("storefront_orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
          (supabase as any).from("catalog_items").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
        ]);
        stats[shop.id] = { orders: ordersRes.count || 0, items: itemsRes.count || 0 };
      }
      return stats;
    },
    enabled: shops.length > 0,
  });

  // Create group
  const [newGroupName, setNewGroupName] = useState("");
  const createGroup = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_store_groups").insert({
        owner_id: user!.id, name: newGroupName,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-groups"] });
      setNewGroupName("");
      toast.success("Group created");
    },
  });

  // Add shop to group
  const addToGroup = useMutation({
    mutationFn: async ({ groupId, shopId }: { groupId: string; shopId: string }) => {
      await (supabase as any).from("storefront_store_group_members").insert({
        group_id: groupId, shop_id: shopId,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["store-groups"] }); toast.success("Shop added to group"); },
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  const totalOrders = Object.values(shopStats).reduce((s, v) => s + (v as any).orders, 0);
  const totalItems = Object.values(shopStats).reduce((s, v) => s + (v as any).items, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" /> Multi-Store Dashboard
      </h3>

      {/* Consolidated metrics */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <Store className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{shops.length}</p>
            <p className="text-[9px] text-muted-foreground">Stores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="h-4 w-4 text-info mx-auto mb-1" />
            <p className="text-lg font-bold">{fmtNum(totalItems)}</p>
            <p className="text-[9px] text-muted-foreground">Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ShoppingBag className="h-4 w-4 text-success mx-auto mb-1" />
            <p className="text-lg font-bold">{fmtNum(totalOrders)}</p>
            <p className="text-[9px] text-muted-foreground">Orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Shops list */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Your Stores</h4>
          {shops.map((shop: any) => {
            const stats = (shopStats as any)[shop.id] || { orders: 0, items: 0 };
            return (
              <div key={shop.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{shop.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[8px]">{shop.shop_visibility}</Badge>
                    <span className="text-[9px] text-muted-foreground">{stats.items} items • {stats.orders} orders</span>
                  </div>
                </div>
                <a href={`/s/${shop.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                </a>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Store Groups */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">Store Groups</h4>
          
          <div className="flex gap-2">
            <Input placeholder="New group name" value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)} className="text-xs h-8 flex-1" />
            <Button size="sm" className="h-8 text-xs" onClick={() => createGroup.mutate()}
              disabled={!newGroupName.trim() || createGroup.isPending}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {groups.map((g: any) => {
            const memberShopIds = (g.storefront_store_group_members || []).map((m: any) => m.shop_id);
            return (
              <div key={g.id} className="p-2 rounded-lg border border-border space-y-1.5">
                <p className="text-xs font-semibold">{g.name}</p>
                <div className="flex flex-wrap gap-1">
                  {memberShopIds.map((sid: string) => {
                    const shop = shops.find((s: any) => s.id === sid);
                    return shop ? (
                      <Badge key={sid} variant="secondary" className="text-[8px]">{shop.name}</Badge>
                    ) : null;
                  })}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {shops.filter((s: any) => !memberShopIds.includes(s.id)).map((s: any) => (
                    <Button key={s.id} size="sm" variant="ghost" className="text-[9px] h-5 px-1.5"
                      onClick={() => addToGroup.mutate({ groupId: g.id, shopId: s.id })}>
                      + {s.name}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
          {groups.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Create groups to organize your stores</p>}
        </CardContent>
      </Card>
    </div>
  );
}
