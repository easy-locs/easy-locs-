import { AppPageShell } from "@/components/layout/AppPageShell";
import { QrPaymentPanel } from "@/components/payments/QrPaymentPanel";
import { MerchantCheckoutPanel } from "@/components/merchant/MerchantCheckoutPanel";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";

export default function PaymentsPage() {
  return (
    <AppPageShell title="Payments">
      <div className="space-y-4">
        <QrPaymentPanel />
        <MerchantCheckoutPanel />
        <NotificationsPanel />
      </div>
    </AppPageShell>
  );
}
