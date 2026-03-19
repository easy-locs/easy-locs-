/**
 * Admin test page — simulates the full wallet commerce lifecycle.
 * Currency-aware: uses dynamic currency from country code.
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getOrCreateWalletAccount,
  setWalletPin,
  authorizeWalletPayment,
  captureWalletPayment,
  settleOrderPaymentV2,
  reverseOrderPayment,
  calculateCommission,
  calculateDeliveryPrice,
  prepareOrderSplit,
} from "@/lib/wallet/wallet-engine";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencyFromCountry, formatPrice } from "@/lib/currency";

export default function WalletCommerceTestPage() {
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [pin, setPin] = useState("123456");
  const [countryCode, setCountryCode] = useState("AE");
  const [running, setRunning] = useState(false);
  const [orderId, setOrderId] = useState("");

  const currency = getCurrencyFromCountry(countryCode);
  const append = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runDemo = async () => {
    if (!user?.id) { toast.error("Login required"); return; }
    setRunning(true);
    setLog([]);
    try {
      append(`Currency: ${currency} (${countryCode})`);

      append("Creating customer wallet...");
      const cw = await getOrCreateWalletAccount({ ownerType: "customer", ownerUserId: user.id, countryCode });
      append(`Customer wallet: ${cw.id} (${cw.currency})`);

      append("Creating merchant wallet...");
      const mw = await getOrCreateWalletAccount({ ownerType: "merchant", ownerProfileId: "demo-merchant", countryCode });
      append(`Merchant wallet: ${mw.id} (${mw.currency})`);

      append("Creating platform wallet...");
      const pw = await getOrCreateWalletAccount({ ownerType: "platform", countryCode });
      append(`Platform wallet: ${pw.id} (${pw.currency})`);

      append(`Setting wallet PIN (${pin})...`);
      await setWalletPin(cw.id, pin);
      append("PIN set ✓");

      append(`Seeding customer balance (500 ${currency})...`);
      await (supabase as any).from("wallet_accounts").update({ balance_cash: 500, balance: 500, available_balance: 500 }).eq("id", cw.id);
      append("Balance seeded ✓");

      append(`Calculating commission (food, ${countryCode})...`);
      const commission = await calculateCommission({ vertical: "food", countryCode, grossAmount: 75 });
      append(`Commission: ${formatPrice(commission.finalCommissionAmount, currency)} (${(commission.commissionRate * 100).toFixed(1)}%)`);

      append("Calculating delivery (5km)...");
      const delivery = await calculateDeliveryPrice({ countryCode, distanceKm: 5 });
      append(`Delivery fee: ${formatPrice(delivery.deliveryFee, delivery.currency)}`);

      append("Creating demo order...");
      const { data: order, error: oErr } = await (supabase as any)
        .from("orders")
        .insert({
          customer_user_id: user.id,
          order_type: "food_delivery",
          service_mode: "delivery",
          status: "pending",
          subtotal: 75,
          total_amount: 75 + delivery.deliveryFee,
          currency,
          order_mode: "onsite_qr",
          payment_mode: "wallet_internal",
          payment_status: "pending",
          wallet_status: "not_captured",
          gross_amount: 75 + delivery.deliveryFee,
          customer_wallet_id: cw.id,
          merchant_wallet_id: mw.id,
        })
        .select("id")
        .single();
      if (oErr) throw oErr;
      setOrderId(order.id);
      append(`Order created: ${order.id.slice(0, 8)}`);

      append("Preparing order split...");
      const split = await prepareOrderSplit({
        orderId: order.id,
        grossAmount: 75 + delivery.deliveryFee,
        deliveryFee: delivery.deliveryFee,
        commissionAmount: commission.finalCommissionAmount,
        merchantWalletId: mw.id,
        platformWalletId: pw.id,
        currency,
      });
      append(`Split: merchant=${formatPrice(split.merchantAmount, currency)}, platform=${formatPrice(split.platformAmount, currency)}`);

      append("Authorizing payment with PIN...");
      const auth = await authorizeWalletPayment({
        orderId: order.id,
        customerWalletId: cw.id,
        amount: 75 + delivery.deliveryFee,
        pin,
        currency,
      });
      append(`Payment authorized ✓`);

      append("Capturing payment (escrow)...");
      await captureWalletPayment({ orderId: order.id });
      append("Payment captured ✓");

      append("─── DEMO COMPLETE ─── Use buttons below to settle or reverse");
    } catch (e: any) {
      append(`ERROR: ${e.message}`);
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSettle = async () => {
    if (!orderId) return;
    try {
      append("Settling order...");
      await settleOrderPaymentV2({ orderId });
      append("Settlement complete ✓");
      toast.success("Settled!");
    } catch (e: any) { append(`ERROR: ${e.message}`); }
  };

  const handleReverse = async () => {
    if (!orderId) return;
    try {
      append("Reversing order...");
      await reverseOrderPayment({ orderId });
      append("Reversal complete ✓");
      toast.success("Reversed!");
    } catch (e: any) { append(`ERROR: ${e.message}`); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Wallet Commerce Test</h1>
      <p className="text-sm text-muted-foreground mb-6">End-to-end wallet payment lifecycle</p>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} className="w-24" />
        <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="AE">🇦🇪 AE</option>
          <option value="FR">🇫🇷 FR</option>
          <option value="MA">🇲🇦 MA</option>
          <option value="TH">🇹🇭 TH</option>
        </select>
        <span className="self-center text-sm text-muted-foreground">{currency}</span>
        <Button onClick={runDemo} disabled={running}>
          {running ? "Running..." : "Run Demo Flow"}
        </Button>
      </div>

      {orderId && (
        <div className="flex gap-3 mb-4">
          <Button onClick={handleSettle} variant="outline" className="border-green-600 text-green-400 hover:bg-green-900/30">Settle</Button>
          <Button onClick={handleReverse} variant="outline" className="border-red-600 text-red-400 hover:bg-red-900/30">Reverse</Button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4 font-mono text-xs space-y-1 max-h-[60vh] overflow-y-auto">
        {log.length === 0 && <p className="text-muted-foreground">Click "Run Demo Flow" to start...</p>}
        {log.map((l, i) => (
          <p key={i} className={l.includes("ERROR") ? "text-destructive" : l.includes("✓") ? "text-green-400" : "text-muted-foreground"}>{l}</p>
        ))}
      </div>
    </div>
  );
}
