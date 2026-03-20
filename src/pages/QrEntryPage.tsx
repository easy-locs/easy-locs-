/**
 * QrEntryPage — Premium themed QR entry resolver.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveQrTarget } from "@/lib/qr/qr-resolver";
import { routes } from "@/lib/routes";
import { Loader2, QrCode, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";

export default function QrEntryPage() {
  const { targetCode } = useParams<{ targetCode: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<any>(null);

  useEffect(() => {
    if (!targetCode) {
      setError("QR code missing");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resolved = await resolveQrTarget(targetCode);
        setTarget(resolved);
      } catch (e: any) {
        setError(e?.message ?? "QR expired or invalid");
      } finally {
        setLoading(false);
      }
    })();
  }, [targetCode]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">QR Entry</h1>
          <p className="text-[11px] text-muted-foreground truncate">
            Code: {targetCode || "—"}
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {loading && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Loading QR target…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 max-w-[300px] text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--destructive) / 0.1)" }}>
              <AlertCircle className="w-8 h-8" style={{ color: "hsl(var(--destructive))" }} />
            </div>
            <h2 className="text-lg font-bold text-foreground">QR Invalid</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform"
              style={{ background: "hsl(var(--primary))" }}
            >
              Go Home
            </button>
          </div>
        )}

        {target && (
          <div className="flex flex-col items-center gap-4 max-w-[300px] text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(142 60% 45% / 0.1)" }}>
              <QrCode className="w-8 h-8" style={{ color: "hsl(142 60% 45%)" }} />
            </div>
            <h2 className="text-lg font-bold text-foreground">QR Loaded</h2>
            <p className="text-sm text-muted-foreground">
              {target.targetType} · {target.tableNumber ? `Table ${target.tableNumber}` : "Ready"}
            </p>
            <button
              onClick={() => {
                const qs = new URLSearchParams({
                  merchant: target.merchantProfileId,
                  target: target.targetCode,
                });
                if (target.tableNumber) qs.set("table", target.tableNumber);
                navigate(`${routes.merchantPos()}?${qs.toString()}`, { replace: true });
              }}
              className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform"
              style={{ background: "hsl(var(--primary))" }}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
