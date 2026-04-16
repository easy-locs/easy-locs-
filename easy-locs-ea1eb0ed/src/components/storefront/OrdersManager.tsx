import { db } from "@/services/db";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AppCard, CardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Loader2, CheckCircle, XCircle, Truck, Package, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  storefrontOrdersService,
  type StorefrontOrder,
  type StorefrontOrderItem,
} from "@/services/storefront-orders.service";

interface OrdersManagerProps {
  shopId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
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
    queryFn: () => storefrontOrdersService.fetchOrdersByShop(shopId, user?.id),
    enabled: !!user,
  });

  useEffect(() => {
    const channel = db
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

    return () => { removeRealtimeChannel(channel); };
  }, [shopId, qc]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await storefrontOrdersService.updateOrderStatus(orderId, newStatus);
      qc.invalidateQueries({ queryKey: ["my-orders", shopId] });
      toast.success(`Order ${newStatus}`);
    } catch {
      toast.error("Failed to update order status");
      return;
    }

    if (newStatus === "completed") {
      try {
        await storefrontOrdersService.completeOrderWithSettlement(orderId);
      } catch {
        console.warn("[OrdersManager] Settlement bookkeeping failed for", orderId);
        toast.warning("Order completed but settlement recording failed — will retry automatically");
      }
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await storefrontOrdersService.updateOrderStatus(orderId, "cancelled");
      qc.invalidateQueries({ queryKey: ["my-orders", shopId] });
      toast.success("Order cancelled");
    } catch {
      toast.error("Failed to cancel order");
    }
  };

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ShoppingBag className="h-4 w-4 text-primary" /> Orders ({orders.length})
      </h3>

      {orders.length === 0 ? (
        <AppCard><CardContent className="py-8 text-center text-muted-foreground text-sm">No orders yet</CardContent></AppCard>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const cfg = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const next = nextStatus[order.status];
            const itemsSummary = (order.storefront_order_items || [])
              .map((oi) => `${oi.quantity}× ${oi.title}`)
              .join(", ");

            return (
              <AppCard key={order.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{order.buyer_name || order.buyer_email || "Customer"}</span>
                    </div>
                    <Badge className={`text-[0.625rem] ${cfg.color}`}>{cfg.label}</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1">{itemsSummary || "No items"}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{fmtPrice(Number(order.total ?? order.subtotal ?? 0), order.currency)}</span>
                    <span className="text-[0.625rem] text-muted-foreground">
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
              </AppCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
