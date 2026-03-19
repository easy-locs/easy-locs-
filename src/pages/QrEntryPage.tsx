import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveQrTarget } from "@/lib/qr/qr-resolver";

export default function QrEntryPage() {
  const { targetCode } = useParams<{ targetCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetCode) return;

    (async () => {
      try {
        const target = await resolveQrTarget(targetCode);
        navigate(
          `/merchant/pos?merchant=${target.merchantProfileId}&target=${target.targetCode}`
        );
      } catch (e: any) {
        setError(e.message ?? "QR invalid");
      }
    })();
  }, [targetCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-destructive text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <p className="text-muted-foreground">Opening menu…</p>
    </div>
  );
}
