import { CreditCard } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useI18n } from "@/lib/i18n";

const ClientPayments = () => {
  const { t } = useI18n();

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.payments") || "Payments"}</h1>
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("client.payments_empty") || "No payments yet"}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("client.payments_empty_desc") || "Your payment history will appear here."}</p>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientPayments;
