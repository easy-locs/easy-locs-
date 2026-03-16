/**
 * WarehouseManager — Multi-warehouse fulfillment: stock per location, transfers.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Warehouse, Plus, ArrowRight, Package, Loader2, MapPin, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
}

export default function WarehouseManager({ shopId }: Props) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [creating, setCreating] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [newWh, setNewWh] = useState({ name: "", address: "", city: "", country: "FR" });
  const [transfer, setTransfer] = useState({ from_id: "", to_id: "", item_id: "", quantity: "1" });

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_warehouses")
        .select("*")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("is_default", { ascending: false });
      return data || [];
    },
  });

  const { data: allStock = [] } = useQuery({
    queryKey: ["warehouse-stock", shopId],
    queryFn: async () => {
      if (!warehouses.length) return [];
      const whIds = warehouses.map((w: any) => w.id);
      const { data } = await (supabase as any)
        .from("storefront_warehouse_stock")
        .select("*")
        .in("warehouse_id", whIds);
      return data || [];
    },
    enabled: warehouses.length > 0,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["wh-catalog", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("catalog_items")
        .select("id, title")
        .eq("shop_id", shopId)
        .eq("available", true)
        .order("title")
        .limit(100);
      return data || [];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["warehouse-transfers", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_warehouse_transfers")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const createWarehouse = async () => {
    if (!newWh.name.trim()) return;
    setCreating(true);
    await (supabase as any).from("storefront_warehouses").insert({
      shop_id: shopId,
      ...newWh,
      is_default: warehouses.length === 0,
    });
    setCreating(false);
    setShowCreate(false);
    setNewWh({ name: "", address: "", city: "", country: "FR" });
    qc.invalidateQueries({ queryKey: ["warehouses", shopId] });
    toast.success("Warehouse created");
  };

  const createTransfer = async () => {
    if (!transfer.from_id || !transfer.to_id || !transfer.item_id) return;
    if (transfer.from_id === transfer.to_id) return toast.error("Select different warehouses");
    setTransferring(true);
    await (supabase as any).from("storefront_warehouse_transfers").insert({
      shop_id: shopId,
      from_warehouse_id: transfer.from_id,
      to_warehouse_id: transfer.to_id,
      item_id: transfer.item_id,
      quantity: Number(transfer.quantity) || 1,
    });
    setTransferring(false);
    setShowTransfer(false);
    setTransfer({ from_id: "", to_id: "", item_id: "", quantity: "1" });
    qc.invalidateQueries({ queryKey: ["warehouse-transfers", shopId] });
    toast.success("Transfer created");
  };

  const completeTransfer = async (id: string) => {
    await (supabase as any).from("storefront_warehouse_transfers")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["warehouse-transfers", shopId] });
    toast.success("Transfer completed");
  };

  const getWhName = (id: string) => warehouses.find((w: any) => w.id === id)?.name || "—";
  const getItemName = (id: string) => items.find((i: any) => i.id === id)?.title || "Item";
  const getStockForWarehouse = (whId: string) => allStock.filter((s: any) => s.warehouse_id === whId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-primary" /> Warehouses
        </h3>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setShowTransfer(!showTransfer)}>
            <ArrowRight className="h-3 w-3" /> Transfer
          </Button>
          <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </div>

      {/* Create warehouse */}
      {showCreate && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div><Label className="text-[10px]">Name</Label><Input value={newWh.name} onChange={e => setNewWh(p => ({ ...p, name: e.target.value }))} className="h-7 text-xs mt-1" placeholder="Main Warehouse" /></div>
            <div><Label className="text-[10px]">Address</Label><Input value={newWh.address} onChange={e => setNewWh(p => ({ ...p, address: e.target.value }))} className="h-7 text-xs mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">City</Label><Input value={newWh.city} onChange={e => setNewWh(p => ({ ...p, city: e.target.value }))} className="h-7 text-xs mt-1" /></div>
              <div><Label className="text-[10px]">Country</Label><Input value={newWh.country} onChange={e => setNewWh(p => ({ ...p, country: e.target.value }))} className="h-7 text-xs mt-1" /></div>
            </div>
            <Button size="sm" className="w-full h-7 text-xs" onClick={createWarehouse} disabled={creating}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create Warehouse"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transfer form */}
      {showTransfer && warehouses.length >= 2 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">From</Label>
                <select value={transfer.from_id} onChange={e => setTransfer(p => ({ ...p, from_id: e.target.value }))} className="w-full h-7 text-xs bg-muted rounded-lg px-2 border-none mt-1">
                  <option value="">Select</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">To</Label>
                <select value={transfer.to_id} onChange={e => setTransfer(p => ({ ...p, to_id: e.target.value }))} className="w-full h-7 text-xs bg-muted rounded-lg px-2 border-none mt-1">
                  <option value="">Select</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Product</Label>
                <select value={transfer.item_id} onChange={e => setTransfer(p => ({ ...p, item_id: e.target.value }))} className="w-full h-7 text-xs bg-muted rounded-lg px-2 border-none mt-1">
                  <option value="">Select</option>
                  {items.map((i: any) => <option key={i.id} value={i.id}>{i.title}</option>)}
                </select>
              </div>
              <div><Label className="text-[10px]">Qty</Label><Input type="number" value={transfer.quantity} onChange={e => setTransfer(p => ({ ...p, quantity: e.target.value }))} className="h-7 text-xs mt-1" min="1" /></div>
            </div>
            <Button size="sm" className="w-full h-7 text-xs" onClick={createTransfer} disabled={transferring}>
              {transferring ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create Transfer"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Warehouses list */}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : warehouses.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-xs text-muted-foreground">No warehouses. Add your first one!</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {warehouses.map((wh: any) => {
            const stock = getStockForWarehouse(wh.id);
            const totalUnits = stock.reduce((s: number, st: any) => s + (st.quantity || 0), 0);
            return (
              <Card key={wh.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{wh.name}</span>
                        {wh.is_default && <Badge variant="secondary" className="text-[8px]">Default</Badge>}
                      </div>
                      {wh.city && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{wh.city}, {wh.country}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{totalUnits}</p>
                      <p className="text-[9px] text-muted-foreground">units</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent transfers */}
      {transfers.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-foreground">Recent Transfers</h4>
          {transfers.slice(0, 5).map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
              <Package className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">
                {getItemName(t.item_id)} ×{t.quantity} · {getWhName(t.from_warehouse_id)} → {getWhName(t.to_warehouse_id)}
              </span>
              {t.status === "pending" ? (
                <Button size="icon" className="h-5 w-5 shrink-0" onClick={() => completeTransfer(t.id)}>
                  <Check className="h-2.5 w-2.5" />
                </Button>
              ) : (
                <Badge variant="secondary" className="text-[8px]">{t.status}</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
