/**
 * ReturnsRefunds — Return requests, refund policies, tracking, store credit.
 * Props: shopId, mode ("seller" | "buyer")
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Package, Clock, CheckCircle2, XCircle, CreditCard, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode?: "seller" | "buyer";
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  requested: { label: "Requested", color: "bg-yellow-500/10 text-yellow-600", icon: Clock },
  approved: { label: "Approved", color: "bg-blue-500/10 text-blue-600", icon: CheckCircle2 },
  shipped_back: { label: "Shipped Back", color: "bg-purple-500/10 text-purple-600", icon: Package },
  received: { label: "Received", color: "bg-cyan-500/10 text-cyan-600", icon: Package },
  refunded: { label: "Refunded", color: "bg-green-500/10 text-green-600", icon: CreditCard },
  store_credit: { label: "Store Credit", color: "bg-primary/10 text-primary", icon: CreditCard },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600", icon: XCircle },
};

const REASONS = ["Defective", "Wrong item", "Changed mind", "Not as described", "Arrived late", "Other"];

export default function ReturnsRefunds({ shopId, mode = "buyer" }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reason, setReason] = useState("Defective");
  const [description, setDescription] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refundType, setRefundType] = useState<"refund" | "store_credit">("refund");

  // Load return requests
  const { data: returns = [] } = useQuery({
    queryKey: ["storefront-returns", shopId, mode, user?.id],
    queryFn: async () => {
      let query = (supabase as any)
        .from("storefront_return_requests")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      if (mode === "buyer" && user) query = query.eq("buyer_id", user.id);
      const { data } = await query;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Load buyer's orders for return submission
  const { data: orders = [] } = useQuery({
    queryKey: ["buyer-orders-for-return", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_orders")
        .select("id, created_at, total_price, currency, status")
        .eq("shop_id", shopId)
        .eq("buyer_id", user!.id)
        .in("status", ["completed", "shipped", "delivered"])
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!shopId && !!user && mode === "buyer",
  });

  // Load refund policy
  const { data: policy } = useQuery({
    queryKey: ["refund-policy", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_refund_policies")
        .select("*")
        .eq("shop_id", shopId)
        .maybeSingle();
      return data;
    },
    enabled: !!shopId,
  });

  // Store credit balance
  const { data: creditBalance } = useQuery({
    queryKey: ["store-credit", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_store_credits")
        .select("balance")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.balance || 0;
    },
    enabled: !!shopId && !!user && mode === "buyer",
  });

  const submitReturn = useMutation({
    mutationFn: async () => {
      if (!user || !selectedOrderId) throw new Error("Missing data");
      const { error } = await (supabase as any).from("storefront_return_requests").insert({
        shop_id: shopId,
        order_id: selectedOrderId,
        buyer_id: user.id,
        reason,
        description: description.trim() || null,
        preferred_resolution: refundType,
        status: "requested",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Return request submitted");
      setDescription("");
      setSelectedOrderId(null);
      qc.invalidateQueries({ queryKey: ["storefront-returns", shopId] });
    },
    onError: () => toast.error("Failed to submit return"),
  });

  const updateReturnStatus = useMutation({
    mutationFn: async ({ returnId, status }: { returnId: string; status: string }) => {
      const updates: any = { status };
      if (status === "refunded" || status === "store_credit") updates.resolved_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("storefront_return_requests")
        .update(updates)
        .eq("id", returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Return updated");
      qc.invalidateQueries({ queryKey: ["storefront-returns", shopId] });
    },
  });

  const pendingReturns = returns.filter((r: any) => !["refunded", "store_credit", "rejected"].includes(r.status));
  const resolvedReturns = returns.filter((r: any) => ["refunded", "store_credit", "rejected"].includes(r.status));

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" /> Returns & Refunds
          </h3>
          <div className="flex gap-2">
            {mode === "buyer" && creditBalance > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <CreditCard className="h-2.5 w-2.5" /> Credit: {creditBalance}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{returns.length} requests</Badge>
          </div>
        </div>

        {/* Refund Policy */}
        {policy && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] font-medium">Return Policy</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {policy.return_window_days || 30}-day return window · {policy.accepts_used ? "Used items accepted" : "Unused items only"} · {policy.free_returns ? "Free returns" : "Buyer pays return shipping"}
            </p>
          </div>
        )}

        {/* Submit return (buyer) */}
        {mode === "buyer" && user && orders.length > 0 && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">Request a Return</p>
            <Select value={selectedOrderId || ""} onValueChange={setSelectedOrderId}>
              <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select order" /></SelectTrigger>
              <SelectContent>
                {orders.map((o: any) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    Order {o.id.substring(0, 8)} · {o.total_price} {o.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={2}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={refundType === "refund" ? "default" : "outline"}
                className="text-[10px] flex-1"
                onClick={() => setRefundType("refund")}
              >
                <CreditCard className="h-3 w-3 mr-1" /> Refund
              </Button>
              <Button
                size="sm"
                variant={refundType === "store_credit" ? "default" : "outline"}
                className="text-[10px] flex-1"
                onClick={() => setRefundType("store_credit")}
              >
                <CreditCard className="h-3 w-3 mr-1" /> Store Credit
              </Button>
            </div>
            <Button size="sm" className="w-full text-xs" onClick={() => submitReturn.mutate()} disabled={!selectedOrderId || submitReturn.isPending}>
              Submit Return Request
            </Button>
          </div>
        )}

        {/* Active returns */}
        {pendingReturns.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground">Active Returns</p>
            {pendingReturns.map((r: any) => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.requested;
              const Icon = st.icon;
              return (
                <div key={r.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[9px] ${st.color}`}>
                        <Icon className="h-2.5 w-2.5 mr-0.5" /> {st.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Order: {r.order_id?.substring(0, 8)}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs">{r.reason}</p>
                  {r.description && <p className="text-[10px] text-muted-foreground">{r.description}</p>}

                  {/* Status flow (seller) */}
                  {mode === "seller" && (
                    <div className="flex gap-1 flex-wrap">
                      {r.status === "requested" && (
                        <>
                          <Button size="sm" variant="outline" className="text-[9px] h-6"
                            onClick={() => updateReturnStatus.mutate({ returnId: r.id, status: "approved" })}>
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="text-[9px] h-6 text-destructive"
                            onClick={() => updateReturnStatus.mutate({ returnId: r.id, status: "rejected" })}>
                            <XCircle className="h-2.5 w-2.5 mr-0.5" /> Reject
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <Button size="sm" variant="outline" className="text-[9px] h-6"
                          onClick={() => updateReturnStatus.mutate({ returnId: r.id, status: "shipped_back" })}>
                          <ArrowRight className="h-2.5 w-2.5 mr-0.5" /> Mark Shipped
                        </Button>
                      )}
                      {r.status === "shipped_back" && (
                        <Button size="sm" variant="outline" className="text-[9px] h-6"
                          onClick={() => updateReturnStatus.mutate({ returnId: r.id, status: "received" })}>
                          <Package className="h-2.5 w-2.5 mr-0.5" /> Received
                        </Button>
                      )}
                      {r.status === "received" && (
                        <>
                          <Button size="sm" className="text-[9px] h-6"
                            onClick={() => updateReturnStatus.mutate({ returnId: r.id, status: "refunded" })}>
                            <CreditCard className="h-2.5 w-2.5 mr-0.5" /> Issue Refund
                          </Button>
                          <Button size="sm" variant="outline" className="text-[9px] h-6"
                            onClick={() => updateReturnStatus.mutate({ returnId: r.id, status: "store_credit" })}>
                            Store Credit
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="flex items-center gap-1">
                    {["requested", "approved", "shipped_back", "received", "refunded"].map((step, i, arr) => {
                      const currentIdx = arr.indexOf(r.status);
                      const done = i <= currentIdx;
                      return (
                        <div key={step} className="flex-1">
                          <div className={`h-1 rounded-full ${done ? "bg-primary" : "bg-muted"}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resolved */}
        {resolvedReturns.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground">Resolved ({resolvedReturns.length})</p>
            {resolvedReturns.slice(0, 3).map((r: any) => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.requested;
              return (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-[10px]">
                  <span>{r.reason} · Order {r.order_id?.substring(0, 8)}</span>
                  <Badge className={`text-[8px] ${st.color}`}>{st.label}</Badge>
                </div>
              );
            })}
          </div>
        )}

        {returns.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No return requests</p>
        )}
      </CardContent>
    </Card>
  );
}
