/**
 * CheckoutPage — Review cart, select delivery/pickup, choose payment, place order.
 * Route: /checkout
 * Business model: prices exist internally (hidden on restaurant page, visible here).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { createOrder, addOrderItem, updateOrderStatus } from "@/lib/orders/orders-core";
import { ArrowLeft, MapPin, CreditCard, Wallet, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PaymentMethod = "wallet" | "card" | "cash";
type DeliveryMode = "delivery" | "pickup";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, total, itemCount, clearCart } = useCart();
  const [mode, setMode] = useState<DeliveryMode>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("wallet");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  if (itemCount === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-4" style={{ background: "hsl(var(--background))" }}>
        <span className="text-5xl">🛒</span>
        <p className="text-sm font-medium text-muted-foreground">Your cart is empty</p>
        <Button variant="outline" onClick={() => navigate("/food")} className="rounded-2xl">Browse food</Button>
      </div>
    );
  }

  const deliveryFee = mode === "delivery" ? 5 : 0;
  const grandTotal = total + deliveryFee;

  const placeOrder = async () => {
    if (!user) { toast.error("Please sign in to place an order"); return; }
    setPlacing(true);
    try {
      const order = await createOrder({
        merchantProfileId: cart.restaurantId ?? undefined,
        orderType: "food_delivery",
        serviceMode: mode === "delivery" ? "delivery" : "delivery",
        notes: notes || undefined,
      });

      for (const item of cart.items) {
        await addOrderItem({
          orderId: order.id,
          menuItemId: item.menuItemId,
          itemName: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          notes: item.notes,
        });
      }

      await updateOrderStatus({ orderId: order.id, status: "pending" });
      clearCart();
      toast.success("Order placed!");
      navigate(`/order/${order.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const paymentMethods: { key: PaymentMethod; label: string; icon: typeof Wallet }[] = [
    { key: "wallet", label: "Wallet", icon: Wallet },
    { key: "card", label: "Card", icon: CreditCard },
    { key: "cash", label: "Cash", icon: Banknote },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pb-3" style={{ paddingTop: "max(env(safe-area-inset-top, 12px), 12px)" }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-black tracking-tight">Checkout</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-5">
        {/* Restaurant */}
        <div className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.15)" }}>
          <p className="text-xs text-muted-foreground font-medium">Restaurant</p>
          <p className="text-sm font-bold mt-0.5">{cart.restaurantName}</p>
        </div>

        {/* Delivery mode */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Delivery mode</p>
          <div className="flex gap-2">
            {(["delivery", "pickup"] as DeliveryMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-3 rounded-2xl text-xs font-bold capitalize active:scale-95 transition-all"
                style={{
                  background: mode === m ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  color: mode === m ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                }}
              >
                {m === "delivery" ? "🚗 Delivery" : "🏪 Pickup"}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        {mode === "delivery" && (
          <button className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.15)" }}>
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-xs text-muted-foreground font-medium">Deliver to</p>
              <p className="text-sm font-semibold">Select address</p>
            </div>
          </button>
        )}

        {/* Items summary */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Items ({itemCount})</p>
          <div className="space-y-2">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-5">{item.quantity}×</span>
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions..."
            className="w-full rounded-2xl p-3 text-sm resize-none h-20"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.15)" }}
          />
        </div>

        {/* Payment method */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Payment</p>
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.key}
                onClick={() => setPayment(pm.key)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl active:scale-[0.98] transition-all"
                style={{
                  background: payment === pm.key ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                  border: `1px solid ${payment === pm.key ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.15)"}`,
                }}
              >
                <pm.icon className="w-5 h-5" style={{ color: payment === pm.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                <span className="text-sm font-semibold">{pm.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-safe pt-3" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border) / 0.1)", paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)" }}>
        <Button
          onClick={placeOrder}
          disabled={placing}
          className="w-full rounded-2xl h-13 text-sm font-bold"
        >
          {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Place Order
        </Button>
      </div>
    </div>
  );
}
