/**
 * QrScannerPage — Mobile-hardened QR scanner.
 * Camera starts only on explicit user tap (required for iOS Safari).
 * Robust lifecycle: no double-start, no race conditions, safe unmount.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CameraOff, RefreshCcw, CheckCircle2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeQrPayload } from "@/payments/payment-request-hooks";
import { useUnifiedPayment, type PaymentResult } from "@/payments/UnifiedPaymentSystem";

type ScanState = "idle" | "starting" | "scanning" | "paying" | "paid" | "stopped" | "error";

export default function QrScannerPage() {
  const navigate = useNavigate();
  const { openPayment } = useUnifiedPayment();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const regionId = "qr-reader-region";

  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [lastText, setLastText] = useState("");
  const [txId, setTxId] = useState("");

  // Stable refs for callbacks used inside scanner
  const navigateRef = useRef(navigate);
  const openPaymentRef = useRef(openPayment);
  navigateRef.current = navigate;
  openPaymentRef.current = openPayment;

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (startedRef.current) {
        await scanner.stop();
      }
    } catch {}

    try {
      scanner.clear();
    } catch {}

    startedRef.current = false;
    startingRef.current = false;
    scannerRef.current = null;
    if (mountedRef.current) setState("stopped");
  }, []);

  const handleQrResult = useCallback(async (raw: string) => {
    const payload = decodeQrPayload(raw);

    if (payload) {
      if (payload.type === "user_pay") {
        if (mountedRef.current) setState("paying");
        const result = await openPaymentRef.current({
          amount: payload.amount || 0,
          currency: payload.currency || "AED",
          title: "QR Payment",
          subtitle: "Scanned payment",
          recipientId: payload.userId,
          recipientName: "QR Recipient",
          contextType: "generic",
          contextId: payload.userId,
          metadata: { source: "qr_scan", qr_type: "user_pay" },
        });
        if (mountedRef.current) {
          if (result.ok) {
            setTxId(result.transactionId || "");
            setState("paid");
          } else {
            setError(result.error || "Payment failed");
            setState("error");
          }
        }
        return;
      }

      if (payload.type === "shop_pay") {
        if (mountedRef.current) setState("paying");
        const result = await openPaymentRef.current({
          amount: payload.amount || 0,
          currency: payload.currency || "AED",
          title: "Shop Payment",
          subtitle: "QR shop payment",
          recipientId: undefined,
          contextType: "shop",
          contextId: payload.shopSlug,
          metadata: { source: "qr_scan", qr_type: "shop_pay", shopSlug: payload.shopSlug },
        });
        if (mountedRef.current) {
          if (result.ok) {
            setTxId(result.transactionId || "");
            setState("paid");
          } else {
            setError(result.error || "Payment failed");
            setState("error");
          }
        }
        return;
      }

      if (payload.type === "payment_request") {
        navigateRef.current(`/pay/request/${payload.requestId}`, { replace: true });
        return;
      }
      if (payload.type === "profile") {
        navigateRef.current(`/u/${payload.userId}`, { replace: true });
        return;
      }
      if (payload.type === "shop") {
        navigateRef.current(`/s/${payload.shopSlug}`, { replace: true });
        return;
      }
    }

    // Fallback: raw URLs
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const url = new URL(raw);
        navigateRef.current(`${url.pathname}${url.search}${url.hash}`, { replace: true });
        return;
      } catch {}
    }

    if (mountedRef.current) {
      setError("Unsupported QR format");
      setState("error");
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (startingRef.current || startedRef.current) return;

    setError("");
    setLastText("");
    setTxId("");
    setState("starting");
    startingRef.current = true;

    // Ensure DOM element exists
    await new Promise(r => setTimeout(r, 100));
    if (!mountedRef.current) return;

    const el = document.getElementById(regionId);
    if (!el) {
      startingRef.current = false;
      setState("error");
      setError("Scanner container not found. Please try again.");
      return;
    }

    try {
      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (!startedRef.current || !mountedRef.current) return;
          setLastText(decodedText);
          startedRef.current = false; // prevent double-handle

          try { await scanner.stop(); } catch {}
          try { scanner.clear(); } catch {}
          scannerRef.current = null;
          startingRef.current = false;

          await handleQrResult(decodedText);
        },
        () => {} // ignore per-frame failures
      );

      startedRef.current = true;
      startingRef.current = false;
      if (mountedRef.current) setState("scanning");
    } catch (err: any) {
      startingRef.current = false;
      startedRef.current = false;
      if (mountedRef.current) {
        setState("error");
        const msg = err?.message || "";
        if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setError("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
          setError("No camera found on this device.");
        } else if (msg.includes("NotReadableError")) {
          setError("Camera is in use by another app. Close other apps and try again.");
        } else {
          setError(msg || "Unable to access camera. Check permissions and HTTPS.");
        }
      }
    }
  }, [handleQrResult]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const scanner = scannerRef.current;
      if (scanner) {
        try { scanner.stop(); } catch {}
        try { scanner.clear(); } catch {}
        scannerRef.current = null;
        startedRef.current = false;
        startingRef.current = false;
      }
    };
  }, []);

  const isSecure = typeof window !== "undefined" ? window.isSecureContext : true;

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

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
        {!isSecure && (
          <p className="mb-4 text-xs text-destructive text-center px-4">
            Camera scanning requires HTTPS or a secure app context.
          </p>
        )}

        {state === "paid" ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-foreground">Payment sent!</p>
            {txId && (
              <p className="text-[11px] text-muted-foreground">TX: {txId.slice(0, 16)}…</p>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-5 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Scanner viewport */}
            <div className="w-full max-w-[300px] aspect-square rounded-2xl overflow-hidden border-2 border-border/50 bg-black/5 relative">
              <div id={regionId} className="w-full h-full" />

              <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2 py-3 bg-background/80 backdrop-blur-sm">
                {state === "scanning" || state === "starting" ? (
                  <Camera className="h-4 w-4 text-primary animate-pulse" />
                ) : state === "paying" ? (
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CameraOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-foreground">
                  {state === "idle" && "Tap Start to begin scanning"}
                  {state === "starting" && "Starting camera…"}
                  {state === "scanning" && "Point camera at QR code"}
                  {state === "paying" && "Processing payment…"}
                  {state === "stopped" && "Scanner stopped"}
                  {state === "error" && "Scanner error"}
                </span>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-destructive text-center max-w-[280px]">{error}</p>
            )}

            {lastText && (
              <p className="mt-3 text-[11px] text-muted-foreground text-center break-all max-w-[280px]">
                {lastText}
              </p>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex gap-3 w-full max-w-[300px]">
              <button
                type="button"
                disabled={state === "starting" || state === "scanning" || state === "paying"}
                onClick={startScanner}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
              >
                <Camera className="h-4 w-4" />
                Start Scanner
              </button>
              <button
                type="button"
                disabled={state !== "scanning" && state !== "starting"}
                onClick={stopScanner}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <CameraOff className="h-4 w-4" />
                Stop
              </button>
            </div>

            {/* Reset */}
            {(state === "error" || state === "stopped") && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setLastText("");
                  setTxId("");
                  setState("idle");
                }}
                className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
