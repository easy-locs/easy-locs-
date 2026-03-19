import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveQrTarget } from "@/lib/qr/qr-resolver";
import { routes } from "@/lib/routes";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { safeErrorMessage } from "@/lib/debug/debug-helpers";

export default function QrEntryPage() {
  const { targetCode } = useParams<{ targetCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetCode) {
      setError("QR code missing");
      debugLog.error("qr", "qr_entry_missing_code", "No targetCode in route");
      return;
    }

    debugLog.info("router", "qr_entry_opened", window.location.href);

    (async () => {
      try {
        const target = await resolveQrTarget(targetCode);

        if (!target.active) {
          debugLog.warn("qr", "qr_inactive", targetCode);
          setError("QR inactive");
          return;
        }

        const qs = new URLSearchParams({
          merchant: target.merchantProfileId,
          target: target.targetCode,
        });

        if (target.tableNumber) qs.set("table", target.tableNumber);

        const finalUrl = `${routes.merchantPos()}?${qs.toString()}`;
        debugLog.success("router", "qr_redirect_ready", finalUrl, target);

        navigate(finalUrl, { replace: true });
      } catch (e: any) {
        const msg = safeErrorMessage(e);
        setError(msg);
        debugLog.error("qr", "qr_entry_failed", msg);
      }
    })();
  }, [targetCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-destructive">QR Error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-foreground">Opening QR target…</h1>
      </div>
    </div>
  );
}
