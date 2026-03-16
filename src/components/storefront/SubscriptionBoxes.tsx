/**
 * SubscriptionBoxes — ORBIT V1: Subscription box management.
 * Seller: create boxes, view enrollments, manage deliveries.
 * Buyer: browse boxes, subscribe, pause/resume, track deliveries.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Loader2, Pause, Play, XCircle, Truck, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; mode?: "seller" | "buyer"; }

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function SubscriptionBoxes({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", currency: "EUR", frequency: "monthly", item_count: "3" });
  const [saving, setSaving] = useState(false);

  const { data: boxes = [] } = useQuery({
    queryKey: ["sub-boxes", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_sub_boxes")
        .select("*").eq("shop_id", shopId).eq("active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["box-enrollments", shopId, user?.id, mode],
    queryFn: async () => {
      if (!user) return [];
      const q = (supabase as any).from("storefront_sub_box_enrollments").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q.eq("subscriber_id", user.id);
      const { data } = await q.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createBox = async () => {
    if (!user || !form.name || !form.price) return;
    setSaving(true);
    try {
      await (supabase as any).from("storefront_sub_boxes").insert({
        shop_id: shopId, user_id: user.id, name: form.name, description: form.description || null,
        price: parseFloat(form.price), currency: form.currency, frequency: form.frequency,
        item_count: parseInt(form.item_count) || 3,
      });
      qc.invalidateQueries({ queryKey: ["sub-boxes", shopId] });
      setForm({ name: "", description: "", price: "", currency: "EUR", frequency: "monthly", item_count: "3" });
      setCreating(false);
      toast.success("Box created");
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const enrollInBox = async (boxId: string) => {
    if (!user) return;
    const box = boxes.find((b: any) => b.id === boxId);
    if (!box) return;
    const nextDelivery = new Date();
    if (box.frequency === "weekly") nextDelivery.setDate(nextDelivery.getDate() + 7);
    else if (box.frequency === "biweekly") nextDelivery.setDate(nextDelivery.getDate() + 14);
    else if (box.frequency === "quarterly") nextDelivery.setMonth(nextDelivery.getMonth() + 3);
    else nextDelivery.setMonth(nextDelivery.getMonth() + 1);

    await (supabase as any).from("storefront_sub_box_enrollments").insert({
      box_id: boxId, shop_id: shopId, subscriber_id: user.id,
      next_delivery_at: nextDelivery.toISOString(),
    });
    qc.invalidateQueries({ queryKey: ["box-enrollments", shopId, user?.id, mode] });
    toast.success("Subscribed to box!");
  };

  const updateEnrollment = async (id: string, updates: Record<string, any>) => {
    await (supabase as any).from("storefront_sub_box_enrollments").update(updates).eq("id", id);
    qc.invalidateQueries({ queryKey: ["box-enrollments", shopId, user?.id, mode] });
    toast.success("Updated");
  };

  const myBoxIds = new Set(enrollments.filter((e: any) => e.status === "active" || e.status === "paused").map((e: any) => e.box_id));

  if (mode === "buyer") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Subscription Boxes
        </h3>

        {boxes.map((box: any) => {
          const enrolled = myBoxIds.has(box.id);
          const myEnroll = enrollments.find((e: any) => e.box_id === box.id && (e.status === "active" || e.status === "paused"));
          return (
            <Card key={box.id} className={enrolled ? "border-primary/30" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">{box.name}</h4>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">{fmtPrice(box.price, box.currency)}</span>
                    <span className="text-[10px] text-muted-foreground">/{box.frequency}</span>
                  </div>
                </div>
                {box.description && <p className="text-xs text-muted-foreground">{box.description}</p>}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Package className="h-3 w-3" /> {box.item_count} items per box
                </div>

                {enrolled && myEnroll ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={myEnroll.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {myEnroll.status === "paused" ? "⏸ Paused" : "✓ Active"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {myEnroll.delivery_count} deliveries
                      </span>
                    </div>
                    {myEnroll.next_delivery_at && myEnroll.status === "active" && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Next: {new Date(myEnroll.next_delivery_at).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {myEnroll.status === "active" ? (
                        <Button size="sm" variant="outline" className="text-xs gap-1 flex-1"
                          onClick={() => updateEnrollment(myEnroll.id, { status: "paused", paused_at: new Date().toISOString() })}>
                          <Pause className="h-3 w-3" /> Pause
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs gap-1 flex-1"
                          onClick={() => updateEnrollment(myEnroll.id, { status: "active", paused_at: null })}>
                          <Play className="h-3 w-3" /> Resume
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-xs text-destructive gap-1"
                        onClick={() => updateEnrollment(myEnroll.id, { status: "cancelled", cancelled_at: new Date().toISOString() })}>
                        <XCircle className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" className="w-full text-xs" onClick={() => enrollInBox(box.id)}>
                    Subscribe to this Box
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {boxes.length === 0 && <p className="text-xs text-muted-foreground">No subscription boxes available.</p>}
      </div>
    );
  }

  // Seller mode
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> Subscription Boxes
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCreating(!creating)}>
          <Plus className="h-3 w-3" /> New Box
        </Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-xs">Box Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Mystery Snack Box" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Price</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Items/Box</Label>
                <Input type="number" value={form.item_count} onChange={e => setForm({ ...form, item_count: e.target.value })} className="mt-1" />
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={createBox} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create Box"}
            </Button>
          </CardContent>
        </Card>
      )}

      {boxes.map((box: any) => {
        const subCount = enrollments.filter((e: any) => e.box_id === box.id && e.status === "active").length;
        return (
          <Card key={box.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <Package className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{box.name}</p>
                <p className="text-[10px] text-muted-foreground">{fmtPrice(box.price, box.currency)}/{box.frequency} · {box.item_count} items</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{subCount} subs</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
