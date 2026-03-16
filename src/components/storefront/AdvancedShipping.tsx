/**
 * AdvancedShipping — Shipping zones, rate calculator, parcel tracking
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Package, Plus, Trash2, Loader2, CheckCircle2, Clock, Globe } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode?: "seller" | "buyer";
}

export default function AdvancedShipping({ shopId, mode = "seller" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newZone, setNewZone] = useState({ name: "", countries: "", baseRate: "", freeAbove: "", daysMin: "3", daysMax: "7", carrier: "standard" });

  // Shipping zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["shipping-zones", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_shipping_zones")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at");
      return data || [];
    },
  });

  // Shipments (seller view)
  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments", shopId, user?.id],
    queryFn: async () => {
      const q = (supabase as any).from("storefront_shipments").select("*");
      if (mode === "seller") {
        q.eq("shop_id", shopId);
      } else {
        q.eq("buyer_id", user!.id);
      }
      const { data } = await q.order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const createZone = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_shipping_zones").insert({
        shop_id: shopId,
        name: newZone.name,
        countries: newZone.countries.split(",").map(c => c.trim()).filter(Boolean),
        base_rate: parseFloat(newZone.baseRate) || 0,
        free_above: newZone.freeAbove ? parseFloat(newZone.freeAbove) : null,
        estimated_days_min: parseInt(newZone.daysMin) || 3,
        estimated_days_max: parseInt(newZone.daysMax) || 7,
        carrier: newZone.carrier,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipping-zones"] });
      setNewZone({ name: "", countries: "", baseRate: "", freeAbove: "", daysMin: "3", daysMax: "7", carrier: "standard" });
      toast.success("Shipping zone created");
    },
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("storefront_shipping_zones").delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipping-zones"] }); toast.success("Zone deleted"); },
  });

  const updateShipment = useMutation({
    mutationFn: async ({ id, status, tracking }: { id: string; status: string; tracking?: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (tracking) update.tracking_number = tracking;
      if (status === "shipped") update.shipped_at = new Date().toISOString();
      if (status === "delivered") update.delivered_at = new Date().toISOString();
      await (supabase as any).from("storefront_shipments").update(update).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipments"] }); toast.success("Shipment updated"); },
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "preparing": return "bg-warning/10 text-warning";
      case "shipped": return "bg-info/10 text-info";
      case "in_transit": return "bg-primary/10 text-primary";
      case "delivered": return "bg-success/10 text-success";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            {mode === "seller" ? "Shipping & Tracking" : "Track My Orders"}
          </h3>
          <Badge variant="outline" className="text-2xs">{zones.length} zones</Badge>
        </div>

        {/* Seller: Create zones */}
        {mode === "seller" && (
          <div className="space-y-2 border border-border rounded-xl p-3">
            <h4 className="text-xs font-semibold">Add Shipping Zone</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))} placeholder="Zone name" className="h-8 text-xs" />
              <Input value={newZone.countries} onChange={e => setNewZone(p => ({ ...p, countries: e.target.value }))} placeholder="FR, DE, ES" className="h-8 text-xs" />
              <Input type="number" value={newZone.baseRate} onChange={e => setNewZone(p => ({ ...p, baseRate: e.target.value }))} placeholder="Base rate" className="h-8 text-xs" />
              <Input type="number" value={newZone.freeAbove} onChange={e => setNewZone(p => ({ ...p, freeAbove: e.target.value }))} placeholder="Free above" className="h-8 text-xs" />
              <Input type="number" value={newZone.daysMin} onChange={e => setNewZone(p => ({ ...p, daysMin: e.target.value }))} placeholder="Min days" className="h-8 text-xs" />
              <Input type="number" value={newZone.daysMax} onChange={e => setNewZone(p => ({ ...p, daysMax: e.target.value }))} placeholder="Max days" className="h-8 text-xs" />
            </div>
            <Button size="sm" className="w-full text-xs" onClick={() => createZone.mutate()} disabled={!newZone.name || createZone.isPending}>
              <Plus className="w-3 h-3 mr-1" /> Add Zone
            </Button>
          </div>
        )}

        {/* Zones list */}
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {zones.map((zone: any) => (
              <div key={zone.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold">{zone.name}</span>
                  </div>
                  <p className="text-2xs text-muted-foreground mt-0.5">
                    {(zone.countries || []).join(", ") || "All"} · {zone.base_rate}€
                    {zone.free_above && ` · Free above ${zone.free_above}€`}
                    · {zone.estimated_days_min}-{zone.estimated_days_max} days
                  </p>
                </div>
                {mode === "seller" && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteZone.mutate(zone.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Shipments */}
        {shipments.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Shipments
            </h4>
            {shipments.map((s: any) => (
              <div key={s.id} className="border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-2xs ${statusColor(s.status)}`}>{s.status}</Badge>
                    {s.tracking_number && (
                      <span className="text-2xs font-mono text-muted-foreground">{s.tracking_number}</span>
                    )}
                  </div>
                  <span className="text-2xs text-muted-foreground">{s.carrier || "standard"}</span>
                </div>
                {s.destination_country && (
                  <p className="text-2xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {s.destination_country}
                  </p>
                )}
                {/* Timeline */}
                <div className="flex items-center gap-2 text-2xs">
                  {s.created_at && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> Created</span>}
                  {s.shipped_at && <span className="flex items-center gap-0.5 text-info">→ Shipped</span>}
                  {s.delivered_at && <span className="flex items-center gap-0.5 text-success">→ <CheckCircle2 className="w-2.5 h-2.5" /> Delivered</span>}
                </div>
                {mode === "seller" && s.status !== "delivered" && (
                  <div className="flex gap-1.5">
                    {s.status === "preparing" && (
                      <Button size="sm" variant="outline" className="h-7 text-2xs" onClick={() => updateShipment.mutate({ id: s.id, status: "shipped" })}>
                        Mark Shipped
                      </Button>
                    )}
                    {s.status === "shipped" && (
                      <Button size="sm" variant="outline" className="h-7 text-2xs" onClick={() => updateShipment.mutate({ id: s.id, status: "delivered" })}>
                        Mark Delivered
                      </Button>
                    )}
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
