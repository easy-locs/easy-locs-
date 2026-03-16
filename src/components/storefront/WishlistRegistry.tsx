/**
 * WishlistRegistry — Shareable wishlists, gift registries, event registries.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Gift, Share2, Plus, Loader2, Eye, EyeOff, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  catalogItems?: any[];
  formatPrice?: (n: number, c: string) => string;
}

export default function WishlistRegistry({ shopId, catalogItems = [], formatPrice }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("My Wishlist");
  const [type, setType] = useState("wishlist");
  const [isPublic, setIsPublic] = useState(false);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");

  const fmt = formatPrice || ((n: number, c: string) => `${n} ${c}`);

  const { data: wishlists = [], isLoading } = useQuery({
    queryKey: ["wishlists", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_wishlists").select("*")
        .eq("shop_id", shopId).eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!shopId && !!user,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["wishlist-items", activeList],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_wishlist_items").select("*, catalog_items(title, price, currency, photo_url)")
        .eq("wishlist_id", activeList!).order("priority", { ascending: false });
      return data || [];
    },
    enabled: !!activeList,
  });

  const createList = useMutation({
    mutationFn: async () => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
      await (supabase as any).from("storefront_wishlists").insert({
        shop_id: shopId, user_id: user!.id, name, type, is_public: isPublic, slug,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlists"] }); toast.success("List created!"); setCreating(false); setName("My Wishlist"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!selectedItem || !activeList) throw new Error("Select an item");
      await (supabase as any).from("storefront_wishlist_items").insert({ wishlist_id: activeList, item_id: selectedItem });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wishlist-items"] }); toast.success("Added!"); setSelectedItem(""); setAddingItem(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("storefront_wishlist_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist-items"] }),
  });

  const togglePublic = useMutation({
    mutationFn: async (list: any) => {
      await (supabase as any).from("storefront_wishlists").update({ is_public: !list.is_public }).eq("id", list.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlists"] }),
  });

  const shareList = (list: any) => {
    if (!list.is_public) { toast.error("Make list public first"); return; }
    const url = `${window.location.origin}/s/wishlist/${list.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  if (!user) return null;
  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" /> Wishlists & Registries
          </h3>
          {!creating && (
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setCreating(true)}>
              <Plus className="h-3 w-3 mr-1" /> New List
            </Button>
          )}
        </div>

        {creating && (
          <div className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="List name" className="h-8 text-xs" />
            <div className="flex gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wishlist" className="text-xs">❤️ Wishlist</SelectItem>
                  <SelectItem value="gift_registry" className="text-xs">🎁 Gift Registry</SelectItem>
                  <SelectItem value="event_registry" className="text-xs">🎉 Event Registry</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant={isPublic ? "default" : "outline"} className="h-8 text-xs" onClick={() => setIsPublic(!isPublic)}>
                {isPublic ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                {isPublic ? "Public" : "Private"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs flex-1" disabled={createList.isPending} onClick={() => createList.mutate()}>Create</Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Lists */}
        {wishlists.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No lists yet</p>
        ) : (
          <div className="space-y-2">
            {wishlists.map((list: any) => (
              <div key={list.id}>
                <button
                  onClick={() => setActiveList(activeList === list.id ? null : list.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${activeList === list.id ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"}`}
                >
                  {list.type === "gift_registry" ? <Gift className="h-4 w-4 text-primary" /> : <Heart className="h-4 w-4 text-primary" />}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium truncate">{list.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px]">{list.type.replace("_", " ")}</Badge>
                      {list.is_public && <Badge className="text-[8px] bg-success/10 text-success">Public</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); togglePublic.mutate(list); }}>
                      {list.is_public ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); shareList(list); }}>
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </button>

                {/* Items for active list */}
                {activeList === list.id && (
                  <div className="mt-2 ml-4 space-y-1.5">
                    {addingItem ? (
                      <div className="flex gap-2 mb-2">
                        <Select value={selectedItem} onValueChange={setSelectedItem}>
                          <SelectTrigger className="h-7 text-[10px] flex-1"><SelectValue placeholder="Select product..." /></SelectTrigger>
                          <SelectContent>
                            {catalogItems.map((i: any) => <SelectItem key={i.id} value={i.id} className="text-[10px]">{i.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-7 text-[10px]" disabled={!selectedItem || addItem.isPending} onClick={() => addItem.mutate()}>
                          {addItem.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setAddingItem(true)}>
                        <Plus className="h-3 w-3 mr-1" /> Add item
                      </Button>
                    )}
                    {items.map((wi: any) => (
                      <div key={wi.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                        {wi.catalog_items?.photo_url && <img src={wi.catalog_items.photo_url} alt="" className="w-8 h-8 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium truncate">{wi.catalog_items?.title}</p>
                          <p className="text-[9px] text-muted-foreground">{fmt(wi.catalog_items?.price || 0, wi.catalog_items?.currency || "EUR")}</p>
                        </div>
                        {wi.purchased && <Badge className="text-[8px] bg-success/10 text-success">Purchased</Badge>}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem.mutate(wi.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-[10px] text-muted-foreground py-2 text-center">No items yet</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
