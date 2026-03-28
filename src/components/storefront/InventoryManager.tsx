/**
 * InventoryManager — Stock tracking, low-stock alerts, batch updates.
 * Reads catalog_items with track_inventory / stock_quantity fields.
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Warehouse, Loader2, AlertTriangle, PackageCheck, PackageX,
  ArrowUpDown, Search, Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InventoryManagerProps {
  shopId: string;
}

const LOW_STOCK_THRESHOLD = 5;

export default function InventoryManager({ shopId }: InventoryManagerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("catalog_items")
        .select("id, title, sku, photo_url, stock_quantity, track_inventory, available, price, currency")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .order("title");
      return data || [];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const tracked = items.filter((i: any) => i.track_inventory);
    return {
      total: items.length,
      tracked: tracked.length,
      lowStock: tracked.filter((i: any) => (i.stock_quantity || 0) > 0 && (i.stock_quantity || 0) <= LOW_STOCK_THRESHOLD).length,
      outOfStock: tracked.filter((i: any) => (i.stock_quantity || 0) <= 0).length,
      totalUnits: tracked.reduce((s: number, i: any) => s + (i.stock_quantity || 0), 0),
    };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i: any) => i.title?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q));
    }
    if (filter === "low") list = list.filter((i: any) => i.track_inventory && (i.stock_quantity || 0) > 0 && (i.stock_quantity || 0) <= LOW_STOCK_THRESHOLD);
    if (filter === "out") list = list.filter((i: any) => i.track_inventory && (i.stock_quantity || 0) <= 0);
    list = [...list].sort((a: any, b: any) => sortAsc ? (a.stock_quantity || 0) - (b.stock_quantity || 0) : (b.stock_quantity || 0) - (a.stock_quantity || 0));
    return list;
  }, [items, search, filter, sortAsc]);

  const hasEdits = Object.keys(edits).length > 0;

  const updateStock = (itemId: string, qty: number) => {
    setEdits(prev => ({ ...prev, [itemId]: Math.max(0, qty) }));
  };

  const toggleTracking = async (itemId: string, current: boolean) => {
    await (supabase as any).from("catalog_items").update({
      track_inventory: !current,
      updated_at: new Date().toISOString(),
    }).eq("id", itemId);
    qc.invalidateQueries({ queryKey: ["inventory", shopId] });
  };

  const saveAll = async () => {
    if (!hasEdits) return;
    setSaving(true);
    try {
      const updates = Object.entries(edits).map(([id, qty]) =>
        (supabase as any).from("catalog_items").update({
          stock_quantity: qty,
          available: qty > 0,
          updated_at: new Date().toISOString(),
        }).eq("id", id)
      );
      await Promise.all(updates);
      setEdits({});
      qc.invalidateQueries({ queryKey: ["inventory", shopId] });
      toast.success(`${updates.length} item(s) updated`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-primary" /> Inventory
        </h3>
        {hasEdits && (
          <Button size="sm" className="text-xs h-7" onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save ({Object.keys(edits).length})
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, icon: PackageCheck, color: "text-primary" },
          { label: "Tracked", value: stats.tracked, icon: Warehouse, color: "text-blue-600" },
          { label: "Low", value: stats.lowStock, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Out", value: stats.outOfStock, icon: PackageX, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label} className="cursor-pointer" onClick={() => setFilter(s.label === "Low" ? "low" : s.label === "Out" ? "out" : "all")}>
            <CardContent className="p-2 text-center">
              <s.icon className={cn("h-3.5 w-3.5 mx-auto mb-0.5", s.color)} />
              <p className="text-lg font-bold leading-none">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="h-8 text-xs pl-7" />
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSortAsc(!sortAsc)}>
          <ArrowUpDown className="h-3 w-3 mr-1" /> Stock
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5">
        {(["all", "low", "out"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}>
            {f === "all" ? "All" : f === "low" ? `Low (${stats.lowStock})` : `Out (${stats.outOfStock})`}
          </button>
        ))}
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No items match</CardContent></Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((item: any) => {
            const qty = edits[item.id] ?? item.stock_quantity ?? 0;
            const isLow = item.track_inventory && qty > 0 && qty <= LOW_STOCK_THRESHOLD;
            const isOut = item.track_inventory && qty <= 0;
            const isEdited = edits[item.id] !== undefined;

            return (
              <Card key={item.id} className={cn(isOut && "border-destructive/30", isLow && "border-amber-500/30")}>
                <CardContent className="p-2.5 flex items-center gap-2.5">
                  {/* Thumbnail */}
                  {item.photo_url ? (
                    <img src={item.photo_url} alt="" className="h-9 w-9 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-2 break-words leading-snug">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.sku && <span className="text-[9px] text-muted-foreground font-mono">{item.sku}</span>}
                      {isLow && <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-500/50 text-amber-600">Low</Badge>}
                      {isOut && <Badge variant="outline" className="text-[8px] px-1 py-0 border-destructive/50 text-destructive">Out</Badge>}
                      {isEdited && <Badge className="text-[8px] px-1 py-0 bg-primary/20 text-primary">Edited</Badge>}
                    </div>
                  </div>

                  {/* Track toggle */}
                  <Switch
                    checked={item.track_inventory || false}
                    onCheckedChange={() => toggleTracking(item.id, item.track_inventory)}
                    className="scale-75"
                  />

                  {/* Stock input */}
                  {item.track_inventory && (
                    <Input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={e => updateStock(item.id, parseInt(e.target.value) || 0)}
                      className={cn("h-8 w-16 text-xs text-center", isOut && "border-destructive/50", isLow && "border-amber-500/50")}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
