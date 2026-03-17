/**
 * /pay/request/:requestId — Public payment request page.
 * Shows request details + pay button using UnifiedPayButton.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";
import { markPaymentRequestPaid } from "@/payments/payment-request-hooks";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Send, Shield, ArrowLeft, Receipt, CheckCircle2 } from "lucide-react";
import { PaymentRequestQr } from "@/components/qr/UniversalQrWidgets";

function formatMoney(amount: number, currency = "AED") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function PayRequestPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["pay-request", requestId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!requestId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <>
        <SEOHead title="Payment Request — Easy Locs" description="Payment request" />
        <div className="min-h-screen bg-background">
          <MobilePageHeader title="Payment Request" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
            <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-lg font-semibold text-foreground">Request not found</p>
            <Link to="/discover"><Button variant="outline" size="sm"><ArrowLeft className="h-3 w-3 mr-1" /> Back</Button></Link>
          </div>
        </div>
      </>
    );
  }

  const isPaid = data.status === "paid";
  const amount = data.amount;
  const currency = data.currency || "AED";

  return (
    <>
      <SEOHead title="Payment Request — Easy Locs" description="Secure payment request" />
      <div className="min-h-screen bg-background">
        <MobilePageHeader title="Payment Request" backTo="/discover" />

        <div className="max-w-md mx-auto px-4 pt-8 pb-24 space-y-6">
          {/* Amount card */}
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Payment request</p>
            <p className="text-3xl font-bold text-foreground">{formatMoney(amount, currency)}</p>
            {data.title && <p className="text-sm font-medium text-foreground">{data.title}</p>}
            {data.subtitle && <p className="text-xs text-muted-foreground">{data.subtitle}</p>}
          </div>

          {/* Status */}
          {isPaid ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>This request has been paid</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Secured via Easy Locs Wallet</span>
              </div>

              {user ? (
                <UnifiedPayButton
                  amount={amount}
                  currency={currency}
                  title={data.title || "Payment request"}
                  subtitle={data.subtitle || undefined}
                  recipientId={data.requester_id || data.sender_id}
                  recipientName={data.title || "Payment request"}
                  contextType="order"
                  contextId={data.id}
                  className="w-full h-12 rounded-2xl bg-primary text-base font-semibold text-primary-foreground flex items-center justify-center gap-2 transition hover:opacity-90"
                  onSuccess={async (result) => {
                    if (result.transactionId) {
                      await markPaymentRequestPaid(data.id, result.transactionId);
                    }
                  }}
                >
                  <Send className="h-5 w-5" /> Pay {formatMoney(amount, currency)}
                </UnifiedPayButton>
              ) : (
                <GuestCheckoutButton requestId={data.id} amount={amount} currency={currency} />
              )}
            </>
          )}

          {/* Share as QR */}
          <PaymentRequestQr
            requestId={requestId!}
            title={data.title || "Payment request"}
            compact
          />
        </div>
      </div>
    </>
  );
}
