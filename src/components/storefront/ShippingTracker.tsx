/**
 * ShippingTracker — Seller: manage shipping zones & track shipments.
 * Buyer: view shipment status for their orders.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, MapPin, Plus, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
  orderId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  label_created: { label: "Label Created", color: "bg-blue-100 text-blue-700", icon: Package },
  picked_up: { label: "Picked Up", color: "bg-indigo-100 text-indigo-700", icon: Truck },
  in_transit: { label: "In Transit", color: "bg-amber-100 text-amber-700", icon: Truck },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-700", icon: MapPin },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  returned: { label: "Returned", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  exception: { label: "Exception", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

const CARRIERS = ["standard", "express", "dhl", "fedex", "ups", "dpd", "colissimo", "chronopost", "local_courier"];

export default function ShippingTracker({ shopId, mode, orderId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneForm, setZoneForm] = useState({ name: "", countries: "", base_fee: "0", per_kg_fee: "0", free_above: "", estimated_days_min: "1", estimated_days_max: "5", carrier: "standard" });

  // Shipping zones (seller)
  const { data: zones = [] } = useQuery({
    queryKey: ["shipping-zones", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_shipping_zones").select("*").eq("shop_id", shopId).order("created_at");
      return data || [];
    },
    enabled: mode === "seller",
  });

  // Shipments
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["shipments", shopId, orderId],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_shipments").select("*").eq("shop_id", shopId);
      if (orderId) q = q.eq("order_id", orderId);
      const { data } = await q.order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const createZone = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_shipping_zones").insert({
        shop_id: shopId,
        user_id: user!.id,
        name: zoneForm.name,
        countries: zoneForm.countries.split(",").map(c => c.trim()).filter(Boolean),
        base_fee: parseFloat(zoneForm.base_fee) || 0,
        per_kg_fee: parseFloat(zoneForm.per_kg_fee) || 0,
        free_above: zoneForm.free_above ? parseFloat(zoneForm.free_above) : null,
        estimated_days_min: parseInt(zoneForm.estimated_days_min) || 1,
        estimated_days_max: parseInt(zoneForm.estimated_days_max) || 5,
        carrier: zoneForm.carrier,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-zones"] });
      setShowZoneForm(false);
      setZoneForm({ name: "", countries: "", base_fee: "0", per_kg_fee: "0", free_above: "", estimated_days_min: "1", estimated_days_max: "5", carrier: "standard" });
      toast.success("Shipping zone created");
    },
  });

  const updateShipmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      if (status === "picked_up") updates.shipped_at = new Date().toISOString();
      await (supabase as any).from("storefront_shipments").update(updates).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments"] });
      toast.success("Shipment updated");
    },
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Shipping & Tracking</h3>
        {mode === "seller" && (
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowZoneForm(!showZoneForm)}>
            <Plus className="h-3 w-3" /> Zone
          </Button>
        )}
      </div>

      {/* Seller: Shipping Zones */}
      {mode === "seller" && (
        <>
          {showZoneForm && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Zone Name</Label><Input value={zoneForm.name} onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))} className="mt-0.5 h-8 text-xs" placeholder="Europe" /></div>
                  <div><Label className="text-[10px]">Countries (comma sep)</Label><Input value={zoneForm.countries} onChange={e => setZoneForm(f => ({ ...f, countries: e.target.value }))} className="mt-0.5 h-8 text-xs" placeholder="FR, DE, ES" /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">Base Fee</Label><Input type="number" value={zoneForm.base_fee} onChange={e => setZoneForm(f => ({ ...f, base_fee: e.target.value }))} className="mt-0.5 h-8 text-xs" /></div>
                  <div><Label className="text-[10px]">Per kg Fee</Label><Input type="number" value={zoneForm.per_kg_fee} onChange={e => setZoneForm(f => ({ ...f, per_kg_fee: e.target.value }))} className="mt-0.5 h-8 text-xs" /></div>
                  <div><Label className="text-[10px]">Free Above</Label><Input type="number" value={zoneForm.free_above} onChange={e => setZoneForm(f => ({ ...f, free_above: e.target.value }))} className="mt-0.5 h-8 text-xs" placeholder="50" /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">Min Days</Label><Input type="number" value={zoneForm.estimated_days_min} onChange={e => setZoneForm(f => ({ ...f, estimated_days_min: e.target.value }))} className="mt-0.5 h-8 text-xs" /></div>
                  <div><Label className="text-[10px]">Max Days</Label><Input type="number" value={zoneForm.estimated_days_max} onChange={e => setZoneForm(f => ({ ...f, estimated_days_max: e.target.value }))} className="mt-0.5 h-8 text-xs" /></div>
                  <div><Label className="text-[10px]">Carrier</Label>
                    <Select value={zoneForm.carrier} onValueChange={v => setZoneForm(f => ({ ...f, carrier: v }))}>
                      <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CARRIERS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" className="w-full text-xs" onClick={() => createZone.mutate()} disabled={!zoneForm.name || createZone.isPending}>
                  {createZone.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create Zone"}
                </Button>
              </CardContent>
            </Card>
          )}

          {zones.length > 0 && (
            <div className="grid gap-2">
              {zones.map((z: any) => (
                <Card key={z.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">{z.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(z.countries || []).join(", ") || "All countries"} · {z.carrier}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {z.base_fee > 0 ? `${z.base_fee} ${z.currency}` : "Free"}{z.per_kg_fee > 0 ? ` + ${z.per_kg_fee}/kg` : ""}{z.free_above ? ` · Free above ${z.free_above}` : ""} · {z.estimated_days_min}-{z.estimated_days_max} days
                      </p>
                    </div>
                    <Badge variant={z.active ? "default" : "secondary"} className="text-[9px]">{z.active ? "Active" : "Off"}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Shipments list */}
      {shipments.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-xs">No shipments yet</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {shipments.map((s: any) => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <Card key={s.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{s.tracking_number || "No tracking"}</p>
                        <p className="text-[10px] text-muted-foreground">{s.carrier} · Order #{s.order_id?.slice(0, 8)}</p>
                      </div>
                    </div>
                    <Badge className={`text-[9px] ${cfg.color}`}>{cfg.label}</Badge>
                  </div>

                  {/* Timeline */}
                  {Array.isArray(s.tracking_events) && s.tracking_events.length > 0 && (
                    <div className="ml-3 border-l-2 border-muted pl-3 space-y-1 mb-2">
                      {(s.tracking_events as any[]).slice(-3).map((evt: any, i: number) => (
                        <div key={i} className="text-[10px]">
                          <span className="text-muted-foreground">{new Date(evt.at).toLocaleDateString()}</span>
                          <span className="ml-1 font-medium">{evt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.tracking_url && (
                    <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline">Track externally →</a>
                  )}

                  {/* Seller: update status */}
                  {mode === "seller" && s.status !== "delivered" && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {Object.entries(STATUS_CONFIG)
                        .filter(([k]) => k !== s.status)
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <Button key={k} size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => updateShipmentStatus.mutate({ id: s.id, status: k })}>
                            {v.label}
                          </Button>
                        ))}
                    </div>
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
