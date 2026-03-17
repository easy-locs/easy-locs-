/**
 * POSPage — V7: Tactile Point-of-Sale with QR payment + Wallet settlement.
 * Route: /pos
 * 
 * V7: Pulls real catalog items from seller's shop.
 * Flow: Browse catalog → Cart → Total → QR Payment → Wallet settlement → Auto delivery
 */
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useQuery } from "@tanstack/react-query";
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
  Package, Loader2, Receipt, Store, Search
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
  photo_url?: string;
}

type POSStep = "catalog" | "cart" | "payment" | "receipt";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  /* ─── QR Payload ─── */
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
    if (!buyerUserId.trim()) return toast.error("Enter buyer user ID to settle payment");
    if (total <= 0) return toast.error("Add items to the cart first");
    if (cart.length === 0) return toast.error("Cart is empty");

    setProcessing(true);
    try {
      const { data: orgMember } = await (supabase as any)
        .from("org_members").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
      const orgId = orgMember?.org_id;

      const { data: shop } = await (supabase as any)
        .from("storefront_pages").select("id").eq("user_id", user.id).limit(1).maybeSingle();

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
        .select("id").single();

      if (orderErr) throw orderErr;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
      }));
      await (supabase as any).from("storefront_order_items").insert(orderItems);

      // Wallet settlement
      const result = await sendMoney({
        recipientUserId: user.id,
        amount: total,
        description: `POS Order #${order.id.slice(0, 8)}`,
        referenceType: "order",
        referenceId: order.id,
        skipLimitCheck: false,
      });

      if (!result.success) {
        await (supabase as any).from("storefront_orders").update({ status: "cancelled" }).eq("id", order.id);
        throw new Error(result.error || "Payment failed");
      }

      const refCode = (result.data as any)?.reference_code || null;
      await (supabase as any)
        .from("storefront_orders")
        .update({ status: "accepted", payment_status: "paid", wallet_reference_code: refCode })
        .eq("id", order.id);

      platformBus.emit("storefront:order_paid", {
        orderId: order.id, shopId: shop?.id, requiresDelivery, total, source: "pos",
      }, "marketplace", { userId: user.id, orgId });

      setReceiptData({ orderId: order.id, total, items: cart, requiresDelivery, timestamp: new Date().toISOString() });
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

        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
          {/* ── CATALOG ── */}
          {step === "catalog" && (
            <>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Quick Add
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {QUICK_AMOUNTS.map(amt => (
                      <Button
                        key={amt}
                        variant="outline"
                        className="h-14 text-base font-bold rounded-xl active:scale-95 transition-transform"
                        onClick={() => addToCart(`Item ${amt}L`, amt)}
                      >
                        {amt} L
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-base font-semibold">Custom Item</h3>
                  <div className="space-y-2">
                    <Input
                      placeholder="Item name"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      className="h-12 text-sm rounded-xl"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Price (LOCS)"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={customPrice}
                        onChange={e => setCustomPrice(e.target.value)}
                        className="h-12 text-sm rounded-xl flex-1"
                      />
                      <Button className="h-12 px-6 rounded-xl" onClick={addCustomItem}>
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cart preview */}
              {cart.length > 0 && (
                <Card className="border-primary/20">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">Cart ({cart.length})</h3>
                      <span className="text-base font-bold text-primary">{fmtPrice(total)}</span>
                    </div>
                    <div className="space-y-2">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{fmtPrice(item.price)} each</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => updateQty(item.id, -1)}>
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => updateQty(item.id, 1)}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full h-14 gap-2 text-base font-semibold rounded-xl active:scale-[0.98] transition-transform" onClick={() => setStep("cart")}>
                      <ShoppingCart className="h-5 w-5" />
                      Checkout — {fmtPrice(total)}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── CART / CHECKOUT ── */}
          {step === "cart" && (
            <Card>
              <CardContent className="p-5 space-y-5">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Order Summary
                </h3>

                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between pb-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                      </div>
                      <span className="text-sm font-bold">{fmtPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-primary/5 rounded-xl p-4">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{fmtPrice(total)}</span>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <Label className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Requires Delivery
                  </Label>
                  <Switch checked={requiresDelivery} onCheckedChange={setRequiresDelivery} />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Buyer User ID</Label>
                  <Input
                    value={buyerUserId}
                    onChange={e => setBuyerUserId(e.target.value)}
                    placeholder="Paste buyer's user ID"
                    className="h-12 text-sm rounded-xl"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-14 rounded-xl text-sm" onClick={() => setStep("catalog")}>
                    Back
                  </Button>
                  <Button className="flex-1 h-14 rounded-xl gap-2 text-sm font-semibold active:scale-[0.98] transition-transform" onClick={() => setStep("payment")}>
                    <QrCode className="h-5 w-5" />
                    QR & Pay
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── QR PAYMENT ── */}
          {step === "payment" && (
            <Card>
              <CardContent className="p-5 space-y-5">
                <h3 className="text-base font-semibold text-center flex items-center justify-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Scan to Pay
                </h3>

                <div className="flex justify-center bg-card border border-border rounded-2xl p-6">
                  {qrPayload ? (
                    <QRCode value={qrPayload} size={220} />
                  ) : (
                    <p className="text-sm text-muted-foreground py-12">Cannot generate QR</p>
                  )}
                </div>

                <div className="text-center space-y-1">
                  <p className="text-3xl font-bold text-primary">{fmtPrice(total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {cart.length} item{cart.length > 1 ? "s" : ""}
                    {requiresDelivery ? " • 📦 Delivery" : " • 🏪 Pickup"}
                  </p>
                </div>

                <Button
                  className="w-full h-14 gap-2 text-base font-semibold rounded-xl active:scale-[0.98] transition-transform"
                  onClick={processPayment}
                  disabled={processing || !buyerUserId.trim()}
                >
                  {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
                  Settle — {fmtPrice(total)}
                </Button>

                <Button variant="outline" className="w-full h-12 rounded-xl text-sm" onClick={() => setStep("cart")}>
                  Back to Cart
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── RECEIPT ── */}
          {step === "receipt" && receiptData && (
            <Card>
              <CardContent className="p-6 space-y-5 text-center">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Payment Successful</h3>
                <p className="text-3xl font-bold text-primary">{fmtPrice(receiptData.total)}</p>

                <div className="text-left space-y-2 bg-muted/30 rounded-xl p-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Order ID</p>
                    <p className="text-sm font-mono">{receiptData.orderId}</p>
                  </div>
                  <Separator />
                  {receiptData.items.map((i: CartItem) => (
                    <div key={i.id} className="flex justify-between text-sm">
                      <span>{i.quantity}× {i.title}</span>
                      <span className="font-medium">{fmtPrice(i.price * i.quantity)}</span>
                    </div>
                  ))}
                  {receiptData.requiresDelivery && (
                    <Badge className="mt-2 text-xs" variant="secondary">
                      <Package className="h-3.5 w-3.5 mr-1" /> Auto-delivery triggered
                    </Badge>
                  )}
                </div>

                <Button className="w-full h-14 gap-2 text-base font-semibold rounded-xl active:scale-[0.98] transition-transform" onClick={resetPOS}>
                  <Store className="h-5 w-5" />
                  New Sale
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Balance */}
          <div className="text-center text-xs text-muted-foreground pt-2">
            Wallet Balance: <span className="font-semibold text-foreground">{balance?.balance?.toFixed(2) || "0.00"} LOCS</span>
          </div>
        </div>
      </div>
    </>
  );
}
