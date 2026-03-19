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

        if (!target.active) {
          setError("QR inactive");
          return;
        }

        const qs = new URLSearchParams({
          merchant: target.merchantProfileId,
          target: target.targetCode,
        });

        if (target.tableNumber) qs.set("table", target.tableNumber);

        navigate(`${routes.merchantPos()}?${qs.toString()}`, { replace: true });
      } catch (e: any) {
        setError(e?.message ?? "QR invalid");
      }
    })();
  }, [targetCode, navigate]);

  if (error) {
    return <PageErrorState title="QR error" description={error} />;
  }

  return <PageLoadingState title="Opening menu…" />;
}
