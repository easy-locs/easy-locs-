/**
 * QrEntryPage — Smart QR router that dispatches to the correct flow
 * based on qr_purpose: order, pay, table, front_desk, review, tracking, staff, pickup.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveQrTarget, type ResolvedQrTarget } from "@/lib/qr/qr-resolver";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

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
        const t = await resolveQrTarget(targetCode);
        const route = resolveRoute(t);
        navigate(route, { replace: true });
      } catch (e: any) {
        setError(e?.message ?? "QR expired or invalid");
      }
    })();
  }, [targetCode, navigate]);

  if (error) {
    return (
      <div className="app-mobile-page flex flex-col bg-background">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">QR Entry</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-destructive/10 mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">QR Invalid</h2>
          <p className="text-sm text-muted-foreground mt-2 text-center">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground active:scale-[0.97] transition-transform"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-mobile-page flex flex-col items-center justify-center bg-background">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10 mb-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Loading…</p>
    </div>
  );
}

/**
 * Resolve a QR target to the correct route based on purpose.
 */
function resolveRoute(t: ResolvedQrTarget): string {
  const slug = t.shopSlug || t.storefrontPageId || "unknown";
  const qs = new URLSearchParams();

  switch (t.qrPurpose) {
    case "order":
      // Customer menu ordering
      return `/menu/${encodeURIComponent(slug)}`;

    case "table":
      // Table-specific ordering — same menu but with table context
      qs.set("table", t.tableNumber || "1");
      qs.set("qr", t.targetCode);
      return `/menu/${encodeURIComponent(slug)}?${qs}`;

    case "pay":
      // Open payment screen
      qs.set("merchant", t.merchantProfileId || "");
      qs.set("shop", t.storefrontPageId || "");
      if (t.shopName) qs.set("name", t.shopName);
      return `/pay/scan?${qs}`;

    case "front_desk":
      // Front desk — opens ordering with desk context
      qs.set("mode", "desk");
      qs.set("qr", t.targetCode);
      return `/menu/${encodeURIComponent(slug)}?${qs}`;

    case "review":
      // Review page
      return `/shop/${encodeURIComponent(slug)}?action=review&qr=${t.targetCode}`;

    case "tracking":
      // Order tracking
      return `/qr/track?shop=${encodeURIComponent(slug)}&qr=${t.targetCode}`;

    case "staff":
      // Kitchen / staff access
      qs.set("shop", t.storefrontPageId || "");
      return `/merchant/kitchen?${qs}`;

    case "pickup":
      // Pickup point
      return `/qr/pickup?shop=${encodeURIComponent(slug)}&qr=${t.targetCode}`;

    default:
      // Fallback to order page
      return `/menu/${encodeURIComponent(slug)}`;
  }
}
