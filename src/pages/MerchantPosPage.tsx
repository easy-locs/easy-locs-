import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Minus, Plus, ShoppingCart, Trash2, Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authorizeWalletPayment, captureWalletPayment, prepareOrderSplit, getOrCreateWalletAccount, calculateCommission } from "@/lib/wallet/wallet-engine";
import { formatPrice, getCurrencyFromCountry } from "@/lib/currency";

interface MenuItem {
  id: string;
  name: string;
  name_ar?: string;
  price: number | null;
  category?: string;
  photo_url?: string;
}

interface CartItem extends MenuItem {
  qty: number;
}

type OrderType = "dine_in" | "takeaway" | "delivery";
type PaymentStep = "idle" | "pin_entry" | "authorizing" | "authorized" | "error";

export default function MerchantPosPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const merchantProfileId = params.get("id");
  const countryCode = params.get("country") || "AE";
  const currency = getCurrencyFromCountry(countryCode);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [submitting, setSubmitting] = useState(false);

  const [paymentStep, setPaymentStep] = useState<PaymentStep>("idle");
  const [customerWalletId, setCustomerWalletId] = useState("");
  const [walletPin, setWalletPin] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!merchantProfileId) return;
    (supabase as any)
      .from("menu_items")
      .select("*")
      .eq("merchant_profile_id", merchantProfileId)
      .order("sort_order", { ascending: true })
      .then(({ data }: any) => setItems(data ?? []));
  }, [merchantProfileId]);

  useEffect(() => {
    if (!merchantProfileId) return;
    const channel = supabase
      .channel("pos-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async (payload: any) => {
        if (payload.new?.merchant_profile_id === merchantProfileId) {
          loadRecentOrders();
        }
      })
      .subscribe();

    loadRecentOrders();
    return () => { removeRealtimeChannel(channel); };
  }, [merchantProfileId]);

  const loadRecentOrders = async () => {
    if (!merchantProfileId) return;
    const { data } = await (supabase as any)
      .from("orders")
      .select("id, status, payment_status, wallet_status, total_amount, currency, created_at")
      .eq("merchant_profile_id", merchantProfileId)
      .order("created_at", { ascending: false })
      .limit(10);
    setRecentOrders(data ?? []);
  };

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category || "Other"));
    return ["All", ...Array.from(cats)];
  }, [items]);

  const filtered = activeCategory === "All" ? items : items.filter(i => (i.category || "Other") === activeCategory);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const total = cart.reduce((s, c) => s + (c.price ?? 0) * c.qty, 0);

  const createOrderDraft = async () => {
    if (!user?.id || !merchantProfileId || cart.length === 0) return;
    setSubmitting(true);
    setPaymentError("");

    try {
      const { data: order, error: oErr } = await (supabase as any)
        .from("orders")
        .insert({
          customer_user_id: user.id,
          merchant_profile_id: merchantProfileId,
          order_type: "food_delivery",
          service_mode: orderType === "delivery" ? "delivery" : "pickup",
          status: "pending",
          subtotal: total,
          total_amount: total,
          currency,
          order_mode: orderType === "dine_in" ? "onsite_qr" : orderType === "takeaway" ? "takeaway" : "delivery_food",
          payment_mode: "wallet_internal",
          payment_status: "pending",
          wallet_status: "not_captured",
          gross_amount: total,
          notes,
        })
        .select("id")
        .single();

      if (oErr) throw oErr;

      await (supabase as any).from("pos_orders").insert({
        order_id: order.id,
        source_type: "pos",
        order_type: orderType,
        table_number: tableNumber || null,
        notes: notes || null,
        kitchen_status: "new",
      });

      const orderItems = cart.map(c => ({
        order_id: order.id,
        menu_item_id: c.id,
        item_name: c.name,
        quantity: c.qty,
        unit_price: c.price ?? 0,
        total_price: (c.price ?? 0) * c.qty,
      }));
      await (supabase as any).from("order_items").insert(orderItems);

      const merchantWallet = await getOrCreateWalletAccount({ ownerType: "merchant", ownerProfileId: merchantProfileId, countryCode });
      const platformWallet = await getOrCreateWalletAccount({ ownerType: "platform", countryCode });
      const commission = await calculateCommission({ vertical: "food", countryCode, grossAmount: total });

      await prepareOrderSplit({
        orderId: order.id,
        grossAmount: total,
        deliveryFee: 0,
        commissionAmount: commission.finalCommissionAmount,
        merchantWalletId: merchantWallet.id,
        platformWalletId: platformWallet.id,
        isSelfDelivery: orderType !== "delivery",
        currency,
      });

      setPendingOrderId(order.id);
      setPaymentStep("pin_entry");
    } catch (e: any) {
      toast.error(e.message || "Failed to create order");
      setPaymentStep("idle");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinSubmit = async () => {
    if (!pendingOrderId || !customerWalletId || walletPin.length !== 6) return;
    setPaymentStep("authorizing");
    setPaymentError("");

    try {
      await authorizeWalletPayment({
        orderId: pendingOrderId,
        customerWalletId,
        amount: total,
        pin: walletPin,
        currency,
      });

      await captureWalletPayment({ orderId: pendingOrderId });

      setPaymentStep("authorized");
      toast.success("Payment authorized & captured!", { description: `Order #${pendingOrderId.slice(0, 8)}` });

      setTimeout(() => {
        setCart([]);
        setNotes("");
        setTableNumber("");
        setWalletPin("");
        setCustomerWalletId("");
        setPendingOrderId(null);
        setPaymentStep("idle");
      }, 2000);
    } catch (e: any) {
      setPaymentError(e.message || "Payment failed");
      setPaymentStep("pin_entry");
    }
  };

  const cancelPayment = () => {
    setPaymentStep("idle");
    setWalletPin("");
    setPaymentError("");
  };

  const walletStatusColor = (s: string) => {
    switch (s) {
      case "authorized": case "captured": return "text-amber-400";
      case "settled": return "text-green-400";
      case "reversed": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="app-mobile-page bg-[hsl(220,30%,6%)] text-foreground flex flex-col lg:flex-row">
      {/* Left: Menu */}
      <div className="flex-1 flex flex-col p-3 lg:p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-xl font-bold text-white">POS Terminal</h1>
          <Badge variant="outline" className="text-xs">{currency}</Badge>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="flex flex-col items-start rounded-xl bg-card border border-border p-3 hover:border-primary/40 transition-all text-left"
            >
              {item.photo_url && <img src={item.photo_url} alt={item.name} className="w-full h-20 object-cover rounded-lg mb-2" />}
              <span className="text-sm font-semibold text-card-foreground line-clamp-2">{item.name}</span>
              {item.price != null && <span className="text-xs text-primary mt-1">{formatPrice(item.price, currency)}</span>}
            </button>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No menu items found</p>}
        </div>

        {recentOrders.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">Recent Orders</h3>
            <div className="flex gap-2 overflow-x-auto">
              {recentOrders.slice(0, 6).map(o => (
                <div key={o.id} className="flex-shrink-0 bg-card rounded-lg px-3 py-2 text-xs">
                  <span className="text-card-foreground font-mono">#{o.id.slice(0, 6)}</span>
                  <span className={`ml-2 font-semibold ${walletStatusColor(o.wallet_status)}`}>{o.wallet_status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Cart + Payment */}
      <div className="w-full lg:w-96 bg-card border-l border-border flex flex-col p-4">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-card-foreground">Cart</h2>
          <Badge variant="outline" className="ml-auto text-xs">{cart.length} items</Badge>
        </div>

        <div className="flex gap-2 mb-4">
          {(["dine_in", "takeaway", "delivery"] as OrderType[]).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                orderType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t === "dine_in" ? "Dine In" : t === "takeaway" ? "Takeaway" : "Delivery"}
            </button>
          ))}
        </div>

        {orderType === "dine_in" && (
          <Input placeholder="Table #" value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="mb-3" />
        )}

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {cart.map(c => (
            <div key={c.id} className="flex items-center gap-3 bg-muted rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{formatPrice((c.price ?? 0) * c.qty, currency)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(c.id, -1)} className="w-7 h-7 rounded-full bg-background flex items-center justify-center text-foreground"><Minus className="w-3 h-3" /></button>
                <span className="w-6 text-center text-sm text-foreground">{c.qty}</span>
                <button onClick={() => updateQty(c.id, 1)} className="w-7 h-7 rounded-full bg-background flex items-center justify-center text-foreground"><Plus className="w-3 h-3" /></button>
                <button onClick={() => updateQty(c.id, -c.qty)} className="w-7 h-7 rounded-full bg-destructive/20 flex items-center justify-center text-destructive ml-1"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Cart is empty</p>}
        </div>

        <Input placeholder="Order notes..." value={notes} onChange={e => setNotes(e.target.value)} className="mb-3" />

        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-primary">{formatPrice(total, currency)}</span>
          </div>

          {paymentStep === "idle" && (
            <Button onClick={createOrderDraft} disabled={cart.length === 0 || submitting} className="w-full h-14 text-base font-bold">
              {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Lock className="w-5 h-5 mr-2" />}
              {submitting ? "Preparing..." : "Pay with Wallet"}
            </Button>
          )}

          {paymentStep === "pin_entry" && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-muted rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" /> Enter Wallet PIN
                </p>
                <Input placeholder="Customer Wallet ID" value={customerWalletId} onChange={e => setCustomerWalletId(e.target.value)} className="text-sm" />
                <Input type="password" placeholder="6-digit PIN" maxLength={6} value={walletPin}
                  onChange={e => setWalletPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.5em] font-mono" />
                {paymentError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {paymentError}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={cancelPayment} className="flex-1">Cancel</Button>
                <Button onClick={handlePinSubmit} disabled={walletPin.length !== 6 || !customerWalletId} className="flex-1 font-bold">
                  Authorize & Pay
                </Button>
              </div>
            </div>
          )}

          {paymentStep === "authorizing" && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-foreground font-semibold">Processing payment...</span>
            </div>
          )}

          {paymentStep === "authorized" && (
            <div className="flex items-center justify-center gap-3 py-6 text-green-400">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold">Payment confirmed — Sent to kitchen</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
