import { useState } from "react";
import { BackCard } from "@/components/ui/back-card";
import { addOrderItem, createOrder } from "@/lib/orders/orders-core";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";

export default function FoodOrderCheckoutPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const createDemoOrder = async () => {
    setLoading(true);
    try {
      const newOrder = await createOrder({
        workspaceId: activeWorkspace?.id,
        orderType: "food_delivery",
        serviceMode: "delivery",
        notes: "Ring the bell",
      });

      await addOrderItem({
        orderId: newOrder.id,
        itemName: "Pepperoni Pizza",
        unitPrice: 39,
        quantity: 1,
      });

      await addOrderItem({
        orderId: newOrder.id,
        itemName: "Coca Cola",
        unitPrice: 8,
        quantity: 2,
      });

      setOrder(newOrder);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background p-4 space-y-6">
      <BackCard label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Food Order Checkout</h1>
        <p className="text-sm text-muted-foreground">Create order → add items → checkout → dispatch</p>
      </div>

      <button
        onClick={createDemoOrder}
        disabled={loading}
        className="w-full bg-primary text-primary-foreground py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create demo order"}
      </button>

      {!!order && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-1">
          <p className="text-sm font-medium text-foreground">Order: {order.id?.slice(0, 8)}...</p>
          <p className="text-xs text-muted-foreground">status: {order.status}</p>
          <p className="text-xs text-muted-foreground">type: {order.order_type}</p>
          <p className="text-xs text-muted-foreground">total: {order.total_amount} {order.currency}</p>
        </div>
      )}
    </div>
  );
}
