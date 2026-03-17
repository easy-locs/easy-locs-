/**
 * QrScannerPage — Full-screen QR scanner using html5-qrcode.
 * Resolves scanned payloads into navigation: payment requests, user pay, shops, profiles.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CameraOff } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeQrPayload } from "@/payments/payment-request-hooks";

type ScanState = "idle" | "starting" | "scanning" | "success" | "error";

export default function QrScannerPage() {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "qr-reader-region";

  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [lastText, setLastText] = useState("");

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        setState("starting");
        setError("");

        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (!mounted) return;

            setLastText(decodedText);
            setState("success");

            try {
              await scanner.stop();
            } catch {}

            handleQrResult(decodedText);
          },
          () => {
            // ignore scan frame errors
          }
        );

        if (mounted) setState("scanning");
      } catch (err: any) {
        if (!mounted) return;
        setState("error");
        setError(err?.message || "Unable to access camera");
      }
    }

    startScanner();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          await scanner.stop();
        } catch {}
        try {
          scanner.clear();
        } catch {}
      }
    };
  }, []);

  function handleQrResult(raw: string) {
    const payload = decodeQrPayload(raw);

    if (payload) {
      if (payload.type === "payment_request") {
        navigate(`/pay/request/${payload.requestId}`, { replace: true });
        return;
      }
      if (payload.type === "user_pay") {
        navigate(`/qr/resolve?data=${encodeURIComponent(raw)}`, { replace: true });
        return;
      }
      if (payload.type === "shop_pay") {
        navigate(`/qr/resolve?data=${encodeURIComponent(raw)}`, { replace: true });
        return;
      }
      if (payload.type === "profile") {
        navigate(`/u/${payload.userId}`, { replace: true });
        return;
      }
      if (payload.type === "shop") {
        navigate(`/s/${payload.shopSlug}`, { replace: true });
        return;
      }
    }

    // Fallback: support raw URLs
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const url = new URL(raw);
        const internal = `${url.pathname}${url.search}${url.hash}`;
        navigate(internal, { replace: true });
        return;
      } catch {}
    }

    setState("error");
    setError("Unsupported QR format");
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2 transition hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground">Scan QR</h1>
          <p className="text-[11px] text-muted-foreground">
            Pay, connect, open shop, or resolve request
          </p>
        </div>
      </div>

      {/* Scanner */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden border-2 border-border/50 bg-black/5 relative">
          <div id={regionId} className="w-full h-full" />

          {/* Overlay status */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2 py-3 bg-background/80 backdrop-blur-sm">
            {state === "scanning" || state === "starting" ? (
              <Camera className="h-4 w-4 text-primary animate-pulse" />
            ) : (
              <CameraOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-foreground">
              {state === "idle" && "Preparing camera"}
              {state === "starting" && "Starting camera…"}
              {state === "scanning" && "Point at a QR code"}
              {state === "success" && "QR detected ✓"}
              {state === "error" && "Scanner error"}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-destructive text-center max-w-[280px]">
            {error}
          </p>
        )}

        {lastText && state === "success" && (
          <p className="mt-3 text-[11px] text-muted-foreground text-center break-all max-w-[280px]">
            {lastText}
          </p>
        )}
      </div>
    </div>
  );
}
