import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Inbox, CheckCircle2 } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchClientPayments } from "@/repositories/client-portal.repository";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PaymentItem {
  id: string;
  type: "concierge" | "marketplace";
  title: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
}

const ClientPayments = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    const email = user.email;

    const fetch = async () => {
      const { concierge, marketplace } = await fetchClientPayments(email);

      const items: PaymentItem[] = [
        ...(concierge || []).map(b => ({
          id: b.id, type: "concierge" as const,
          title: `Concierge — ${b.service_date || "—"}`,
          date: b.created_at, amount: b.total_price, currency: b.currency,
          status: b.payment_status, paid: b.payment_status === "paid",
        })),
        ...(marketplace || []).map(b => ({
          id: b.id, type: "marketplace" as const,
          title: `Service — ${b.service_date || "—"}`,
          date: b.created_at, amount: b.total_price, currency: b.currency,
          status: b.payment_confirmed ? "paid" : "unpaid", paid: !!b.payment_confirmed,
        })),
      ];
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(items);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const fmtAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR", minimumFractionDigits: 0 }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.payments") || "Payments"}</h1>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />)}
          </div>
        ) : payments.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("client.payments_empty") || "No payments yet"}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("client.payments_empty_desc") || "Your payment history will appear here."}</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {payments.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${p.paid ? "bg-success/10" : "bg-warning/10"}`}>
                  {p.paid ? <CheckCircle2 className="h-5 w-5 text-success" /> : <CreditCard className="h-5 w-5 text-warning" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(p.date), "dd/MM/yyyy")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground tabular-nums">{fmtAmount(p.amount, p.currency)}</p>
                  <Badge variant={p.paid ? "default" : "outline"} className="text-[10px]">
                    {p.paid ? (t("client.status_paid") || "Paid") : (t("client.status_pending") || "Pending")}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientPayments;
