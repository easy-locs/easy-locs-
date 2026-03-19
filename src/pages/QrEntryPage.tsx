import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveQrTarget } from "@/lib/qr/qr-resolver";
import { routes } from "@/lib/routes";
import { PageErrorState, PageLoadingState } from "@/components/page-states";

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

        if (!target) {
          setError("QR invalid");
          return;
        }

        if (!target.active) {
          setError("QR target is inactive.");
          return;
        }

        // Build safe redirect to merchant POS
        const params = new URLSearchParams({
          merchant: target.merchantProfileId,
          target: target.targetCode,
        });

        // Add table param for dine-in / table types
        if (
          (target.targetType === "dine_in" || target.targetType === "table") &&
          target.tableNumber
        ) {
          params.set("table", target.tableNumber);
        }

        navigate(`${routes.merchantPos()}?${params.toString()}`, { replace: true });
      } catch (e: any) {
        setError(e.message ?? "QR invalid");
      }
    })();
  }, [targetCode, navigate]);

  if (error) return <PageErrorState title="QR Error" description={error} />;
  return <PageLoadingState title="Opening menu…" />;
}
