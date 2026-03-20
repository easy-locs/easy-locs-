import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";

import { useV1Checkout } from "@/hooks/useV1Checkout";
import { useState } from "react";

export default function V1CheckoutBridgePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, total } = useCart();
  const { submitting, submitCheckout } = useV1Checkout();
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "cash" | "card">("wallet");

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    if (!cart.restaurantId || cart.items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const order = await submitCheckout({
        merchantId: cart.restaurantId,
        merchantName: cart.restaurantName ?? null,
        customerUserId: user.id,
        currency: "AED",
        paymentMethod,
        items: cart.items.map((item) => ({
          menuItemId: item.menuItemId ?? null,
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice ?? 0),
        })),
      });

      toast.success("Order created");
      navigate(`/tracking/${order.id}`);
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Checkout</h1>

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <div className="text-sm font-bold text-foreground">{cart.restaurantName || "Merchant"}</div>

        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{item.name}</span>
            <span>{item.quantity} × {Number(item.unitPrice ?? 0).toFixed(2)}</span>
          </div>
        ))}

        <div className="flex items-center justify-between pt-3 border-t border-border/20">
          <span className="text-sm font-bold text-foreground">Total</span>
          <span className="text-sm font-bold text-foreground">{total.toFixed(2)} AED</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-bold text-foreground">Payment method</div>

        {(["wallet", "card", "cash"] as const).map((method) => (
          <button
            key={method}
            onClick={() => setPaymentMethod(method)}
            className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
              paymentMethod === method ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
            }`}
          >
            {method}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
      >
        {submitting ? "Processing..." : `Pay ${total.toFixed(2)} AED`}
      </button>
    </div>
  );
}
