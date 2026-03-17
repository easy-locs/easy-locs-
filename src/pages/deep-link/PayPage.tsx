/**
 * /pay/:paymentId — Public payment request deep-link.
 * No login required to view. Uses UnifiedPaymentSystem to pay.
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Send, Shield, ArrowLeft, QrCode } from "lucide-react";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";

export default function PayPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["public-payment", paymentId],
    queryFn: async () => {
      const { data: txn } = await (supabase as any)
        .from("wallet_transactions")
        .select("id, amount, currency, reference_type, reference_code, status, created_at, user_id, counterpart_user_id")
        .eq("id", paymentId)
        .maybeSingle();
      return txn;
    },
    enabled: !!paymentId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    );
  }

  const notFound = !data;
  const amount = data?.amount;
  const currency = data?.currency || "EUR";
  const formattedAmount = amount != null
    ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Math.abs(amount))
    : null;

  return (
    <>
      <SEOHead title="Payment — Easy Locs" description="Secure payment link" />
      <div className="min-h-screen bg-background">
        <MobilePageHeader title="Payment" backTo="/discover" />

        <div className="max-w-md mx-auto px-4 pt-8 pb-24 space-y-6">
          {notFound ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                <QrCode className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Payment not found</p>
                <p className="text-sm text-muted-foreground mt-1">This payment link may have expired or been completed.</p>
              </div>
              <Link to="/discover">
                <Button variant="outline" size="sm"><ArrowLeft className="h-3 w-3 mr-1" /> Back</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Amount card */}
              <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Payment request</p>
                {formattedAmount && (
                  <p className="text-3xl font-bold text-foreground">{formattedAmount}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Ref: {data.reference_code || paymentId?.slice(0, 8)}
                </p>
              </div>

              {/* Security badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Secured payment via Easy Locs Wallet</span>
              </div>

              {/* CTA */}
              {user ? (
                <UnifiedPayButton
                  amount={Math.abs(amount || 0)}
                  currency={currency}
                  title="Payment request"
                  subtitle={`Ref: ${data.reference_code || paymentId?.slice(0, 8)}`}
                  recipientId={data.user_id}
                  recipientName="Payment request"
                  contextType="generic"
                  contextId={paymentId}
                  className="w-full h-12 rounded-2xl bg-primary text-base font-semibold text-primary-foreground flex items-center justify-center gap-2 transition hover:opacity-90"
                >
                  <Send className="h-5 w-5" /> Pay {formattedAmount}
                </UnifiedPayButton>
              ) : (
                <Link to={`/login?redirect=/pay/${paymentId}`}>
                  <Button className="w-full h-12 text-base gap-2 font-semibold">
                    <Send className="h-5 w-5" /> Sign in to pay
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
