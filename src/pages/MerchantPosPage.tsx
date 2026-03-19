import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Minus, Plus, ShoppingCart, Trash2, Send, UtensilsCrossed, Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authorizeWalletPayment, captureWalletPayment, prepareOrderSplit, getOrCreateWalletAccount, calculateCommission } from "@/lib/wallet/wallet-engine";

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

  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [submitting, setSubmitting] = useState(false);

  // Wallet payment state
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("idle");
  const [customerWalletId, setCustomerWalletId] = useState("");
  const [walletPin, setWalletPin] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");

  // Recent paid orders
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

  // Subscribe to order status changes for real-time POS updates
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
    return () => { supabase.removeChannel(channel); };
  }, [merchantProfileId]);

  const loadRecentOrders = async () => {
    if (!merchantProfileId) return;
    const { data } = await (supabase as any)
      .from("orders")
      .select("id, status, payment_status, wallet_status, total_amount, created_at")
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

  // Step 1: Create order draft
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
          currency: "AED",
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

      // Prepare split
      const merchantWallet = await getOrCreateWalletAccount({ ownerType: "merchant", ownerProfileId: merchantProfileId });
      const platformWallet = await getOrCreateWalletAccount({ ownerType: "platform" });
      const commission = await calculateCommission({ vertical: "food", countryCode: "AE", grossAmount: total });

      await prepareOrderSplit({
        orderId: order.id,
        grossAmount: total,
        deliveryFee: 0,
        commissionAmount: commission.finalCommissionAmount,
        merchantWalletId: merchantWallet.id,
        platformWalletId: platformWallet.id,
        isSelfDelivery: orderType !== "delivery",
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

  // Step 2: Authorize with wallet PIN
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
      });

      // Capture immediately for POS
      await captureWalletPayment({ orderId: pendingOrderId });

      setPaymentStep("authorized");
      toast.success("Payment authorized & captured!", { description: `Order #${pendingOrderId.slice(0, 8)}` });

      // Reset
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
    // Order stays as pending — can be retried or cancelled
  };

  const walletStatusColor = (s: string) => {
    switch (s) {
      case "authorized": case "captured": return "text-amber-400";
      case "settled": return "text-green-400";
      case "reversed": return "text-red-400";
      default: return "text-[hsl(220,15%,50%)]";
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,30%,6%)] text-foreground flex flex-col lg:flex-row">
      {/* Left: Menu */}
      <div className="flex-1 flex flex-col p-3 lg:p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <UtensilsCrossed className="w-6 h-6 text-[hsl(45,80%,55%)]" />
          <h1 className="text-xl font-bold text-white">POS Terminal</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-[hsl(45,80%,55%)] text-[hsl(220,30%,6%)]"
                  : "bg-[hsl(220,20%,14%)] text-[hsl(220,15%,60%)] hover:bg-[hsl(220,20%,18%)]"
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
              className="flex flex-col items-start rounded-xl bg-[hsl(220,20%,12%)] border border-[hsl(220,20%,18%)] p-3 hover:border-[hsl(45,80%,55%)/0.4] transition-all text-left"
            >
              {item.photo_url && <img src={item.photo_url} alt={item.name} className="w-full h-20 object-cover rounded-lg mb-2" />}
              <span className="text-sm font-semibold text-white line-clamp-2">{item.name}</span>
              {item.price != null && <span className="text-xs text-[hsl(45,80%,55%)] mt-1">{item.price} AED</span>}
            </button>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center text-[hsl(220,15%,50%)] py-8">No menu items found</p>}
        </div>

        {/* Recent orders strip */}
        {recentOrders.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[hsl(220,20%,16%)]">
            <h3 className="text-xs font-semibold text-[hsl(220,15%,50%)] mb-2">Recent Orders</h3>
            <div className="flex gap-2 overflow-x-auto">
              {recentOrders.slice(0, 6).map(o => (
                <div key={o.id} className="flex-shrink-0 bg-[hsl(220,20%,12%)] rounded-lg px-3 py-2 text-xs">
                  <span className="text-white font-mono">#{o.id.slice(0, 6)}</span>
                  <span className={`ml-2 font-semibold ${walletStatusColor(o.wallet_status)}`}>{o.wallet_status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Cart + Payment */}
      <div className="w-full lg:w-96 bg-[hsl(220,20%,10%)] border-l border-[hsl(220,20%,16%)] flex flex-col p-4">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-[hsl(45,80%,55%)]" />
          <h2 className="text-lg font-bold text-white">Cart</h2>
          <Badge variant="outline" className="ml-auto text-xs">{cart.length} items</Badge>
        </div>

        <div className="flex gap-2 mb-4">
          {(["dine_in", "takeaway", "delivery"] as OrderType[]).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                orderType === t
                  ? "bg-[hsl(45,80%,55%)] text-[hsl(220,30%,6%)]"
                  : "bg-[hsl(220,20%,14%)] text-[hsl(220,15%,60%)]"
              }`}
            >
              {t === "dine_in" ? "Dine In" : t === "takeaway" ? "Takeaway" : "Delivery"}
            </button>
          ))}
        </div>

        {orderType === "dine_in" && (
          <Input placeholder="Table #" value={tableNumber} onChange={e => setTableNumber(e.target.value)}
            className="mb-3 bg-[hsl(220,20%,14%)] border-[hsl(220,20%,20%)] text-white" />
        )}

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {cart.map(c => (
            <div key={c.id} className="flex items-center gap-3 bg-[hsl(220,20%,14%)] rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
                <p className="text-xs text-[hsl(220,15%,50%)]">{(c.price ?? 0) * c.qty} AED</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(c.id, -1)} className="w-7 h-7 rounded-full bg-[hsl(220,20%,20%)] flex items-center justify-center text-white"><Minus className="w-3 h-3" /></button>
                <span className="w-6 text-center text-sm text-white">{c.qty}</span>
                <button onClick={() => updateQty(c.id, 1)} className="w-7 h-7 rounded-full bg-[hsl(220,20%,20%)] flex items-center justify-center text-white"><Plus className="w-3 h-3" /></button>
                <button onClick={() => updateQty(c.id, -c.qty)} className="w-7 h-7 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 ml-1"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p className="text-center text-[hsl(220,15%,40%)] py-8 text-sm">Cart is empty</p>}
        </div>

        <Input placeholder="Order notes..." value={notes} onChange={e => setNotes(e.target.value)}
          className="mb-3 bg-[hsl(220,20%,14%)] border-[hsl(220,20%,20%)] text-white" />

        {/* Payment Flow */}
        <div className="border-t border-[hsl(220,20%,18%)] pt-3 space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span className="text-white">Total</span>
            <span className="text-[hsl(45,80%,55%)]">{total.toFixed(2)} AED</span>
          </div>

          {paymentStep === "idle" && (
            <Button
              onClick={createOrderDraft}
              disabled={cart.length === 0 || submitting}
              className="w-full h-14 text-base font-bold bg-[hsl(45,80%,55%)] text-[hsl(220,30%,6%)] hover:bg-[hsl(45,80%,50%)]"
            >
              {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Lock className="w-5 h-5 mr-2" />}
              {submitting ? "Preparing..." : "Pay with Wallet"}
            </Button>
          )}

          {paymentStep === "pin_entry" && (
            <div className="space-y-3 animate-in fade-in">
              <div className="bg-[hsl(220,20%,14%)] rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[hsl(45,80%,55%)]" /> Enter Wallet PIN
                </p>
                <Input
                  placeholder="Customer Wallet ID"
                  value={customerWalletId}
                  onChange={e => setCustomerWalletId(e.target.value)}
                  className="bg-[hsl(220,20%,18%)] border-[hsl(220,20%,24%)] text-white text-sm"
                />
                <Input
                  type="password"
                  placeholder="6-digit PIN"
                  maxLength={6}
                  value={walletPin}
                  onChange={e => setWalletPin(e.target.value.replace(/\D/g, ""))}
                  className="bg-[hsl(220,20%,18%)] border-[hsl(220,20%,24%)] text-white text-center text-2xl tracking-[0.5em] font-mono"
                />
                {paymentError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {paymentError}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={cancelPayment} className="flex-1 border-[hsl(220,20%,25%)] text-white">Cancel</Button>
                <Button
                  onClick={handlePinSubmit}
                  disabled={walletPin.length !== 6 || !customerWalletId}
                  className="flex-1 bg-[hsl(45,80%,55%)] text-[hsl(220,30%,6%)] font-bold"
                >
                  Authorize & Pay
                </Button>
              </div>
            </div>
          )}

          {paymentStep === "authorizing" && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[hsl(45,80%,55%)]" />
              <span className="text-white font-semibold">Processing payment...</span>
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
