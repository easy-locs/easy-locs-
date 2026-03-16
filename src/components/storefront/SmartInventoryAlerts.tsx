/**
 * SmartInventoryAlerts — Seller-side: low stock alerts, restock suggestions, stock movement history.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Package, ArrowDown, ArrowUp, RotateCcw, Loader2, CheckCircle, History } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function SmartInventoryAlerts({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const [restockQty, setRestockQty] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"alerts" | "history">("alerts");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["inventory-alerts", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_inventory_alerts")
        .select("*, catalog_items(title, stock_quantity, photo_url)")
        .eq("shop_id", shopId)
        .eq("resolved", false)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_stock_movements")
        .select("*, catalog_items(title)")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: tab === "history",
  });

  const restock = async (alertId: string, itemId: string) => {
    const qty = parseInt(restockQty[alertId] || "0");
    if (qty <= 0) return toast.error("Enter a quantity");

    // Get current stock
    const { data: item } = await (supabase as any)
      .from("catalog_items").select("stock_quantity").eq("id", itemId).single();
    const prev = item?.stock_quantity || 0;
    const newStock = prev + qty;

    // Update stock
    await (supabase as any).from("catalog_items")
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq("id", itemId);

    // Log movement
    await (supabase as any).from("storefront_stock_movements").insert({
      shop_id: shopId, item_id: itemId, movement_type: "restock",
      quantity: qty, previous_stock: prev, new_stock: newStock, notes: "Manual restock",
    });

    // Resolve alert
    await (supabase as any).from("storefront_inventory_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    qc.invalidateQueries({ queryKey: ["inventory-alerts", shopId] });
    qc.invalidateQueries({ queryKey: ["stock-movements", shopId] });
    toast.success(`Restocked +${qty} units`);
  };

  const movementIcon = (type: string) => {
    switch (type) {
      case "sale": return <ArrowDown className="h-3 w-3 text-destructive" />;
      case "restock": return <ArrowUp className="h-3 w-3 text-success" />;
      case "return": return <RotateCcw className="h-3 w-3 text-info" />;
      default: return <Package className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h4 className="text-sm font-semibold">Inventory Alerts</h4>
          {alerts.length > 0 && <Badge variant="destructive" className="text-[10px] ml-auto">{alerts.length}</Badge>}
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1">
          {(["alerts", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
                tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}>
              {t === "alerts" ? `⚠️ Alerts (${alerts.length})` : "📋 History"}
            </button>
          ))}
        </div>

        {tab === "alerts" && (
          alerts.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">
              <CheckCircle className="h-6 w-6 mx-auto mb-1 opacity-40" />
              <p className="text-xs">All stock levels are healthy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a: any) => {
                const item = a.catalog_items;
                return (
                  <div key={a.id} className="border border-destructive/20 rounded-lg p-3 space-y-2 bg-destructive/5">
                    <div className="flex items-center gap-2">
                      {item?.photo_url && <img src={item.photo_url} alt="" className="w-8 h-8 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item?.title || "Item"}</p>
                        <p className="text-[10px] text-destructive font-medium">
                          Stock: {a.current_stock} (threshold: {a.threshold})
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={restockQty[a.id] || ""}
                        onChange={e => setRestockQty(p => ({ ...p, [a.id]: e.target.value }))}
                        className="h-7 text-xs flex-1"
                      />
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => restock(a.id, a.item_id)}>
                        <ArrowUp className="h-3 w-3" /> Restock
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === "history" && (
          movements.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No stock movements yet</p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {movements.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    {movementIcon(m.movement_type)}
                    <span className="text-muted-foreground truncate max-w-[120px]">{m.catalog_items?.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[8px] capitalize">{m.movement_type}</Badge>
                    <span className={`font-mono font-medium ${m.quantity > 0 ? "text-success" : "text-destructive"}`}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </span>
                    <span className="text-muted-foreground/60 text-[9px]">
                      {new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
