import { useState, useRef } from "react";
import { useCart } from "@/hooks/useCart";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createStorefrontOrder } from "@/lib/orders/orderEngine";
import { resolveDisplayCurrency, formatMoneyByCountry } from "@/lib/currency-engine";
import { toast } from "sonner";

export default function CartSheet() {
  const { cart, total, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expressBusy, setExpressBusy] = useState(false);
  const idempotencyRef = useRef(crypto.randomUUID());

  if (itemCount === 0) return null;

  const deliveryFee = 5;
  const grandTotal = total + deliveryFee;
  const cur = resolveDisplayCurrency({ country: "AE" });
  const fmt = (n: number) => formatMoneyByCountry(n, null, cur);

  const expressCheckout = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate("/login");
      return;
    }
    if (!cart.restaurantId) {
      toast.error("No restaurant selected");
      navigate("/checkout");
      return;
    }
    setExpressBusy(true);
    try {
      const { storefrontService } = await import("@/services");
      const ownerUserId = await storefrontService.fetchPageOwnerUserId(cart.restaurantId);
      if (!ownerUserId) {
        toast.info("Redirecting to full checkout");
        navigate("/checkout");
        return;
      }

      const { order, alreadyExists } = await createStorefrontOrder({
        shopId: cart.restaurantId,
        sellerId: ownerUserId,
        items: cart.items,
        fulfillmentType: "delivery",
        currency: cur,
        deliveryFee,
        paymentMethod: "wallet",
        idempotencyKey: idempotencyRef.current,
      });

      idempotencyRef.current = crypto.randomUUID();

      if (alreadyExists) {
        toast.info("Order already placed");
      } else {
        toast.success("Order placed!");
      }
      clearCart();
      navigate(`/order/${order.id}`);
    } catch (e: any) {
      toast.error("Order failed — try full checkout");
      navigate("/checkout");
    } finally {
      setExpressBusy(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,8px))] left-4 right-4 z-40 flex items-center justify-between px-5 py-3.5 rounded-2xl"
          style={{
            background: "hsl(var(--primary))",
            boxShadow: "0 8px 32px hsl(var(--primary) / 0.35)",
          }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            <span className="text-sm font-bold text-primary-foreground">{itemCount} items</span>
          </div>
          <span className="text-sm font-bold text-primary-foreground">
            {fmt(grandTotal)}
          </span>
        </motion.button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle className="text-left">
            <span className="text-lg font-black">Your Cart</span>
            {cart.restaurantName && (
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{cart.restaurantName}</p>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {cart.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex gap-3 p-3 rounded-2xl"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.15)" }}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
                    <span className="text-xl">🍽️</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate">{item.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{fmt(item.unitPrice * item.quantity)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: "hsl(var(--muted))" }}
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: "hsl(var(--primary) / 0.1)" }}
                    >
                      <Plus className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-4 rounded-2xl p-3 space-y-1.5" style={{ background: "hsl(var(--muted) / 0.3)" }}>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-semibold">{fmt(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border/15">
            <span>Total</span>
            <span>{fmt(grandTotal)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <Button
            onClick={expressCheckout}
            disabled={expressBusy}
            className="w-full rounded-2xl h-12 text-sm font-bold gap-2"
            style={{ background: "linear-gradient(135deg, hsl(220 40% 18%), hsl(220 40% 24%))", color: "white" }}
          >
            {expressBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" style={{ color: "hsl(38 65% 56%)" }} />}
            Express Order · {fmt(grandTotal)}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/checkout")}
            className="w-full rounded-2xl h-11 text-sm font-semibold"
          >
            Full Checkout
          </Button>
          <button
            onClick={clearCart}
            className="w-full text-center text-xs text-muted-foreground font-medium py-2 active:opacity-60"
          >
            Clear cart
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
