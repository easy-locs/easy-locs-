/**
 * MerchantKitchenQueue — Real-time kitchen display for incoming orders.
 * Uses storefront_orders as source of truth with realtime subscriptions.
 */
import { useState, useEffect, useCallback } from "react";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { updateStorefrontOrderStatus } from "@/lib/orders/orderEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, Clock, CheckCircle, Package, Truck, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface KitchenQueueProps {
  shopId: string;
}

const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready_for_pickup"];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock; next?: string; nextLabel?: string }> = {
  pending: { label: "New", color: "hsl(var(--chart-4))", icon: Clock, next: "accepted", nextLabel: "Accept" },
  accepted: { label: "Accepted", color: "hsl(var(--chart-2))", icon: CheckCircle, next: "preparing", nextLabel: "Start Preparing" },
  preparing: { label: "Preparing", color: "hsl(var(--chart-3))", icon: ChefHat, next: "ready_for_pickup", nextLabel: "Mark Ready" },
  ready_for_pickup: { label: "Ready", color: "hsl(var(--chart-1))", icon: Package, next: "completed", nextLabel: "Complete" },
};

function elapsed(created: string) {
  const diff = Math.floor((Date.now() - new Date(created).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MerchantKitchenQueue({ shopId }: KitchenQueueProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const fetchOrders = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("storefront_orders")
      .select("*, storefront_order_items(*)")
      .eq("shop_id", shopId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });

    setOrders(data ?? []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`kitchen-${shopId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "storefront_orders",
        filter: `shop_id=eq.${shopId}`,
      }, () => fetchOrders())
      .subscribe();

    const timer = setInterval(() => setTick((t) => t + 1), 1000);

    return () => {
      removeRealtimeChannel(channel);
      clearInterval(timer);
    };
  }, [shopId, fetchOrders]);

  const handleAdvance = async (order: any) => {
    const config = STATUS_CONFIG[order.status];
    if (!config?.next) return;

    try {
      await updateStorefrontOrderStatus({
        orderId: order.id,
        status: config.next,
        actorType: "merchant",
      });
      toast.success(`Order → ${STATUS_CONFIG[config.next]?.label ?? config.next}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update order");
    }
  };

  const handleReject = async (order: any) => {
    try {
      await updateStorefrontOrderStatus({
        orderId: order.id,
        status: "cancelled",
        actorType: "merchant",
        notes: "Rejected by merchant",
      });
      toast.success("Order cancelled");
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel");
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  const grouped = {
    pending: orders.filter((o) => o.status === "pending"),
    accepted: orders.filter((o) => o.status === "accepted"),
    preparing: orders.filter((o) => o.status === "preparing"),
    ready_for_pickup: orders.filter((o) => o.status === "ready_for_pickup"),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ChefHat className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Kitchen Queue</h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          {orders.length} active
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map((status) => {
          const config = STATUS_CONFIG[status];
          const StatusIcon = config.icon;

          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-4 w-4" style={{ color: config.color }} />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {config.label}
                </span>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {grouped[status].length}
                </Badge>
              </div>

              {grouped[status].length === 0 && (
                <div className="rounded-xl border border-dashed border-border/40 p-6 text-center text-muted-foreground text-xs">
                  No orders
                </div>
              )}

              {grouped[status].map((order: any) => {
                const items = order.storefront_order_items ?? [];
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {elapsed(order.created_at)}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-0.5">
                        {items.map((item: any) => (
                          <p key={item.id} className="text-[11px] text-foreground">
                            {item.quantity}× {item.title}
                          </p>
                        ))}
                      </div>

                      {order.notes && !order.notes.startsWith("idem:") && (
                        <p className="text-[10px] italic text-muted-foreground">
                          "{order.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className="text-[9px]">
                          {order.payment_status === "secured" ? "💰 Paid" : "⏳ Unpaid"}
                        </Badge>
                        <span className="font-bold text-foreground">
                          {formatMoneyByCountry(Number(order.total || 0), null, order.currency || "AED")}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {config.next && (
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-[11px]"
                            onClick={() => handleAdvance(order)}
                          >
                            {config.nextLabel}
                          </Button>
                        )}
                        {status === "pending" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-[11px]"
                            onClick={() => handleReject(order)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
