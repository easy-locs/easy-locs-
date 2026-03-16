/**
 * ShippingFulfillment — Shipping zones, shipment tracking, fulfillment
 * Seller: manage zones, create shipments, track deliveries
 * Buyer: track their shipments
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Package, Plus, Loader2, ExternalLink, Globe, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const SHIPMENT_STATUS: Record<string, { label: string; color: string }> = {
  preparing: { label: "Preparing", color: "bg-amber-500/10 text-amber-600" },
  shipped: { label: "Shipped", color: "bg-blue-500/10 text-blue-600" },
  in_transit: { label: "In Transit", color: "bg-cyan-500/10 text-cyan-600" },
  delivered: { label: "Delivered", color: "bg-emerald-500/10 text-emerald-600" },
  returned: { label: "Returned", color: "bg-red-500/10 text-red-600" },
};

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function ShippingFulfillment({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"zones" | "shipments">(mode === "buyer" ? "shipments" : "zones");

  // Shipping zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["shipping-zones", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_shipping_zones")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Shipments
  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_shipments")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Create zone
  const [zoneForm, setZoneForm] = useState({ name: "", countries: "", fee: 0, freeAbove: "", daysMin: 3, daysMax: 7 });
  const createZone = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_shipping_zones").insert({
        shop_id: shopId,
        name: zoneForm.name,
        countries: zoneForm.countries.split(",").map((c: string) => c.trim()).filter(Boolean),
        fee: zoneForm.fee,
        free_above: zoneForm.freeAbove ? Number(zoneForm.freeAbove) : null,
        delivery_days_min: zoneForm.daysMin,
        delivery_days_max: zoneForm.daysMax,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-zones"] });
      setZoneForm({ name: "", countries: "", fee: 0, freeAbove: "", daysMin: 3, daysMax: 7 });
      toast.success("Shipping zone created");
    },
  });

  // Create shipment
  const [shipForm, setShipForm] = useState({ orderId: "", carrier: "", trackingNumber: "", trackingUrl: "" });
  const createShipment = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_shipments").insert({
        shop_id: shopId, order_id: shipForm.orderId,
        carrier: shipForm.carrier || null,
        tracking_number: shipForm.trackingNumber || null,
        tracking_url: shipForm.trackingUrl || null,
        status: "shipped", shipped_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments"] });
      setShipForm({ orderId: "", carrier: "", trackingNumber: "", trackingUrl: "" });
      toast.success("Shipment created");
    },
  });

  // Update shipment status
  const updateShipment = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      if (status === "shipped") updates.shipped_at = new Date().toISOString();
      await (supabase as any).from("storefront_shipments").update(updates).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipments"] }); toast.success("Shipment updated"); },
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  // BUYER MODE — only show their shipments
  if (mode === "buyer") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> Shipments
        </h3>
        {shipments.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No shipments yet</CardContent></Card>
        ) : shipments.map((s: any) => {
          const st = SHIPMENT_STATUS[s.status] || SHIPMENT_STATUS.preparing;
          return (
            <Card key={s.id}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">{s.carrier || "Shipping"}</span>
                  </div>
                  <Badge className={`text-[8px] ${st.color}`}>{st.label}</Badge>
                </div>
                {s.tracking_number && (
                  <p className="text-[10px] text-muted-foreground font-mono">#{s.tracking_number}</p>
                )}
                {s.tracking_url && (
                  <a href={s.tracking_url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-primary flex items-center gap-1 hover:underline">
                    <ExternalLink className="h-2.5 w-2.5" /> Track package
                  </a>
                )}
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  {s.shipped_at && <span>Shipped: {new Date(s.shipped_at).toLocaleDateString()}</span>}
                  {s.delivered_at && <span>Delivered: {new Date(s.delivered_at).toLocaleDateString()}</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Shipping zones info */}
        {zones.filter((z: any) => z.active).length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Shipping Zones
              </h4>
              {zones.filter((z: any) => z.active).map((z: any) => (
                <div key={z.id} className="flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-medium">{z.name}</span>
                    <span className="text-muted-foreground ml-1 text-[9px]">
                      ({z.delivery_days_min}-{z.delivery_days_max} days)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{fmtPrice(z.fee, z.currency)}</span>
                    {z.free_above && <span className="text-[8px] text-success ml-1">Free above {fmtPrice(z.free_above, z.currency)}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // SELLER MODE
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> Shipping
        </h3>
        <div className="flex gap-1">
          {(["zones", "shipments"] as const).map(v => (
            <Button key={v} size="sm" variant={tab === v ? "default" : "ghost"} className="text-[10px] h-6 px-2"
              onClick={() => setTab(v)}>
              {v === "zones" ? "Zones" : "Shipments"}
            </Button>
          ))}
        </div>
      </div>

      {/* ZONES */}
      {tab === "zones" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Create Shipping Zone</h4>
              <Input placeholder="Zone name (e.g. Europe)" value={zoneForm.name}
                onChange={e => setZoneForm(p => ({ ...p, name: e.target.value }))} className="text-xs" />
              <Input placeholder="Countries (FR, DE, ES...)" value={zoneForm.countries}
                onChange={e => setZoneForm(p => ({ ...p, countries: e.target.value }))} className="text-xs h-8" />
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" placeholder="Fee" value={zoneForm.fee || ""}
                  onChange={e => setZoneForm(p => ({ ...p, fee: Number(e.target.value) }))} className="text-xs h-8" />
                <Input type="number" placeholder="Free above" value={zoneForm.freeAbove}
                  onChange={e => setZoneForm(p => ({ ...p, freeAbove: e.target.value }))} className="text-xs h-8" />
                <div className="flex gap-1">
                  <Input type="number" placeholder="Min" value={zoneForm.daysMin}
                    onChange={e => setZoneForm(p => ({ ...p, daysMin: Number(e.target.value) }))} className="text-xs h-8" />
                  <Input type="number" placeholder="Max" value={zoneForm.daysMax}
                    onChange={e => setZoneForm(p => ({ ...p, daysMax: Number(e.target.value) }))} className="text-xs h-8" />
                </div>
              </div>
              <Button size="sm" className="w-full text-xs" onClick={() => createZone.mutate()}
                disabled={!zoneForm.name.trim() || createZone.isPending}>
                <MapPin className="h-3 w-3 mr-1" /> Create Zone
              </Button>
            </CardContent>
          </Card>

          {zones.map((z: any) => (
            <Card key={z.id}>
              <CardContent className="p-2.5 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{z.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {(z.countries || []).join(", ")} • {z.delivery_days_min}-{z.delivery_days_max} days
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-primary">{fmtPrice(z.fee, z.currency)}</p>
                  {z.free_above && <p className="text-[8px] text-success">Free &gt;{fmtPrice(z.free_above, z.currency)}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* SHIPMENTS */}
      {tab === "shipments" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Create Shipment</h4>
              <Input placeholder="Order ID" value={shipForm.orderId}
                onChange={e => setShipForm(p => ({ ...p, orderId: e.target.value }))} className="text-xs h-8" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Carrier" value={shipForm.carrier}
                  onChange={e => setShipForm(p => ({ ...p, carrier: e.target.value }))} className="text-xs h-8" />
                <Input placeholder="Tracking #" value={shipForm.trackingNumber}
                  onChange={e => setShipForm(p => ({ ...p, trackingNumber: e.target.value }))} className="text-xs h-8" />
              </div>
              <Input placeholder="Tracking URL" value={shipForm.trackingUrl}
                onChange={e => setShipForm(p => ({ ...p, trackingUrl: e.target.value }))} className="text-xs h-8" />
              <Button size="sm" className="w-full text-xs" onClick={() => createShipment.mutate()}
                disabled={!shipForm.orderId.trim() || createShipment.isPending}>
                <Package className="h-3 w-3 mr-1" /> Create Shipment
              </Button>
            </CardContent>
          </Card>

          {shipments.map((s: any) => {
            const st = SHIPMENT_STATUS[s.status] || SHIPMENT_STATUS.preparing;
            const nextStatus = s.status === "preparing" ? "shipped" : s.status === "shipped" ? "in_transit" : s.status === "in_transit" ? "delivered" : null;
            return (
              <Card key={s.id}>
                <CardContent className="p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">{s.carrier || "Package"}</span>
                    </div>
                    <Badge className={`text-[8px] ${st.color}`}>{st.label}</Badge>
                  </div>
                  {s.tracking_number && <p className="text-[10px] font-mono text-muted-foreground">#{s.tracking_number}</p>}
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {s.shipped_at ? `Shipped ${new Date(s.shipped_at).toLocaleDateString()}` : "Not shipped yet"}
                  </div>
                  {nextStatus && (
                    <Button size="sm" variant="outline" className="w-full text-[10px] h-7"
                      onClick={() => updateShipment.mutate({ id: s.id, status: nextStatus })}>
                      Mark as {SHIPMENT_STATUS[nextStatus]?.label || nextStatus}
                    </Button>
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
