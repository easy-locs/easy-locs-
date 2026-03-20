import { AppPageShell } from "@/components/layout/AppPageShell";
import { QrPaymentPanel } from "@/components/payments/QrPaymentPanel";
import { MerchantCheckoutPanel } from "@/components/merchant/MerchantCheckoutPanel";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { RefundPanel } from "@/components/payments/RefundPanel";
import { PayoutPanel } from "@/components/payments/PayoutPanel";
import { CheckoutDiscountPanel } from "@/components/payments/CheckoutDiscountPanel";
import { usePaymentStatusSync } from "@/hooks/usePaymentStatusSync";

export default function PaymentsPage() {
  usePaymentStatusSync();

  return (
    <AppPageShell title="Payments">
      <div className="space-y-4">
        <QrPaymentPanel />
        <MerchantCheckoutPanel />
        <NotificationsPanel />
        <RefundPanel />
        <CheckoutDiscountPanel originalAmount={0} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PayoutPanel />
        </div>
      </div>
    </AppPageShell>
  );
}
