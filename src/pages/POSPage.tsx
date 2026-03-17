/**
 * POSPage — V5: Tactile Point-of-Sale with QR payment + Wallet settlement.
 * Route: /pos
 * 
 * Flow: Add items → Cart → Total → QR Payment → Wallet settlement → Auto delivery (if flagged)
 */
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import SEOHead from "@/components/SEOHead";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart, Plus, Minus, Trash2, QrCode, Wallet, Check,
  Package, Loader2, Receipt, Store
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";

/* ─── Types ─── */
interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

type POSStep = "catalog" | "cart" | "payment" | "receipt";

/* ─── Quick catalog (seller adds items on-the-fly) ─── */
const QUICK_AMOUNTS = [5, 10, 15, 20, 25, 50];

export default function POSPage() {
  const { user } = useAuth();
  const { balance, sendMoney } = useWallet();
  const [step, setStep] = useState<POSStep>("catalog");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [requiresDelivery, setRequiresDelivery] = useState(false);
  const [buyerUserId, setBuyerUserId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  const addToCart = useCallback((title: string, price: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.title === title && i.price === price);
      if (existing) return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: crypto.randomUUID(), title, price, quantity: 1 }];
    });
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const addCustomItem = () => {
    const price = parseFloat(customPrice);
    if (!customTitle.trim() || isNaN(price) || price <= 0) {
      toast.error("Enter a valid item name and price");
      return;
    }
    addToCart(customTitle.trim(), price);
    setCustomTitle("");
    setCustomPrice("");
  };

  /* ─── QR Payload for buyer to scan ─── */
  const qrPayload = useMemo(() => {
    if (total <= 0 || !user?.id) return "";
    return JSON.stringify({
      type: "pos_payment",
      seller_id: user.id,
      amount: total,
      currency: "LOCS",
      requires_delivery: requiresDelivery,
      items: cart.map(i => ({ t: i.title, p: i.price, q: i.quantity })),
      ts: Date.now(),
    });
  }, [total, user?.id, requiresDelivery, cart]);

  /* ─── Process wallet payment ─── */
  const processPayment = async () => {
    if (!user?.id) return toast.error("Sign in required");
    if (!buyerUserId.trim()) return toast.error("Enter buyer user ID");
    if (total <= 0) return toast.error("Cart is empty");

    setProcessing(true);
    try {
      // Create storefront order
      const { data: orgMember } = await (supabase as any)
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const orgId = orgMember?.org_id;

      // Get seller's shop
      const { data: shop } = await (supabase as any)
        .from("storefront_pages")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      // Create order
      const { data: order, error: orderErr } = await (supabase as any)
        .from("storefront_orders")
        .insert({
          shop_id: shop?.id || null,
          buyer_id: buyerUserId.trim(),
          buyer_name: "POS Customer",
          total,
          currency: "LOCS",
          status: "pending",
          payment_method: "wallet",
          requires_delivery: requiresDelivery,
          notes: `POS order — ${cart.length} items`,
        })
        .select("id")
        .single();

      if (orderErr) throw orderErr;

      // Insert order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      await (supabase as any).from("storefront_order_items").insert(orderItems);

      // Wallet settlement: buyer pays seller
      const result = await sendMoney({
        recipientUserId: user.id,
        amount: total,
        description: `POS Order #${order.id.slice(0, 8)}`,
        referenceType: "order",
        referenceId: order.id,
        skipLimitCheck: false,
      });

      if (!result.success) {
        // Rollback order
        await (supabase as any).from("storefront_orders").update({ status: "cancelled" }).eq("id", order.id);
        throw new Error(result.error || "Payment failed");
      }

      // Mark order as paid → triggers auto-delivery if requires_delivery
      const refCode = (result.data as any)?.reference_code || null;
      await (supabase as any)
        .from("storefront_orders")
        .update({
          status: "accepted",
          payment_status: "paid",
          wallet_reference_code: refCode,
        })
        .eq("id", order.id);

      // Emit bus event
      platformBus.emit("storefront:order_paid", {
        orderId: order.id,
        shopId: shop?.id,
        requiresDelivery,
        total,
        source: "pos",
      }, "marketplace", { userId: user.id, orgId });

      setReceiptData({
        orderId: order.id,
        total,
        items: cart,
        requiresDelivery,
        timestamp: new Date().toISOString(),
      });
      setStep("receipt");
      toast.success("Payment completed!");
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setStep("catalog");
    setReceiptData(null);
    setBuyerUserId("");
    setRequiresDelivery(false);
  };

  const fmtPrice = (n: number) => `${n.toFixed(2)} LOCS`;

  return (
    <>
      <SEOHead title="Point of Sale" description="Tactile POS with QR payment and wallet settlement." />
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader
          title="Point of Sale"
          icon={<Store className="h-5 w-5 text-primary" />}
          backTo="/dashboard"
        />

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* ── Step: Catalog ── */}
          {step === "catalog" && (
            <>
              {/* Quick amounts */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Quick Add
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {QUICK_AMOUNTS.map(amt => (
                      <Button
                        key={amt}
                        variant="outline"
                        className="h-12 text-sm font-bold"
                        onClick={() => addToCart(`Item ${amt} LOCS`, amt)}
                      >
                        {amt} LOCS
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom item */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Custom Item</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Item name"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      className="h-9 text-xs flex-1"
                    />
                    <Input
                      placeholder="Price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={customPrice}
                      onChange={e => setCustomPrice(e.target.value)}
                      className="h-9 text-xs w-24"
                    />
                    <Button size="sm" className="h-9" onClick={addCustomItem}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Cart preview */}
              {cart.length > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Cart ({cart.length})</h3>
                      <span className="text-sm font-bold text-primary">{fmtPrice(total)}</span>
                    </div>
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="flex-1 truncate">{item.title}</span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="w-16 text-right font-medium">{fmtPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <Separator />
                    <Button className="w-full h-10 gap-2" onClick={() => setStep("cart")}>
                      <ShoppingCart className="h-4 w-4" />
                      Proceed to Checkout — {fmtPrice(total)}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── Step: Cart / Checkout ── */}
          {step === "cart" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Order Summary
                </h3>

                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs border-b border-border pb-2">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">×{item.quantity}</p>
                    </div>
                    <span className="font-bold">{fmtPrice(item.price * item.quantity)}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-lg font-bold text-primary">{fmtPrice(total)}</span>
                </div>

                <Separator />

                {/* Delivery toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Requires Delivery
                  </Label>
                  <Switch checked={requiresDelivery} onCheckedChange={setRequiresDelivery} />
                </div>

                {/* Buyer ID */}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Buyer User ID</Label>
                  <Input
                    value={buyerUserId}
                    onChange={e => setBuyerUserId(e.target.value)}
                    placeholder="Paste buyer's user ID or scan QR"
                    className="h-9 text-xs mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-10" onClick={() => setStep("catalog")}>
                    Back
                  </Button>
                  <Button className="flex-1 h-10 gap-2" onClick={() => setStep("payment")}>
                    <QrCode className="h-4 w-4" />
                    Show QR & Pay
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step: QR Payment ── */}
          {step === "payment" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-center flex items-center justify-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  Scan to Pay
                </h3>

                <div className="flex justify-center bg-white rounded-xl p-4">
                  {qrPayload ? (
                    <QRCode value={qrPayload} size={200} />
                  ) : (
                    <p className="text-xs text-muted-foreground py-8">Cannot generate QR</p>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-primary">{fmtPrice(total)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {cart.length} item{cart.length > 1 ? "s" : ""} •
                    {requiresDelivery ? " 📦 Delivery included" : " 🏪 Pickup only"}
                  </p>
                </div>

                <Separator />

                {/* Manual wallet settlement */}
                <Button
                  className="w-full h-12 gap-2 text-sm"
                  onClick={processPayment}
                  disabled={processing || !buyerUserId.trim()}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  Settle with Wallet — {fmtPrice(total)}
                </Button>

                <Button variant="outline" className="w-full h-9 text-xs" onClick={() => setStep("cart")}>
                  Back to Cart
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Step: Receipt ── */}
          {step === "receipt" && receiptData && (
            <Card>
              <CardContent className="p-4 space-y-4 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Payment Successful</h3>
                <p className="text-2xl font-bold text-primary">{fmtPrice(receiptData.total)}</p>

                <div className="text-left space-y-1 bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">Order ID</p>
                  <p className="text-xs font-mono">{receiptData.orderId}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">Items</p>
                  {receiptData.items.map((i: CartItem) => (
                    <p key={i.id} className="text-xs">{i.quantity}× {i.title} — {fmtPrice(i.price * i.quantity)}</p>
                  ))}
                  {receiptData.requiresDelivery && (
                    <Badge className="mt-2 text-[9px]" variant="secondary">
                      <Package className="h-3 w-3 mr-1" /> Auto-delivery triggered
                    </Badge>
                  )}
                </div>

                <Button className="w-full h-10 gap-2" onClick={resetPOS}>
                  <Store className="h-4 w-4" />
                  New Sale
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Balance display */}
          <div className="text-center text-[10px] text-muted-foreground">
            Wallet: <span className="font-semibold text-foreground">{balance?.balance?.toFixed(2) || "0.00"} LOCS</span>
          </div>
        </div>
      </div>
    </>
  );
}
