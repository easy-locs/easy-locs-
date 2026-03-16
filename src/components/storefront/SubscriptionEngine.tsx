/**
 * SubscriptionEngine — Product subscriptions with recurring cycles, pause/resume.
 * Seller: view & manage all subscriptions. Buyer: subscribe to products.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Pause, Play, X, Calendar, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
  catalogItems?: any[];
  onSubscribe?: (itemId: string) => void;
}

const INTERVALS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

export default function SubscriptionEngine({ shopId, mode, catalogItems = [] }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedItem, setSelectedItem] = useState("");
  const [interval, setInterval] = useState("monthly");

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["storefront-subscriptions", shopId, mode],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_subscriptions").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q = q.eq("user_id", user!.id);
      const { data } = await q.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!shopId && !!user,
  });

  const createSub = useMutation({
    mutationFn: async () => {
      const item = catalogItems.find((i: any) => i.id === selectedItem);
      if (!item) throw new Error("Select a product");
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      await (supabase as any).from("storefront_subscriptions").insert({
        shop_id: shopId,
        item_id: selectedItem,
        user_id: user!.id,
        interval_type: interval,
        unit_price: item.price,
        currency: item.currency || "EUR",
        next_billing_at: nextBilling.toISOString(),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storefront-subscriptions"] }); toast.success("Subscribed!"); setSelectedItem(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "paused") updates.paused_at = new Date().toISOString();
      if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
      await (supabase as any).from("storefront_subscriptions").update(updates).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storefront-subscriptions"] }); toast.success("Updated"); },
  });

  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            {mode === "seller" ? "Subscriptions" : "My Subscriptions"}
          </h3>
          <Badge variant="outline" className="text-[10px]">{subscriptions.length}</Badge>
        </div>

        {/* Buyer: create new subscription */}
        {mode === "buyer" && catalogItems.length > 0 && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product..." /></SelectTrigger>
                <SelectContent>
                  {catalogItems.map((item: any) => (
                    <SelectItem key={item.id} value={item.id} className="text-xs">{item.title} — {item.price} {item.currency || "EUR"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERVALS.map(i => <SelectItem key={i.value} value={i.value} className="text-xs">{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" disabled={!selectedItem || createSub.isPending} onClick={() => createSub.mutate()}>
              {createSub.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Subscribe"}
            </Button>
          </div>
        )}

        {subscriptions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No subscriptions yet</p>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((sub: any) => (
              <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{sub.unit_price} {sub.currency} / {sub.interval_type}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-[9px] ${STATUS_COLORS[sub.status] || ""}`}>{sub.status}</Badge>
                    {sub.next_billing_at && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        Next: {new Date(sub.next_billing_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">Cycles: {sub.total_cycles}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {sub.status === "active" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: sub.id, status: "paused" })}>
                      <Pause className="h-3 w-3" />
                    </Button>
                  )}
                  {sub.status === "paused" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: sub.id, status: "active" })}>
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                  {sub.status !== "cancelled" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateStatus.mutate({ id: sub.id, status: "cancelled" })}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
