/**
 * /qr/resolve — Universal QR code resolver.
 * Reads encoded payload from ?data=, decodes via unified QR engine,
 * and redirects to the correct deep-link or shows inline payment.
 */
import { useMemo, useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { decodeQr, resolveRoute, isExpired, isSecurityAction, type UniversalQrPayload } from "@/lib/qr-engine";
import { UnifiedPayButton } from "@/payments/UnifiedPaymentSystem";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import SEOHead from "@/components/SEOHead";
import { QrCode, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";
import { formatMoney } from "@/lib/format";
import { useUiEngine } from "@/hooks/useUiEngine";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export default function QrResolvePage() {
  useUiEngine("deep-link-qrresolvepage");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
        <SubPageShell noContentPad>
          <MobilePageHeader title="QR Code" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
              <QrCode className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-semibold text-foreground">Invalid QR code</p>
            <p className="text-sm text-muted-foreground">This QR code could not be read.</p>
            <Link to="/discover"><Button variant="outline" size="sm">Back</Button></Link>
          </div>
        </SubPageShell>
      </>
    );
  }

  // Expired security QR
  if (isExpired(payload)) {
    return (
      <>
        <SEOHead title="QR Expired — Easy Locs" description="This QR code has expired" />
        <SubPageShell noContentPad>
          <MobilePageHeader title="QR Code" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8 text-destructive/60" />
            </div>
            <p className="text-lg font-semibold text-foreground">QR code expired</p>
            <p className="text-sm text-muted-foreground">This QR code is no longer valid. Please request a new one.</p>
            <Link to="/discover"><Button variant="outline" size="sm">Back</Button></Link>
          </div>
        </SubPageShell>
      </>
    );
  }

  // Security actions — show confirmation
  if (isSecurityAction(payload.action)) {
    return <SecurityActionConfirm payload={payload} />;
  }

  if (payload.action === "pay_user") {
    return (
      <>
        <SEOHead title="Pay — Easy Locs" description="QR payment" />
        <SubPageShell noContentPad>
          <MobilePageHeader title="Pay" backTo="/discover" />
          <div className="max-w-md mx-auto px-4 pt-8 pb-[var(--page-bottom-pad)] space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">QR Payment</p>
              {payload.amount && (
                <p className="text-3xl font-bold text-foreground">
                  {formatMoney(payload.amount, payload.currency || "AED")}
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
        </SubPageShell>
      </>
    );
  }

  return (
    <SubPageShell noContentPad className="flex items-center justify-center h-[60dvh]">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        <p className="text-xs text-muted-foreground">Redirecting…</p>
      </div>
    </SubPageShell>
  );
}

function SecurityActionConfirm({ payload }: { payload: UniversalQrPayload }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!user?.id || processing) return;
    setProcessing(true);
    try {
      if (payload.action === "login_verify" || payload.action === "device_link") {
        const { data: result, error: rpcError } = await cRpc("qr_confirm_security_action", {
          p_action: payload.action,
          p_payload_user_id: payload.userId || null,
        });
        if (rpcError) throw new Error(rpcError.message);
        if (result?.error) throw new Error(result.error);
        toast.success(payload.action === "login_verify" ? "Login approved" : "Device linked successfully");
      } else if (payload.action === "payment_confirm") {
        navigate(`/wallet/transfer?to=${payload.userId}${payload.amount ? `&amount=${payload.amount}` : ""}`, { replace: true });
        return;
      } else if (payload.action === "trusted_contact") {
        navigate(`/add-contact?userId=${payload.userId}${payload.name ? `&name=${encodeURIComponent(payload.name)}` : ""}`, { replace: true });
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/discover", { replace: true }), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }, [user?.id, payload, processing, navigate]);

  return (
    <>
      <SEOHead title="Security Verification — Easy Locs" description="QR security verification" />
      <SubPageShell noContentPad>
        <MobilePageHeader title="Security Verification" backTo="/discover" />
        <div className="max-w-md mx-auto px-4 pt-8 pb-[var(--page-bottom-pad)] space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            {done ? (
              <CheckCircle2 className="h-10 w-10 mx-auto" style={{ color: "hsl(152 60% 42%)" }} />
            ) : (
              <ShieldAlert className="h-10 w-10 text-primary mx-auto" />
            )}
            <p className="text-sm font-semibold text-foreground capitalize">{payload.action.replace(/_/g, " ")}</p>
            <p className="text-xs text-muted-foreground">
              {payload.action === "login_verify" && "Approve this login on your device."}
              {payload.action === "device_link" && "Link this device to your account."}
              {payload.action === "payment_confirm" && "Confirm this payment."}
              {payload.action === "trusted_contact" && "Add as a trusted contact."}
            </p>
          </div>
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleConfirm}
            disabled={processing || done || !user}
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : done ? (
              "Done"
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </SubPageShell>
    </>
  );
}
