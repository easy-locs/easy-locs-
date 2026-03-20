import { AppPageShell } from "@/components/layout/AppPageShell";
import { QrPaymentPanel } from "@/components/payments/QrPaymentPanel";

export default function PaymentsPage() {
  return (
    <AppPageShell title="Payments">
      <QrPaymentPanel />
    </AppPageShell>
  );
}
