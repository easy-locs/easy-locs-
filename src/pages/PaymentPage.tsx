import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import PaymentMethodSelector from "@/components/payments/PaymentMethodSelector";
import { createPaymentIntent, markPaymentIntentPaid } from "@/lib/payments/payment-intents";
import { setOrderStatusWithEvents } from "@/lib/orders/order-status-bridge";
import { rewardOrderLoyalty } from "@/lib/loyalty/loyalty-core";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    (supabase as any)
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle()
      .then(({ data }: any) => setOrder(data));
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    createPaymentIntent({
      workspaceId: order.workspace_id ?? undefined,
      orderId: order.id,
      amount: Number(order.total_amount ?? 0),
      currency: order.currency ?? "AED",
    }).then(setPaymentIntent);
  }, [order?.id]);

  const handlePay = async (method: string) => {
    if (!paymentIntent || !order) return;
    await markPaymentIntentPaid(paymentIntent.id, method);
    await setOrderStatusWithEvents({ orderId: order.id, status: "paid", actorType: "customer" });
    if (method !== "cash") {
      await rewardOrderLoyalty({
        workspaceId: order.workspace_id ?? undefined,
        orderId: order.id,
        totalAmount: Number(order.total_amount ?? 0),
      });
    }
    setPaid(true);
  };

  return (
    <div className="app-mobile-page bg-background p-4 space-y-6 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Payment</h1>
        <p className="text-sm text-muted-foreground">
          Amount: {order?.total_amount ?? 0} {order?.currency ?? ""}
        </p>
      </div>

      {paid ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">✓ Payment confirmed</p>
        </div>
      ) : (
        <PaymentMethodSelector
          amount={Number(order?.total_amount ?? 0)}
          currency={order?.currency ?? "AED"}
          orderId={orderId}
          onWalletSelect={(walletId) => handlePay(`wallet:${walletId}`)}
          onCashSelect={() => handlePay("cash")}
          onCardSelect={() => handlePay("card")}
        />
      )}
    </div>
  );
}
