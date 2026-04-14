/**
 * OrderReceiptPage — Digital receipt for a completed/any order.
 * Uses storefront_orders + storefront_order_items with status history.
 */
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrderWithItems, getOrderStatusHistory } from "@/lib/orders/orderEngine";
import OrderReceipt from "@/components/order/OrderReceipt";
import UnifiedTimeline from "@/components/order/UnifiedTimeline";
import { buildUnifiedTimeline } from "@/lib/order/unified-order-types";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function OrderReceiptPage() {
  useUiEngine("orderreceiptpage");
  const navigate = useNavigate();
  const { orderId = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["order-receipt-page", orderId],
    queryFn: async () => {
      const order = await getOrderWithItems(orderId);
      const history = await getOrderStatusHistory(orderId);
      return { order, history };
    },
    enabled: !!orderId,
    staleTime: 10000,
  });

  const order = data?.order;
  const items = order?.storefront_order_items ?? [];
  const history = data?.history ?? [];
  const timeline = order ? buildUnifiedTimeline(order, null) : [];

  return (
    <SubPageShell
      title="Order Receipt"
      subtitle={orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : undefined}
      onBack={() => navigate("/my-orders")}
      noContentPad
    >
      <div className="px-4 pt-3 space-y-4">
        {isLoading && (
          <div className="py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        )}

        {!isLoading && !order && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Receipt not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/my-orders")}>
              Back to Orders
            </Button>
          </div>
        )}

        {!isLoading && order && (
          <>
            <OrderReceipt order={order} items={items} />

            {timeline.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">Order Timeline</p>
                  <UnifiedTimeline events={timeline} vertical />
                </CardContent>
              </Card>
            )}

            {history.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Status History</p>
                  {history.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between text-[11px] py-1 border-b border-border/30 last:border-0">
                      <span className="font-medium text-foreground capitalize">{h.status}</span>
                      <span className="text-muted-foreground">
                        {h.actor_type} · {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button onClick={() => navigate(`/order/${order.id}`)} className="w-full rounded-2xl">
              Track Order
            </Button>
          </>
        )}
      </div>
    </SubPageShell>
  );
}
