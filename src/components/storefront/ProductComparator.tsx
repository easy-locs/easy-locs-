/**
 * ProductComparator — Side-by-side product comparison with multi-criteria
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows, Plus, Trash2, Share2, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  catalogItems?: any[];
  mode?: "buyer" | "seller";
}

export default function ProductComparator({ shopId, catalogItems = [], mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const { data: comparisons = [] } = useQuery({
    queryKey: ["comparisons", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_comparisons")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const saveComparison = useMutation({
    mutationFn: async () => {
      if (selectedItems.length < 2) return;
      await (supabase as any).from("storefront_comparisons").insert({
        user_id: user!.id,
        shop_id: shopId,
        item_ids: selectedItems,
        name: `Compare ${selectedItems.length} products`,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["comparisons"] }); toast.success("Comparison saved"); },
  });

  const deleteComparison = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_comparisons").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comparisons"] }),
  });

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(i => i !== itemId) : prev.length < 4 ? [...prev, itemId] : prev
    );
  };

  const shareComparison = async (token: string) => {
    const url = `${window.location.origin}/s/${shopId}?compare=${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Comparison link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const comparedProducts = selectedItems.map(id => catalogItems.find((c: any) => c.id === id)).filter(Boolean);

  const CRITERIA = ["price", "category", "brand_name", "weight_grams", "stock_quantity"];

  if (!user) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-primary" />
            Compare Products
          </h3>
          <Badge variant="outline" className="text-2xs">{selectedItems.length}/4 selected</Badge>
        </div>

        {/* Product selector */}
        <div className="flex flex-wrap gap-1.5">
          {catalogItems.slice(0, 20).map((item: any) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`px-2 py-1 rounded-lg text-2xs border transition-colors ${
                selectedItems.includes(item.id)
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-border text-foreground hover:border-accent/30"
              }`}
            >
              {item.title?.substring(0, 20) || "Product"}
            </button>
          ))}
        </div>

        {/* Comparison table */}
        {comparedProducts.length >= 2 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b border-border text-muted-foreground">Criteria</th>
                  {comparedProducts.map((p: any) => (
                    <th key={p.id} className="text-center p-2 border-b border-border min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        {p.photo_url && <img src={p.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                        <span className="font-semibold truncate max-w-[90px]">{p.title}</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => toggleItem(p.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map(key => (
                  <tr key={key}>
                    <td className="p-2 border-b border-border text-muted-foreground capitalize">{key.replace(/_/g, " ")}</td>
                    {comparedProducts.map((p: any) => {
                      let val = p[key];
                      if (key === "price") val = `${val ?? "—"} ${p.currency || "EUR"}`;
                      return (
                        <td key={p.id} className="p-2 border-b border-border text-center font-medium">
                          {val ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Specs from specifications JSON */}
                {comparedProducts.some((p: any) => p.specifications) && (
                  <tr>
                    <td className="p-2 border-b border-border text-muted-foreground">Specs</td>
                    {comparedProducts.map((p: any) => (
                      <td key={p.id} className="p-2 border-b border-border text-center text-2xs">
                        {p.specifications ? Object.entries(p.specifications as Record<string, unknown>).map(([k, v]) => (
                          <div key={k}>{k}: {String(v)}</div>
                        )) : "—"}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedItems.length >= 2 && (
          <Button size="sm" className="w-full text-xs" onClick={() => saveComparison.mutate()} disabled={saveComparison.isPending}>
            <Plus className="w-3 h-3 mr-1" /> Save Comparison
          </Button>
        )}

        {/* Saved comparisons */}
        {comparisons.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="text-xs font-semibold">Saved Comparisons</h4>
            {comparisons.map((comp: any) => (
              <div key={comp.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                <div>
                  <p className="text-xs font-medium">{comp.name}</p>
                  <p className="text-2xs text-muted-foreground">{comp.item_ids?.length || 0} products</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedItems(comp.item_ids || [])}>
                    <GitCompareArrows className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => shareComparison(comp.share_token)}>
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteComparison.mutate(comp.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
