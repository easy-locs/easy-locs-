/**
 * AdvancedCheckout — Multi-step checkout: address → payment method → review → confirm.
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { MapPin, CreditCard, CheckCircle2, Plus, Loader2, ChevronRight, Wallet, Truck } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  item_id: string;
  title?: string;
  photo_url?: string;
  unit_price: number;
  quantity: number;
  variant_id?: string;
}

interface Props {
  shop: any;
  cartItems: CartItem[];
  total: number;
  discount?: number;
  couponNote?: string;
  currency: string;
  formatPrice: (n: number, c?: string) => string;
  onComplete: (orderId: string) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: "address", label: "Shipping", icon: MapPin },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: CheckCircle2 },
] as const;

type Step = typeof STEPS[number]["id"];

export default function AdvancedCheckout({ shop, cartItems, total, discount = 0, couponNote, currency, formatPrice, onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("address");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("locs");
  const [submitting, setSubmitting] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "Home", full_name: "", phone: "", address_line1: "", city: "", postal_code: "", country: "FR" });

  // Load saved addresses
  const { data: addresses = [], isLoading: loadingAddr } = useQuery({
    queryKey: ["my-addresses", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_addresses")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const def = addresses.find((a: any) => a.is_default) || addresses[0];
      setSelectedAddress(def.id);
    }
  }, [addresses, selectedAddress]);

  const saveAddress = async () => {
    if (!user || !newAddr.address_line1 || !newAddr.city) return;
    const { data } = await (supabase as any)
      .from("storefront_addresses")
      .insert({ ...newAddr, user_id: user.id, is_default: addresses.length === 0 })
      .select("id")
      .single();
    if (data) {
      setSelectedAddress(data.id);
      setShowNewAddress(false);
      setNewAddr({ label: "Home", full_name: "", phone: "", address_line1: "", city: "", postal_code: "", country: "FR" });
      qc.invalidateQueries({ queryKey: ["my-addresses"] });
      toast.success("Address saved");
    }
  };

  const placeOrder = async () => {
    if (!user) return;
    setSubmitting(true);
    const addr = addresses.find((a: any) => a.id === selectedAddress);
    
    const { data: order, error } = await (supabase as any)
      .from("storefront_orders")
      .insert({
        shop_id: shop.id,
        seller_id: shop.user_id,
        buyer_id: user.id,
        buyer_name: addr?.full_name || user.email?.split("@")[0] || "",
        buyer_email: user.email || "",
        subtotal: total + discount,
        total,
        currency,
        status: "pending",
        payment_method: paymentMethod,
        shipping_address_id: selectedAddress,
        shipping_name: addr?.full_name || "",
        shipping_phone: addr?.phone || "",
        shipping_address: addr ? `${addr.address_line1}, ${addr.city} ${addr.postal_code || ""}` : "",
        shipping_city: addr?.city || "",
        shipping_country: addr?.country || "",
        notes: couponNote || null,
      })
      .select("id")
      .single();

    if (error || !order) {
      toast.error("Failed to place order");
      setSubmitting(false);
      return;
    }

    // Create order items
    const items = cartItems.map(ci => ({
      order_id: order.id,
      item_id: ci.item_id,
      variant_id: ci.variant_id,
      title: ci.title || "Item",
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      total_price: ci.unit_price * ci.quantity,
    }));
    await (supabase as any).from("storefront_order_items").insert(items);

    setSubmitting(false);
    onComplete(order.id);
  };

  const finalTotal = Math.max(0, total);

  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="space-y-4 p-4">
      {/* Stepper */}
      <div className="flex items-center gap-1 justify-center mb-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === currentStepIdx;
          const done = i < currentStepIdx;
          return (
            <div key={s.id} className="flex items-center gap-1">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
                active ? "bg-primary/10 text-primary" : done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="h-3 w-3" />
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {/* Step: Address */}
      {step === "address" && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Shipping Address</h4>
          {loadingAddr ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <RadioGroup value={selectedAddress || ""} onValueChange={setSelectedAddress}>
              {addresses.map((addr: any) => (
                <label key={addr.id} className="flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/30 transition-colors">
                  <RadioGroupItem value={addr.id} className="mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold">{addr.label} {addr.is_default && <Badge variant="secondary" className="text-[8px] ml-1">Default</Badge>}</p>
                    <p className="text-[11px] text-muted-foreground">{addr.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{addr.address_line1}, {addr.city} {addr.postal_code}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}

          {showNewAddress ? (
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Label</Label><Input value={newAddr.label} onChange={e => setNewAddr(p => ({ ...p, label: e.target.value }))} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Full Name</Label><Input value={newAddr.full_name} onChange={e => setNewAddr(p => ({ ...p, full_name: e.target.value }))} className="h-7 text-xs" /></div>
                </div>
                <div><Label className="text-[10px]">Address</Label><Input value={newAddr.address_line1} onChange={e => setNewAddr(p => ({ ...p, address_line1: e.target.value }))} className="h-7 text-xs" /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">City</Label><Input value={newAddr.city} onChange={e => setNewAddr(p => ({ ...p, city: e.target.value }))} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Postal</Label><Input value={newAddr.postal_code} onChange={e => setNewAddr(p => ({ ...p, postal_code: e.target.value }))} className="h-7 text-xs" /></div>
                  <div><Label className="text-[10px]">Country</Label><Input value={newAddr.country} onChange={e => setNewAddr(p => ({ ...p, country: e.target.value }))} className="h-7 text-xs" /></div>
                </div>
                <div><Label className="text-[10px]">Phone</Label><Input value={newAddr.phone} onChange={e => setNewAddr(p => ({ ...p, phone: e.target.value }))} className="h-7 text-xs" /></div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={saveAddress}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewAddress(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={() => setShowNewAddress(true)}>
              <Plus className="h-3 w-3" /> Add New Address
            </Button>
          )}

          <Button className="w-full h-10" onClick={() => setStep("payment")} disabled={!selectedAddress}>
            Continue to Payment <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step: Payment */}
      {step === "payment" && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Payment Method</h4>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/30">
              <RadioGroupItem value="locs" />
              <Wallet className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-semibold">LOCS Wallet</p>
                <p className="text-[10px] text-muted-foreground">Pay with your LOCS balance — 0% fees</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/30">
              <RadioGroupItem value="card" />
              <CreditCard className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-semibold">Card Payment</p>
                <p className="text-[10px] text-muted-foreground">Pay via Stripe (secure checkout)</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/30">
              <RadioGroupItem value="cod" />
              <Truck className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs font-semibold">Cash on Delivery</p>
                <p className="text-[10px] text-muted-foreground">Pay when you receive</p>
              </div>
            </label>
          </RadioGroup>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setStep("address")}>Back</Button>
            <Button className="flex-1 h-10" onClick={() => setStep("review")}>
              Review Order <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Order Summary</h4>
          <Card>
            <CardContent className="p-3 space-y-2">
              {cartItems.map(ci => (
                <div key={ci.id} className="flex items-center gap-2">
                  {ci.photo_url && <img src={ci.photo_url} alt="" className="w-8 h-8 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{ci.title}</p>
                    <p className="text-[10px] text-muted-foreground">×{ci.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold">{formatPrice(ci.unit_price * ci.quantity, currency)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Address summary */}
          {(() => {
            const addr = addresses.find((a: any) => a.id === selectedAddress);
            return addr ? (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="text-xs font-semibold">Ship to: {addr.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{addr.full_name} · {addr.address_line1}, {addr.city}</p>
                </CardContent>
              </Card>
            ) : null;
          })()}

          {/* Payment method summary */}
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <CreditCard className="h-3 w-3 text-primary" />
              <span className="text-xs font-semibold">
                {paymentMethod === "locs" ? "LOCS Wallet" : paymentMethod === "card" ? "Card (Stripe)" : "Cash on Delivery"}
              </span>
            </CardContent>
          </Card>

          {/* Total */}
          <div className="border-t border-border pt-3 space-y-1">
            {discount > 0 && (
              <div className="flex justify-between text-xs text-primary">
                <span>Discount</span>
                <span>-{formatPrice(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-bold text-primary">{formatPrice(finalTotal, currency)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setStep("payment")}>Back</Button>
            <Button className="flex-1 h-12 font-semibold" onClick={placeOrder} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place Order"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
