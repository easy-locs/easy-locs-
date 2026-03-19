import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveQrTarget } from "@/lib/qr/qr-resolver";
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

        if (!target?.merchantProfileId) {
          throw new Error("QR target missing merchant");
        }

        navigate(
          `/merchant/pos?merchant=${encodeURIComponent(target.merchantProfileId)}&target=${encodeURIComponent(target.targetCode)}`,
          { replace: true }
        );
      } catch (e: any) {
        setError(e.message ?? "QR invalid");
      }
    })();
  }, [targetCode, navigate]);

  if (error) {
    return <PageErrorState title="QR error" message={error} />;
  }

  return <PageLoadingState title="Opening menu..." />;
}
