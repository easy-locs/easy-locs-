/**
 * CheckoutPage — Review cart, select delivery/pickup, choose payment, place order.
 * Uses storefront_orders as the single source of truth.
 * Route: /checkout
 */
import { useState, useRef } from "react";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { createStorefrontOrder } from "@/lib/orders/orderEngine";
import { resolveDisplayCurrency, formatMoneyByCountry } from "@/lib/currency-engine";
import { ArrowLeft, MapPin, CreditCard, Wallet, Banknote, Loader2, Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PaymentMethod = "wallet" | "card" | "cash";
type DeliveryMode = "delivery" | "pickup";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, total, itemCount, clearCart, updateQuantity, removeItem } = useCart();
  const [mode, setMode] = useState<DeliveryMode>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("wallet");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const idempotencyRef = useRef(crypto.randomUUID());

  if (itemCount === 0) {
    return (
      <div className="app-mobile-page flex flex-col items-center justify-center gap-4 px-4 bg-background" data-empty-state>
        <span className="text-5xl">🛒</span>
        <p className="text-sm font-medium text-muted-foreground">Your cart is empty</p>
        <Button variant="outline" onClick={() => navigate("/browse/food")} className="rounded-2xl">Browse food</Button>
      </div>
    );
  }

  const deliveryFee = mode === "delivery" ? 5 : 0;
  const grandTotal = total + deliveryFee;
  const cur = resolveDisplayCurrency({ country: "AE" });
  const fmt = (n: number) => formatMoneyByCountry(n, null, cur);

  const placeOrder = async () => {
    if (!user) { toast.error("Please sign in to place an order"); return; }
    if (!cart.restaurantId) { toast.error("No restaurant selected"); return; }
    setPlacing(true);

    try {
      // Resolve actual seller/owner — try storefront_pages first, then seed_merchants
      const { supabase } = await import("@/integrations/supabase/client");
      let sellerId = user.id;
      const { data: sfData } = await (supabase as any)
        .from("storefront_pages")
        .select("user_id")
        .eq("id", cart.restaurantId)
        .maybeSingle();
      if (sfData?.user_id) {
        sellerId = sfData.user_id;
      }
      // No seed_merchants fallback — storefront_pages is the only public truth

      const { order, alreadyExists } = await createStorefrontOrder({
        shopId: cart.restaurantId,
        sellerId,
        items: cart.items,
        fulfillmentType: mode,
        currency: resolveDisplayCurrency({ country: "AE" }),
        deliveryFee,
        notes: notes || undefined,
        paymentMethod: payment,
        idempotencyKey: idempotencyRef.current,
      });

      if (alreadyExists) {
        toast.info("Order already placed");
      } else {
        toast.success("Order placed!");
      }

      clearCart();
      idempotencyRef.current = crypto.randomUUID();
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
    <div className="app-mobile-page flex flex-col bg-background" data-checkout-form>
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Checkout</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-4">
        {/* Restaurant */}
        <div className="rounded-2xl p-4 bg-card border border-border/20">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Restaurant</p>
          <p className="text-sm font-bold mt-0.5 text-foreground">{cart.restaurantName}</p>
        </div>

        {/* Delivery mode */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Delivery mode</p>
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
        </section>

        {/* Address */}
        {mode === "delivery" && (
          <>
            <button
              onClick={() => setAddressOpen(true)}
              className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform bg-card border border-border/20"
            >
              <MapPin className="w-5 h-5 shrink-0 text-primary" />
              <div className="flex-1 text-left">
                <p className="text-[11px] text-muted-foreground font-medium">Deliver to</p>
                <p className="text-sm font-semibold text-foreground">Select address</p>
              </div>
            </button>
            <AddressSelectorSheet open={addressOpen} onOpenChange={setAddressOpen} />
          </>
        )}

        {/* Items */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Items ({itemCount})</p>
          <div className="rounded-2xl overflow-hidden bg-card border border-border/20">
            {cart.items.map((item, idx) => (
              <div
                key={item.id}
                data-cart-item
                className="flex items-center gap-3 py-3 px-4"
                style={idx < cart.items.length - 1 ? { borderBottom: "1px solid hsl(var(--border) / 0.08)" } : undefined}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmt(item.unitPrice * item.quantity)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => item.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform bg-muted"
                  >
                    {item.quantity <= 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                  </button>
                  <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: "hsl(var(--primary) / 0.1)" }}
                  >
                    <Plus className="w-3 h-3 text-primary" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing summary */}
        <div className="rounded-2xl p-4 space-y-2 bg-card border border-border/20">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground">{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="font-semibold text-foreground">{deliveryFee === 0 ? "Free" : fmt(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-border/20">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Notes */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions..."
            className="w-full rounded-2xl p-3 text-sm resize-none h-20 bg-card border border-border/20"
          />
        </section>

        {/* Payment method */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2 text-muted-foreground">Payment</p>
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.key}
                onClick={() => setPayment(pm.key)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-all"
                style={{
                  background: payment === pm.key ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                  border: `1px solid ${payment === pm.key ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.12)"}`,
                }}
              >
                <pm.icon className="w-5 h-5" style={{ color: payment === pm.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                <span className="text-sm font-semibold text-foreground">{pm.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom CTA */}
      <div className="fixed left-0 right-0 px-4 pt-3 z-40 bg-background border-t border-border/10" style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))", paddingBottom: "12px" }}>
        <Button
          data-submit-order
          data-primary-cta
          onClick={placeOrder}
          disabled={placing}
          className="w-full rounded-2xl h-13 text-sm font-bold"
        >
          {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Place Order · {fmt(grandTotal)}
        </Button>
      </div>
    </div>
  );
}
