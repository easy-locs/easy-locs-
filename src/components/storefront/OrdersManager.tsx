/**
 * OrdersManager — Seller-facing order management with realtime updates.
 * Status lifecycle: pending → accepted → preparing → shipped → completed / cancelled
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Loader2, CheckCircle, XCircle, Truck, Package, Clock } from "lucide-react";
import { toast } from "sonner";

interface OrdersManagerProps {
  shopId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-600", icon: Clock },
  accepted: { label: "Accepted", color: "bg-blue-500/10 text-blue-600", icon: CheckCircle },
  preparing: { label: "Preparing", color: "bg-purple-500/10 text-purple-600", icon: Package },
  shipped: { label: "Shipped", color: "bg-cyan-500/10 text-cyan-600", icon: Truck },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-600", icon: XCircle },
};

const nextStatus: Record<string, string> = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "shipped",
  shipped: "completed",
};

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function OrdersManager({ shopId }: OrdersManagerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_orders")
        .select("*, storefront_order_items(*)")
        .eq("shop_id", shopId)
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime: auto-refresh on new/updated orders
  useEffect(() => {
    const channel = supabase
      .channel(`storefront-orders-${shopId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "storefront_orders",
        filter: `shop_id=eq.${shopId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["my-orders", shopId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shopId, qc]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { data: order } = await (supabase as any).from("storefront_orders").select("*").eq("id", orderId).maybeSingle();
    await (supabase as any).from("storefront_orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
    qc.invalidateQueries({ queryKey: ["my-orders", shopId] });
    toast.success(`Order ${newStatus}`);

    // On completion: write commission split + settlement + notification
    if (newStatus === "completed" && order) {
      const total = Number(order.total ?? order.subtotal ?? 0);
      const currency = order.currency ?? "AED";
      const platformRate = 0.05;
      const platformAmount = Math.round(total * platformRate * 100) / 100;
      const netAmount = Math.round((total - platformAmount) * 100) / 100;

      // Commission split
      await (supabase as any).from("commission_splits").insert({
        order_id: orderId,
        total_amount: total,
        currency,
        platform_amount: platformAmount,
        platform_rate: platformRate,
        store_amount: netAmount,
        store_rate: 1 - platformRate,
        driver_amount: 0,
        driver_rate: 0,
        store_user_id: order.seller_id ?? null,
        status: "settled",
        settled_at: new Date().toISOString(),
      }).then(({ error }: any) => { if (error) console.error("[commission]", error.message); });

      // Settlement ledger
      await (supabase as any).from("settlement_ledger").insert({
        merchant_id: order.seller_id ?? null,
        order_id: orderId,
        gross_amount: total,
        platform_fee: platformAmount,
        processing_fee: 0,
        net_amount: netAmount,
        currency,
        status: "settled",
      }).then(({ error }: any) => { if (error) console.error("[settlement]", error.message); });

      // Notification to buyer
      if (order.buyer_id) {
        await (supabase as any).from("app_notifications").insert({
          user_id: order.buyer_id,
          scope: "global",
          category: "order",
          title: "Order completed",
          body: "Your order has been completed.",
          severity: "info",
          entity_type: "order",
          entity_id: orderId,
          metadata: { order_id: orderId, status: "completed" },
        }).then(({ error }: any) => { if (error) console.error("[notif]", error.message); });
      }
    }
  };

  const cancelOrder = async (orderId: string) => {
    await (supabase as any).from("storefront_orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", orderId);
    qc.invalidateQueries({ queryKey: ["my-orders", shopId] });
    toast.success("Order cancelled");
  };

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-primary" /> Orders ({orders.length})
      </h3>

      {orders.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No orders yet</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order: any) => {
            const cfg = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const next = nextStatus[order.status];
            const itemsSummary = (order.storefront_order_items || [])
              .map((oi: any) => `${oi.quantity}× ${oi.title}`)
              .join(", ");

            return (
              <Card key={order.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{order.buyer_name || order.buyer_email || "Customer"}</span>
                    </div>
                    <Badge className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1">{itemsSummary || "No items"}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{fmtPrice(order.total, order.currency)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {order.status !== "completed" && order.status !== "cancelled" && (
                    <div className="flex gap-2 pt-1">
                      {next && (
                        <Button size="sm" className="text-xs flex-1" onClick={() => updateStatus(order.id, next)}>
                          {next === "accepted" ? "Accept" : next === "preparing" ? "Start Preparing" : next === "shipped" ? "Mark Shipped" : "Complete"}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => cancelOrder(order.id)}>
                        Cancel
                      </Button>
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
