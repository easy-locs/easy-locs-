/**
 * ReturnsRefundEngine — Return requests, approval workflow, refunds, RMA tracking.
 * Seller: approve/reject, track returns. Buyer: request returns, track status.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, CheckCircle, XCircle, Truck, Package, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
  orders?: any[];
}

const STATUS_FLOW: Record<string, string[]> = {
  requested: ["approved", "rejected"],
  approved: ["shipped"],
  shipped: ["received"],
  received: ["refunded"],
};

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-warning/10 text-warning",
  approved: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  shipped: "bg-info/10 text-info",
  received: "bg-accent/10 text-accent-foreground",
  refunded: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

const REASONS = [
  { value: "defective", label: "Defective/Damaged" },
  { value: "wrong_item", label: "Wrong Item" },
  { value: "not_as_described", label: "Not as Described" },
  { value: "changed_mind", label: "Changed Mind" },
  { value: "late_delivery", label: "Late Delivery" },
  { value: "other", label: "Other" },
];

export default function ReturnsRefundEngine({ shopId, mode, orders = [] }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [reason, setReason] = useState("other");
  const [description, setDescription] = useState("");
  const [refundType, setRefundType] = useState("full");

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["storefront-returns", shopId, mode],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_returns").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q = q.eq("buyer_id", user!.id);
      const { data } = await q.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!shopId && !!user,
  });

  const createReturn = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("Select an order");
      await (supabase as any).from("storefront_returns").insert({
        shop_id: shopId,
        order_id: selectedOrder,
        user_id: user!.id,
        reason,
        description: description || null,
        refund_type: refundType,
        currency: "EUR",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storefront-returns"] });
      toast.success("Return requested!");
      setCreating(false);
      setSelectedOrder("");
      setDescription("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "approved") updates.approved_at = new Date().toISOString();
      if (status === "shipped") updates.shipped_at = new Date().toISOString();
      if (status === "received") updates.received_at = new Date().toISOString();
      if (status === "refunded") updates.refunded_at = new Date().toISOString();
      if (notes) updates.admin_notes = notes;
      await (supabase as any).from("storefront_returns").update(updates).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["storefront-returns"] }); toast.success("Updated"); },
  });

  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            {mode === "seller" ? "Returns & Refunds" : "My Returns"}
          </h3>
          {mode === "buyer" && !creating && orders.length > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setCreating(true)}>
              <Plus className="h-3 w-3 mr-1" /> Request Return
            </Button>
          )}
        </div>

        {/* Buyer: create return */}
        {creating && (
          <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20">
            <Select value={selectedOrder} onValueChange={setSelectedOrder}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select order..." /></SelectTrigger>
              <SelectContent>
                {orders.map((o: any) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">Order #{o.id.slice(0, 8)} — {o.total} {o.currency || "EUR"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={refundType} onValueChange={setRefundType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full" className="text-xs">Full Refund</SelectItem>
                  <SelectItem value="partial" className="text-xs">Partial Refund</SelectItem>
                  <SelectItem value="exchange" className="text-xs">Exchange</SelectItem>
                  <SelectItem value="store_credit" className="text-xs">Store Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue..." className="text-xs" rows={2} />
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs flex-1" disabled={!selectedOrder || createReturn.isPending} onClick={() => createReturn.mutate()}>
                {createReturn.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                Submit Return
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Returns list */}
        {returns.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No returns</p>
        ) : (
          <div className="space-y-2">
            {returns.map((ret: any) => (
              <div key={ret.id} className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold">{ret.rma_code || ret.id.slice(0, 8)}</span>
                      <Badge className={`text-[9px] ${STATUS_COLORS[ret.status] || ""}`}>{ret.status}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {ret.reason} • {ret.refund_type} • {new Date(ret.created_at).toLocaleDateString()}
                    </p>
                    {ret.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{ret.description}</p>}
                    {ret.tracking_number && (
                      <p className="text-[10px] text-primary mt-0.5 flex items-center gap-1">
                        <Truck className="h-2.5 w-2.5" /> {ret.tracking_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Seller actions */}
                {mode === "seller" && STATUS_FLOW[ret.status] && (
                  <div className="flex gap-1.5 pl-7">
                    {STATUS_FLOW[ret.status].map(nextStatus => (
                      <Button
                        key={nextStatus}
                        size="sm"
                        variant={nextStatus === "rejected" ? "destructive" : "outline"}
                        className="h-6 text-[10px]"
                        onClick={() => updateStatus.mutate({ id: ret.id, status: nextStatus })}
                      >
                        {nextStatus === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {nextStatus === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                        {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Buyer: add tracking */}
                {mode === "buyer" && ret.status === "approved" && !ret.tracking_number && (
                  <div className="flex gap-2 pl-7">
                    <Input
                      placeholder="Tracking number..."
                      className="h-7 text-[10px] flex-1"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value;
                          if (val) updateStatus.mutate({ id: ret.id, status: "shipped", notes: `Tracking: ${val}` });
                        }
                      }}
                    />
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
