/**
 * QR Entry Page — resolves a QR target code and redirects to merchant POS.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveQrTarget } from "@/lib/qr/qr-resolver";
import { routes } from "@/lib/routes";

export default function QrEntryPage() {
  const { targetCode } = useParams<{ targetCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetCode) {
      setError("QR code missing");
      return;
    }

    (async () => {
      try {
        const target = await resolveQrTarget(targetCode);

        if (!target.active) {
          setError("QR inactive");
          return;
        }

        const qs = new URLSearchParams({
          merchant: target.merchantProfileId,
          target: target.targetCode,
        });

        if (target.tableNumber) {
          qs.set("table", target.tableNumber);
        }

        navigate(`${routes.merchantPos()}?${qs.toString()}`, { replace: true });
      } catch (e: any) {
        setError(e?.message ?? "QR invalid");
      }
    })();
  }, [targetCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-destructive">QR error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-foreground">Opening QR…</h1>
        <p className="text-sm text-muted-foreground">Redirecting to merchant POS</p>
      </div>
    </div>
  );
}
