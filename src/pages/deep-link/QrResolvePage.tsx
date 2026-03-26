/**
 * /qr/resolve — Universal QR code resolver.
 * Reads encoded payload from ?data=, decodes via unified QR engine,
 * and redirects to the correct deep-link or shows inline payment.
 */
import { useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { decodeQr, resolveRoute, isExpired, isSecurityAction, type UniversalQrPayload } from "@/lib/qr-engine";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SEOHead from "@/components/SEOHead";
import { QrCode, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QrResolvePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("data") || "";
  const payload = useMemo(() => decodeQr(raw), [raw]);

  useEffect(() => {
    if (!payload) return;

    // Security payloads with expiry
    if (isExpired(payload)) return;

    const route = resolveRoute(payload);
    if (route) {
      navigate(route, { replace: true });
    }
  }, [payload, navigate]);

  // Invalid / unrecognised
  if (!payload) {
    return (
      <>
        <SEOHead title="QR — Easy Locs" description="Scan QR codes" />
        <div className="app-mobile-page bg-background">
          <MobilePageHeader title="QR Code" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
              <QrCode className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold text-foreground">Invalid QR code</p>
            <p className="text-sm text-muted-foreground">This QR code could not be read.</p>
            <Link to="/discover"><Button variant="outline" size="sm">Back</Button></Link>
          </div>
        </div>
      </>
    );
  }

  // Expired security QR
  if (isExpired(payload)) {
    return (
      <>
        <SEOHead title="QR Expired — Easy Locs" description="This QR code has expired" />
        <div className="app-mobile-page bg-background">
          <MobilePageHeader title="QR Code" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8 text-destructive/60" />
            </div>
            <p className="text-lg font-semibold text-foreground">QR code expired</p>
            <p className="text-sm text-muted-foreground">This QR code is no longer valid. Please request a new one.</p>
            <Link to="/discover"><Button variant="outline" size="sm">Back</Button></Link>
          </div>
        </div>
      </>
    );
  }

  // Security actions — show confirmation
  if (isSecurityAction(payload.action)) {
    return (
      <>
        <SEOHead title="Security Verification — Easy Locs" description="QR security verification" />
        <div className="app-mobile-page bg-background">
          <MobilePageHeader title="Security Verification" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-8 pb-24 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
              <ShieldAlert className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm font-semibold text-foreground capitalize">{payload.action.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">
                {payload.action === "login_verify" && "Approve this login on your device."}
                {payload.action === "device_link" && "Link this device to your account."}
                {payload.action === "payment_confirm" && "Confirm this payment."}
                {payload.action === "trusted_contact" && "Add as a trusted contact."}
              </p>
            </div>
            <Button className="w-full h-12 text-base font-semibold">
              Confirm
            </Button>
          </div>
        </div>
      </>
    );
  }

  // pay_user — show pay button inline
  if (payload.action === "pay_user") {
    return (
      <>
        <SEOHead title="Pay — Easy Locs" description="QR payment" />
        <div className="app-mobile-page bg-background">
          <MobilePageHeader title="Pay" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-8 pb-24 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">QR Payment</p>
              {payload.amount && (
                <p className="text-3xl font-bold text-foreground">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: payload.currency || "AED" }).format(payload.amount)}
                </p>
              )}
              {payload.name && <p className="text-sm text-muted-foreground">{payload.name}</p>}
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

  // Fallback — navigated via resolveRoute already
  return null;
}
