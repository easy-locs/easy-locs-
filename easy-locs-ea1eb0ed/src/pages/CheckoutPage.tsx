/**
 * CheckoutPage — Review cart, select delivery/pickup, choose payment, place order.
 * Uses storefront_orders as the single source of truth.
 * Payment hardening: Card (real Stripe), Wallet (atomic transfer), Cash (COD).
 * Route: /checkout
 */
import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { AddressSelectorSheet } from "@/components/address/AddressSelectorSheet";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { createStorefrontOrder, updateOrderPaymentStatus } from "@/lib/orders/orderEngine";
import { trackFlowStart, trackFlowComplete, trackFlowAbandon } from "@/lib/smart-core";
import { resolveDisplayCurrency, formatMoneyByCountry } from "@/lib/currency-engine";
import { useLocationStore } from "@/stores/locationStore";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { executeWalletTransfer } from "@/lib/wallet/wallet-transfer";
import { logger } from "@/lib/monitoring";
import {
  ArrowLeft, MapPin, CreditCard, Wallet, Banknote,
  Loader2, Plus, Minus, Trash2, AlertTriangle, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const CardPayment = lazy(() => import("@/components/payments/CardPayment"));
const AppleGooglePayButton = lazy(() => import("@/components/payments/AppleGooglePayButton"));
const MobileMoneyPayment = lazy(() => import("@/components/payments/MobileMoneyPayment"));
const CryptoPayment = lazy(() => import("@/components/payments/CryptoPayment"));

type PaymentMethod = "wallet" | "card" | "cash" | "mobile_money" | "crypto";
type DeliveryMode = "delivery" | "pickup";
type CheckoutStep = "review" | "card_payment" | "mobile_money_payment" | "crypto_payment" | "processing";

export default function CheckoutPage() {
  useUiEngine("checkout");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, total, itemCount, clearCart, updateQuantity, removeItem } = useCart();
  const [mode, setMode] = useState<DeliveryMode>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("wallet");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [step, setStep] = useState<CheckoutStep>("review");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const idempotencyRef = useRef(crypto.randomUUID());
  const flowStartRef = useRef(Date.now());
  const flowCompletedRef = useRef(false);

  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const { rows: walletAccounts } = useWalletAccounts(user?.id);

  useEffect(() => {
    trackFlowStart("checkout");
    flowStartRef.current = Date.now();
    flowCompletedRef.current = false;
    return () => {
      if (!flowCompletedRef.current) trackFlowAbandon("checkout");
    };
  }, []);

  if (itemCount === 0) {
    const browseOptions = [
      { emoji: "🍽️", label: "Food", path: "/browse/food" },
      { emoji: "🛒", label: "Grocery", path: "/browse/grocery" },
      { emoji: "🛍️", label: "Shops", path: "/browse/shops" },
      { emoji: "🛠️", label: "Services", path: "/browse/services" },
    ];
    return (
      <SubPageShell noContentPad className="flex flex-col items-center justify-center gap-6 px-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-muted">
            <span className="text-4xl">🛒</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-2">Your cart is empty</h2>
          <p className="text-sm text-muted-foreground text-center max-w-[260px]">
            Browse our categories to find what you need
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {browseOptions.map(opt => (
            <button
              key={opt.path}
              onClick={() => navigate(opt.path)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-card)", border: "1px solid hsl(var(--border) / 0.1)" }}
            >
              <span className="text-lg">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate("/my-orders/active")}
          className="text-xs text-muted-foreground"
        >
          View my orders
        </Button>
      </SubPageShell>
    );
  }

  const deliveryFee = mode === "delivery" ? 5 : 0;
  const grandTotal = total + deliveryFee;
  const cur = resolveDisplayCurrency({ country: "AE" });
  const fmt = (n: number) => formatMoneyByCountry(n, null, cur);

  const primaryWallet = walletAccounts.find((w) => w.is_default) || walletAccounts[0];
  const walletBalance = primaryWallet
    ? ((primaryWallet as any).balance_cash ?? primaryWallet.balance ?? 0)
    : 0;
  const walletInsufficient = payment === "wallet" && walletBalance < grandTotal;

  const validateCheckout = (): string | null => {
    if (!user) return "Please sign in to place an order";
    if (!cart.restaurantId) return "No restaurant selected";
    if (mode === "delivery" && !selectedLocation) return "Please select a delivery address first";
    if (payment === "wallet" && !primaryWallet) return "No wallet account found — please set up your wallet first";
    if (payment === "wallet" && walletInsufficient) {
      return `Insufficient wallet balance. Available: ${fmt(walletBalance)}, Required: ${fmt(grandTotal)}`;
    }
    return null;
  };

  const resolveSellerId = async (): Promise<string> => {
    const { storefrontService } = await import("@/services");
    const ownerUserId = await storefrontService.fetchPageOwnerUserId(cart.restaurantId!);
    return ownerUserId || user?.id || "";
  };

  const completeCheckout = useCallback((orderId: string, alreadyExists: boolean) => {
    if (alreadyExists) {
      toast.info("Order already placed");
    } else {
      toast.success("Order placed successfully!");
    }
    flowCompletedRef.current = true;
    trackFlowComplete("checkout", Date.now() - flowStartRef.current);
    clearCart();
    idempotencyRef.current = crypto.randomUUID();
    navigate(`/order/${orderId}`);
  }, [clearCart, navigate]);

  const createOrderWithPayment = async (
    sellerId: string,
    paymentMethod: PaymentMethod,
    paymentStatus: string,
  ) => {
    const { order, alreadyExists } = await createStorefrontOrder({
      shopId: cart.restaurantId!,
      sellerId,
      items: cart.items,
      fulfillmentType: mode,
      currency: cur,
      deliveryAddress: selectedLocation?.label,
      deliveryLat: selectedLocation?.lat,
      deliveryLng: selectedLocation?.lng,
      deliveryFee,
      notes: notes || undefined,
      paymentMethod,
      idempotencyKey: idempotencyRef.current,
    });

    if (!alreadyExists && paymentStatus !== "pending") {
      await updateOrderPaymentStatus(order.id, paymentStatus);
    }

    return { order, alreadyExists };
  };

  const placeOrder = async () => {
    const validationError = validateCheckout();
    if (validationError) {
      toast.error(validationError);
      if (validationError.includes("delivery address")) {
        setAddressOpen(true);
      }
      return;
    }

    if (placing) return;
    setPaymentError(null);

    if (payment === "card") {
      setStep("card_payment");
      return;
    }

    if (payment === "mobile_money" || payment === "crypto") {
      try {
        setPlacing(true);
        const sellerId = await resolveSellerId();
        const { order } = await createOrderWithPayment(sellerId, payment, "pending");
        setPendingOrderId(order.id);
        setStep(payment === "mobile_money" ? "mobile_money_payment" : "crypto_payment");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create order";
        toast.error(msg);
        logger.error("[Checkout] Failed to create pending order for " + payment, { error: msg });
      } finally {
        setPlacing(false);
      }
      return;
    }

    setPlacing(true);

    try {
      const sellerId = await resolveSellerId();

      if (payment === "wallet") {
        logger.info("[Checkout] Starting wallet payment", { amount: grandTotal, currency: cur });

        const transferResult = await executeWalletTransfer({
          senderUserId: user?.id ?? "",
          receiverUserId: sellerId,
          amount: grandTotal,
          currency: cur,
          description: `Order from ${cart.restaurantName}`,
          transactionType: "storefront_checkout",
          idempotencyKey: idempotencyRef.current,
        });

        if (!transferResult.success) {
          throw new Error(transferResult.error || "Wallet payment failed — please try again");
        }

        logger.info("[Checkout] Wallet payment succeeded", { transactionId: transferResult.transactionId });

        try {
          const { order, alreadyExists } = await createOrderWithPayment(sellerId, "wallet", "paid");
          completeCheckout(order.id, alreadyExists);
        } catch (orderErr) {
          logger.critical("[CHECKOUT_RECOVERY] Wallet transfer succeeded but order creation failed", {
            transactionId: transferResult.transactionId, amount: grandTotal, userId: user?.id ?? "",
          });
          throw new Error(
            "Payment processed but order creation failed. " +
            "Your funds are safe — please contact support with reference: " +
            transferResult.transactionId
          );
        }

      } else {
        logger.info("[Checkout] Placing cash (COD) order", { amount: grandTotal });
        const { order, alreadyExists } = await createOrderWithPayment(sellerId, "cash", "pending");
        completeCheckout(order.id, alreadyExists);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setPaymentError(msg);
      logger.error("[Checkout] Payment error", { error: msg, method: payment });
      toast.error(msg);
    } finally {
      setPlacing(false);
    }
  };

  const handlePaymentSuccessForMethod = async (paymentRef: string, method: PaymentMethod) => {
    setStep("processing");
    setPlacing(true);
    setPaymentError(null);

    const isStripeBacked = ["card", "apple_pay", "google_pay"].includes(method) ||
      (method === "card" && paymentRef.startsWith("pi_"));

    const maxRetries = 3;
    let lastError = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[Checkout] ${method} payment confirmed — creating order`, {
          paymentRef, attempt, amount: grandTotal, method,
        });
        const sellerId = await resolveSellerId();
        const { order, alreadyExists } = await createOrderWithPayment(sellerId, method, "paid");

        if (isStripeBacked && paymentRef.startsWith("pi_") && !alreadyExists) {
          await updateOrderPaymentStatus(order.id, "paid", {
            stripe_payment_intent_id: paymentRef,
          });
        }

        completeCheckout(order.id, alreadyExists);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Order creation failed";
        logger.error("[Checkout] Post-payment order creation attempt failed", {
          error: lastError, paymentRef, attempt, maxRetries, method,
        });
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    logger.critical("[CHECKOUT_RECOVERY] Payment captured but order creation failed after retries", {
      paymentRef, method, amount: grandTotal, currency: cur, userId: user?.id,
    });
    setPaymentError(
      "Your payment was processed but we had trouble creating the order. " +
      "Your funds are safe — please contact support with reference: " + paymentRef
    );
    toast.error("Order creation issue — your payment is safe. Please contact support.");
    setStep("review");
    setPlacing(false);
  };

  const handleCardPaymentSuccess = (paymentIntentId: string) =>
    handlePaymentSuccessForMethod(paymentIntentId, "card");

  const handleWebhookPaymentSuccess = async (paymentRef: string, method: PaymentMethod) => {
    setStep("processing");
    setPlacing(true);

    if (pendingOrderId) {
      logger.info(`[Checkout] ${method} payment polling indicates success — navigating to order (webhook is authoritative)`, {
        orderId: pendingOrderId, paymentRef, method,
      });
      completeCheckout(pendingOrderId, false);
    } else {
      logger.error(`[Checkout] ${method} payment succeeded but no pending order ID`, { paymentRef, method });
      toast.error("Payment confirmed but order reference was lost. Please contact support.");
      setStep("review");
      setPlacing(false);
    }
  };

  const handleCardPaymentError = (error: string) => {
    setPaymentError(error);
    logger.error("[Checkout] Card payment failed", { error });
  };

  const paymentMethods: { key: PaymentMethod; label: string; icon: typeof Wallet; detail?: string }[] = [
    {
      key: "wallet",
      label: "Wallet",
      icon: Wallet,
      detail: primaryWallet ? `Balance: ${fmt(walletBalance)}` : "Not set up",
    },
    { key: "card", label: "Card", icon: CreditCard, detail: "Visa, Mastercard, Apple Pay, Google Pay" },
    { key: "mobile_money", label: "Mobile Money", icon: CreditCard, detail: "M-Pesa, Orange Money, Wave" },
    { key: "crypto", label: "Crypto", icon: CreditCard, detail: "Bitcoin, Ethereum, USDC" },
    { key: "cash", label: "Cash on Delivery", icon: Banknote, detail: "Pay when delivered" },
  ];

  if (step === "mobile_money_payment") {
    return (
      <div className="app-mobile-page flex flex-col bg-background">
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => { setStep("review"); setPaymentError(null); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Mobile Money Payment</h1>
        </header>
        <div className="flex-1 px-4 pb-8 space-y-4">
          <div className="rounded-2xl p-4 bg-card border border-border/20">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total to pay</span>
              <span className="text-xl font-bold text-foreground">{fmt(grandTotal)}</span>
            </div>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
            <MobileMoneyPayment
              amount={grandTotal}
              currency={cur}
              orderId={pendingOrderId || undefined}
              onSuccess={(ref) => handleWebhookPaymentSuccess(ref, "mobile_money")}
              onError={handleCardPaymentError}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  if (step === "crypto_payment") {
    return (
      <div className="app-mobile-page flex flex-col bg-background">
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => { setStep("review"); setPaymentError(null); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Crypto Payment</h1>
        </header>
        <div className="flex-1 px-4 pb-8 space-y-4">
          <div className="rounded-2xl p-4 bg-card border border-border/20">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total to pay</span>
              <span className="text-xl font-bold text-foreground">{fmt(grandTotal)}</span>
            </div>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
            <CryptoPayment
              amount={grandTotal}
              currency={cur}
              orderId={pendingOrderId || undefined}
              description={`Order from ${cart.restaurantName}`}
              onSuccess={(ref) => handleWebhookPaymentSuccess(ref, "crypto")}
              onError={handleCardPaymentError}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  if (step === "card_payment") {
    return (
      <SubPageShell title="Secure Payment" onBack={() => { setStep("review"); setPaymentError(null); }} noContentPad>

        <div className="flex-1 px-4 pb-8 space-y-4">
          <div className="rounded-2xl p-4 bg-card border border-border/20">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span className="text-xs font-semibold text-green-400">Secure payment via Stripe</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total to pay</span>
              <span className="text-xl font-bold text-foreground">{fmt(grandTotal)}</span>
            </div>
          </div>

          {paymentError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{paymentError}</span>
            </div>
          )}

          <div className="rounded-2xl p-4 bg-card border border-border/20 mb-3">
            <Suspense fallback={null}>
              <AppleGooglePayButton
                amount={grandTotal}
                currency={cur}
                label={cart.restaurantName || "Easy-Locs"}
                onSuccess={handleCardPaymentSuccess}
                onError={handleCardPaymentError}
              />
            </Suspense>
          </div>

          <div className="rounded-2xl p-4 bg-card border border-border/20">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-3 text-muted-foreground">
              Enter card details
            </p>
            <Suspense
              fallback={
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading payment form...
                </div>
              }
            >
              <CardPayment
                amount={grandTotal}
                currency={cur}
                onSuccess={handleCardPaymentSuccess}
                onError={handleCardPaymentError}
              />
            </Suspense>
          </div>
        </div>
      </SubPageShell>
    );
  }

  if (step === "processing") {
    return (
      <SubPageShell noContentPad className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">Creating your order...</p>
        <p className="text-xs text-muted-foreground">Payment confirmed. Please wait.</p>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell title="Checkout" onBack={() => navigate(-1)} noContentPad>

      <div className="flex-1 overflow-y-auto px-4 pb-[var(--page-bottom-pad)] space-y-4">
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

        {/* Address (delivery only) */}
        {mode === "delivery" && (
          <>
            <button
              onClick={() => setAddressOpen(true)}
              className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform bg-card border"
              style={{
                borderColor: !selectedLocation
                  ? "hsl(var(--destructive) / 0.4)"
                  : "hsl(var(--border) / 0.2)",
              }}
            >
              <MapPin
                className="w-5 h-5 shrink-0"
                style={{ color: selectedLocation ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}
              />
              <div className="flex-1 text-left">
                <p className="text-[11px] text-muted-foreground font-medium">Deliver to</p>
                {selectedLocation ? (
                  <p className="text-sm font-semibold text-foreground line-clamp-1 break-words">{selectedLocation.label}</p>
                ) : (
                  <p className="text-sm font-semibold text-destructive">Select address (required)</p>
                )}
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
                  <p className="text-sm font-semibold text-foreground line-clamp-1 break-words">{item.name}</p>
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
                    className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform bg-primary/10"
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
                <pm.icon
                  className="w-5 h-5"
                  style={{ color: payment === pm.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                />
                <div className="flex-1 text-left">
                  <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                  {pm.detail && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{pm.detail}</p>
                  )}
                </div>
                {pm.key === "wallet" && walletInsufficient && (
                  <span className="text-[10px] font-semibold text-destructive">Insufficient</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Payment error */}
        {paymentError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-xl px-3 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{paymentError}</span>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed left-0 right-0 px-4 pt-3 z-40 bg-background border-t border-border/10" style={{ bottom: 0, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
        <Button
          data-submit-order
          data-primary-cta
          onClick={placeOrder}
          disabled={placing || walletInsufficient}
          className="w-full rounded-2xl h-[3.25rem] text-sm font-bold"
        >
          {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {payment === "card"
            ? `Continue to Payment · ${fmt(grandTotal)}`
            : payment === "wallet"
              ? `Pay with Wallet · ${fmt(grandTotal)}`
              : payment === "mobile_money"
                ? `Pay with Mobile Money · ${fmt(grandTotal)}`
                : payment === "crypto"
                  ? `Pay with Crypto · ${fmt(grandTotal)}`
                  : `Place Order (COD) · ${fmt(grandTotal)}`
          }
        </Button>
      </div>
    </SubPageShell>
  );
}
