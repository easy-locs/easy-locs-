/**
 * CartSheet — Slide-up bottom sheet showing current cart items.
 */
import { useCart } from "@/hooks/useCart";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CartSheet() {
  const { cart, total, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  if (itemCount === 0) return null;

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
          <span className="text-sm font-bold text-primary-foreground">View Cart</span>
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

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={() => navigate("/checkout")}
            className="w-full rounded-2xl h-12 text-sm font-bold"
          >
            Proceed to Checkout
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
