/**
 * ShippingManager — Manage shipping zones, fees, and delivery estimates.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Truck, Plus, Trash2, MapPin, Package } from "lucide-react";
import { toast } from "sonner";

interface Zone {
  id: string;
  name: string;
  countries: string[];
  fee: number;
  free_above: number | null;
  currency: string;
  delivery_days_min: number;
  delivery_days_max: number;
  active: boolean;
}

export default function ShippingManager({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", countries: "", fee: "0", free_above: "", days_min: "1", days_max: "5" });

  const { data: zones = [] } = useQuery({
    queryKey: ["shipping-zones", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_shipping_zones")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: true });
      return (data || []) as Zone[];
    },
  });

  const addZone = async () => {
    const countries = form.countries.split(",").map(c => c.trim()).filter(Boolean);
    await (supabase as any).from("storefront_shipping_zones").insert({
      shop_id: shopId,
      name: form.name || "Zone",
      countries,
      fee: parseFloat(form.fee) || 0,
      free_above: form.free_above ? parseFloat(form.free_above) : null,
      delivery_days_min: parseInt(form.days_min) || 1,
      delivery_days_max: parseInt(form.days_max) || 5,
    });
    qc.invalidateQueries({ queryKey: ["shipping-zones", shopId] });
    setAdding(false);
    setForm({ name: "", countries: "", fee: "0", free_above: "", days_min: "1", days_max: "5" });
    toast.success("Shipping zone added");
  };

  const toggleZone = async (id: string, active: boolean) => {
    await (supabase as any).from("storefront_shipping_zones").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["shipping-zones", shopId] });
  };

  const deleteZone = async (id: string) => {
    await (supabase as any).from("storefront_shipping_zones").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shipping-zones", shopId] });
    toast.success("Zone deleted");
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Shipping Zones</h4>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Zone
          </Button>
        </div>

        {adding && (
          <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
            <div>
              <Label className="text-xs">Zone Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Europe" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Countries (comma separated codes)</Label>
              <Input value={form.countries} onChange={e => setForm(p => ({ ...p, countries: e.target.value }))} placeholder="FR, DE, ES, IT" className="mt-1 h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Shipping Fee</Label>
                <Input type="number" value={form.fee} onChange={e => setForm(p => ({ ...p, fee: e.target.value }))} className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Free Above (optional)</Label>
                <Input type="number" value={form.free_above} onChange={e => setForm(p => ({ ...p, free_above: e.target.value }))} placeholder="e.g. 50" className="mt-1 h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Min Days</Label>
                <Input type="number" value={form.days_min} onChange={e => setForm(p => ({ ...p, days_min: e.target.value }))} className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Max Days</Label>
                <Input type="number" value={form.days_max} onChange={e => setForm(p => ({ ...p, days_max: e.target.value }))} className="mt-1 h-8 text-xs" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addZone} className="h-7 text-xs">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-7 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        {zones.length === 0 && !adding && (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No shipping zones configured</p>
            <p className="text-[10px]">Add zones to enable delivery for your storefront</p>
          </div>
        )}

        {zones.map(z => (
          <div key={z.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-background">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium truncate">{z.name}</span>
                {!z.active && <Badge variant="secondary" className="text-[9px] px-1">Disabled</Badge>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{z.fee > 0 ? `${z.fee} ${z.currency}` : "Free"}</span>
                {z.free_above && <span>• Free above {z.free_above}</span>}
                <span>• {z.delivery_days_min}-{z.delivery_days_max} days</span>
              </div>
              {z.countries.length > 0 && (
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {z.countries.slice(0, 5).map(c => (
                    <Badge key={c} variant="outline" className="text-[9px] px-1 py-0">{c}</Badge>
                  ))}
                  {z.countries.length > 5 && <span className="text-[9px] text-muted-foreground">+{z.countries.length - 5}</span>}
                </div>
              )}
            </div>
            <Switch checked={z.active} onCheckedChange={v => toggleZone(z.id, v)} className="scale-75" />
            <Button size="icon" variant="ghost" onClick={() => deleteZone(z.id)} className="h-6 w-6 text-destructive/60 hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
