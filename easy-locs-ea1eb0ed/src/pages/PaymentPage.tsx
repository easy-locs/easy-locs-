import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SubPageShell from "@/components/layout/SubPageShell";
import PaymentMethodSelector from "@/components/payments/PaymentMethodSelector";
import { createPaymentIntent, markPaymentIntentPaid } from "@/lib/payments/payment-intents";
import { setOrderStatusWithEvents } from "@/lib/orders/order-status-bridge";
import { rewardOrderLoyalty } from "@/lib/loyalty/loyalty-core";
import { customerService } from "@/services";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function PaymentPage() {
  useUiEngine("paymentpage");
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    customerService.fetchOrderById(orderId).then((data: any) => setOrder(data));
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
    <SubPageShell title="Payment" onBack={() => navigate(-1)}>
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
    </SubPageShell>
  );
}
