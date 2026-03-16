/**
 * BundleManager — Seller-side: create product bundles with discounted pricing.
 * Also renders bundles on public shop pages.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, Trash2, Loader2, Layers, Gift } from "lucide-react";
import { toast } from "sonner";

interface BundleManagerProps {
  shopId: string;
  mode?: "manage" | "display";
  onAddBundle?: (bundleId: string, price: number) => void;
}

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function BundleManager({ shopId, mode = "manage", onAddBundle }: BundleManagerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ["shop-bundles", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_bundles")
        .select("*, storefront_bundle_items(*, catalog_items(title, price, currency, photo_url))")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["bundle-catalog", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("catalog_items")
        .select("id, title, price, currency, photo_url")
        .eq("shop_id", shopId)
        .eq("available", true)
        .order("title");
      return data || [];
    },
    enabled: mode === "manage",
  });

  const createBundle = async () => {
    if (!title.trim() || !price) return toast.error("Title and price required");
    if (selectedItems.length < 2) return toast.error("Select at least 2 items");
    setCreating(true);
    try {
      const { data: bundle, error } = await (supabase as any)
        .from("storefront_bundles")
        .insert({ shop_id: shopId, user_id: user!.id, title: title.trim(), bundle_price: parseFloat(price) })
        .select("id")
        .single();
      if (error) throw error;

      const items = selectedItems.map(itemId => ({ bundle_id: bundle.id, item_id: itemId }));
      await (supabase as any).from("storefront_bundle_items").insert(items);

      setShowCreate(false);
      setTitle(""); setPrice(""); setSelectedItems([]);
      qc.invalidateQueries({ queryKey: ["shop-bundles", shopId] });
      toast.success("Bundle created!");
    } catch (e: any) {
      toast.error(e.message || "Failed to create bundle");
    } finally {
      setCreating(false);
    }
  };

  const deleteBundle = async (id: string) => {
    await (supabase as any).from("storefront_bundles").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-bundles", shopId] });
    toast.success("Bundle deleted");
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]
    );
  };

  // Calculate individual total for savings display
  const getIndividualTotal = (bundle: any) => {
    const items = bundle.storefront_bundle_items || [];
    return items.reduce((s: number, bi: any) => s + (bi.catalog_items?.price || 0) * (bi.quantity || 1), 0);
  };

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {mode === "manage" && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Bundles ({bundles.length})
          </h4>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-3 w-3 mr-1" /> New Bundle
          </Button>
        </div>
      )}

      {mode === "display" && bundles.length > 0 && (
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" /> Bundle Deals
        </h3>
      )}

      {/* Create form */}
      {showCreate && mode === "manage" && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div>
              <Label className="text-[10px]">Bundle Name</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summer Collection" className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Bundle Price</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="29.99" className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-[10px]">Select Items ({selectedItems.length})</Label>
              <div className="max-h-[150px] overflow-y-auto space-y-1 mt-1 border border-border rounded-lg p-2">
                {catalogItems.map((item: any) => (
                  <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer py-1">
                    <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                    <span className="truncate flex-1">{item.title}</span>
                    <span className="text-muted-foreground">{fmtPrice(item.price, item.currency)}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button size="sm" className="w-full text-xs" onClick={createBundle} disabled={creating}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Layers className="h-3 w-3 mr-1" />}
              Create Bundle
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bundles list */}
      {bundles.length === 0 && mode === "manage" ? (
        <Card><CardContent className="py-6 text-center text-muted-foreground text-xs">No bundles yet — create one to offer discounts!</CardContent></Card>
      ) : (
        bundles.map((b: any) => {
          const indTotal = getIndividualTotal(b);
          const savings = Math.max(0, indTotal - b.bundle_price);
          const savingsPct = indTotal > 0 ? Math.round((savings / indTotal) * 100) : 0;
          const items = b.storefront_bundle_items || [];

          return (
            <Card key={b.id} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold">{b.title}</h5>
                  {savingsPct > 0 && (
                    <Badge className="text-[9px] bg-success/10 text-success">Save {savingsPct}%</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {items.map((bi: any) => (
                    <Badge key={bi.id} variant="secondary" className="text-[9px]">
                      {bi.catalog_items?.title}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-primary">{fmtPrice(b.bundle_price, b.currency)}</span>
                    {indTotal > b.bundle_price && (
                      <span className="text-[10px] text-muted-foreground line-through ml-1.5">{fmtPrice(indTotal, b.currency)}</span>
                    )}
                  </div>
                  {mode === "display" && onAddBundle && (
                    <Button size="sm" className="h-7 text-xs" onClick={() => onAddBundle(b.id, b.bundle_price)}>
                      <Plus className="h-3 w-3 mr-1" /> Add to Cart
                    </Button>
                  )}
                  {mode === "manage" && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteBundle(b.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
