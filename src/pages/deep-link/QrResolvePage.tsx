/**
 * /qr/resolve — QR code resolver.
 * Reads encoded payload from ?data= and redirects to the right deep-link.
 */
import { useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { decodeQrPayload } from "@/payments/payment-request-hooks";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SEOHead from "@/components/SEOHead";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QrResolvePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("data") || "";
  const payload = useMemo(() => decodeQrPayload(raw), [raw]);

  useEffect(() => {
    if (!payload) return;
    if (payload.type === "profile") {
      navigate(`/u/${payload.userId}`, { replace: true });
    } else if (payload.type === "shop") {
      navigate(`/s/${payload.shopSlug}`, { replace: true });
    } else if (payload.type === "payment_request") {
      navigate(`/pay/request/${payload.requestId}`, { replace: true });
    } else if (payload.type === "shop_pay") {
      navigate(`/s/${payload.shopSlug}`, { replace: true });
    }
  }, [payload, navigate]);

  if (!payload) {
    return (
      <>
        <SEOHead title="QR — Easy Locs" description="Scan QR codes" />
        <div className="min-h-screen bg-background">
          <MobilePageHeader title="QR Code" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
              <QrCode className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold text-foreground">Invalid QR code</p>
            <p className="text-sm text-muted-foreground">This QR code could not be read.</p>
            <Link to="/discover">
              <Button variant="outline" size="sm">Back</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  // user_pay — show pay button inline
  if (payload.type === "user_pay") {
    return (
      <>
        <SEOHead title="Pay — Easy Locs" description="QR payment" />
        <div className="min-h-screen bg-background">
          <MobilePageHeader title="Pay" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-8 pb-24 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">QR Payment</p>
              {payload.amount && (
                <p className="text-3xl font-bold text-foreground">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: payload.currency || "AED" }).format(payload.amount)}
                </p>
              )}
            </div>
            <UnifiedPayButton
              amount={payload.amount || 0}
              currency={payload.currency || "AED"}
              title="QR Payment"
              recipientId={payload.userId}
              contextType="generic"
              contextId={payload.userId}
              className="w-full h-12 rounded-2xl bg-primary text-base font-semibold text-primary-foreground flex items-center justify-center transition hover:opacity-90"
            >
              Pay now
            </UnifiedPayButton>
          </div>
        </div>
      </>
    );
  }

  return null;
}
