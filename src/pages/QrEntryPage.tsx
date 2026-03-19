/**
 * QrEntryPage — Guaranteed visible debug-safe UI.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveQrTarget } from "@/lib/qr/qr-resolver";
import { routes } from "@/lib/routes";

export default function QrEntryPage() {
  const { targetCode } = useParams<{ targetCode: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<any>(null);

  useEffect(() => {
    console.log("[qr-entry] mounted", targetCode);

    if (!targetCode) {
      setError("QR code missing");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resolved = await resolveQrTarget(targetCode);
        console.log("[qr-entry] resolved", resolved);
        setTarget(resolved);
      } catch (e: any) {
        console.error("[qr-entry] error", e);
        setError(e?.message ?? "QR expiré ou invalide");
      } finally {
        setLoading(false);
      }
    })();
  }, [targetCode]);

  return (
    <div style={{ minHeight: "100vh", background: "#020b2d", color: "#fff", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>QR Entry</h1>
      <p style={{ marginTop: 8, fontSize: 13, opacity: 0.6 }}>
        Target code: {targetCode || "missing"}
      </p>

      {loading && <p style={{ marginTop: 12 }}>Loading QR...</p>}

      {error && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "#ff5c5c", fontWeight: 600 }}>QR expiré ou invalide</p>
          <p style={{ color: "#ff5c5c", fontSize: 13, marginTop: 4 }}>{error}</p>
          <a href="/#/discover" style={{ display: "inline-block", marginTop: 12, color: "#d6a84f", textDecoration: "underline", fontSize: 14 }}>
            Retour
          </a>
        </div>
      )}

      {target && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "#4ade80", fontWeight: 600 }}>QR loaded successfully ✓</p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8, background: "#0a1640", padding: 12, borderRadius: 8 }}>
            {JSON.stringify(target, null, 2)}
          </pre>
          <button
            onClick={() => {
              const qs = new URLSearchParams({
                merchant: target.merchantProfileId,
                target: target.targetCode,
              });
              if (target.tableNumber) qs.set("table", target.tableNumber);
              navigate(`${routes.merchantPos()}?${qs.toString()}`, { replace: true });
            }}
            style={{ marginTop: 12, padding: "10px 20px", background: "#d6a84f", color: "#000", fontWeight: 600, fontSize: 14, borderRadius: 8, border: "none" }}
          >
            Continue to merchant POS
          </button>
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 12, opacity: 0.5 }}>
        If you can see this, the page is rendering correctly.
      </p>
    </div>
  );
}
