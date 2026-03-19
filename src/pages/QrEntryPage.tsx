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
          setError("QR target is inactive.");
          return;
        }

        // dine_in / table -> merchant POS with table param
        if (target.targetType === "dine_in" || target.targetType === "table") {
          navigate(
            `${routes.merchantPos()}?merchant=${encodeURIComponent(
              target.merchantProfileId
            )}&target=${encodeURIComponent(target.targetCode)}&table=${encodeURIComponent(
              target.tableNumber ?? ""
            )}`,
            { replace: true }
          );
          return;
        }

        // global_menu / takeaway -> storefront-like flow
        if (target.targetType === "global_menu" || target.targetType === "takeaway") {
          navigate(
            `${routes.merchantPos()}?merchant=${encodeURIComponent(
              target.merchantProfileId
            )}&target=${encodeURIComponent(target.targetCode)}`,
            { replace: true }
          );
          return;
        }

        // fallback: basic redirect
        navigate(
          `${routes.merchantPos()}?merchant=${encodeURIComponent(
            target.merchantProfileId
          )}&target=${encodeURIComponent(target.targetCode)}`,
          { replace: true }
        );
      } catch (e: any) {
        setError(e.message ?? "QR invalid");
      }
    })();
  }, [targetCode, navigate]);

  if (error) return <PageErrorState title="QR Error" description={error} />;
  return <PageLoadingState title="Opening menu…" />;
}
