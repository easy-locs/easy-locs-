/**
 * QrScannerPage — Full-screen QR scanner using html5-qrcode.
 * For user_pay/shop_pay: opens UnifiedPayment modal directly (no intermediate page).
 * For other types: navigates to deep-link routes.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CameraOff, CheckCircle2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeQrPayload } from "@/payments/payment-request-hooks";
import { useUnifiedPayment, type PaymentResult } from "@/payments/UnifiedPaymentSystem";

type ScanState = "idle" | "starting" | "scanning" | "success" | "paying" | "paid" | "error";

export default function QrScannerPage() {
  const navigate = useNavigate();
  const { openPayment } = useUnifiedPayment();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const regionId = "qr-reader-region";

  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [lastText, setLastText] = useState("");
  const [payResult, setPayResult] = useState<PaymentResult | null>(null);

  // Use refs for callbacks to avoid re-creating the effect
  const navigateRef = useRef(navigate);
  const openPaymentRef = useRef(openPayment);
  navigateRef.current = navigate;
  openPaymentRef.current = openPayment;

  const handleQrResult = useCallback(async (raw: string) => {
    if (handledRef.current) return;
    handledRef.current = true;

    const payload = decodeQrPayload(raw);

    if (payload) {
      if (payload.type === "user_pay") {
        setState("paying");
        const result = await openPaymentRef.current({
          amount: payload.amount || 0,
          currency: payload.currency || "AED",
          title: "QR Payment",
          subtitle: "Scanned payment",
          recipientId: payload.userId,
          contextType: "generic",
          contextId: payload.userId,
          metadata: { source: "qr_scan", qr_type: "user_pay" },
        });
        setPayResult(result);
        setState(result.ok ? "paid" : "error");
        if (!result.ok && result.error) setError(result.error);
        return;
      }

      if (payload.type === "shop_pay") {
        setState("paying");
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
        setPayResult(result);
        setState(result.ok ? "paid" : "error");
        if (!result.ok && result.error) setError(result.error);
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

    // Fallback: support raw URLs
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const url = new URL(raw);
        const internal = `${url.pathname}${url.search}${url.hash}`;
        navigateRef.current(internal, { replace: true });
        return;
      } catch {}
    }

    setState("error");
    setError("Unsupported QR format");
  }, []);

  useEffect(() => {
    let mounted = true;
    handledRef.current = false;

    async function startScanner() {
      try {
        setState("starting");
        setError("");

        // Small delay to ensure DOM element is mounted
        await new Promise(r => setTimeout(r, 300));
        if (!mounted) return;

        const el = document.getElementById(regionId);
        if (!el) {
          setState("error");
          setError("Scanner container not found");
          return;
        }

        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!mounted || handledRef.current) return;
            setLastText(decodedText);
            setState("success");
            try { scanner.stop(); } catch {}
            handleQrResult(decodedText);
          },
          () => {}
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
        scanner.stop().catch(() => {});
        try { scanner.clear(); } catch {}
        scannerRef.current = null;
      }
    };
  }, []); // stable — no deps

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

      {/* Scanner / Result */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {state === "paid" && payResult?.ok ? (
          /* Success state */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-foreground">Payment sent!</p>
            {payResult.transactionId && (
              <p className="text-[11px] text-muted-foreground">
                TX: {payResult.transactionId.slice(0, 12)}…
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          /* Scanner viewport */
          <>
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
                  {state === "idle" && "Preparing camera"}
                  {state === "starting" && "Starting camera…"}
                  {state === "scanning" && "Point at a QR code"}
                  {state === "success" && "QR detected ✓"}
                  {state === "paying" && "Processing payment…"}
                  {state === "error" && "Scanner error"}
                </span>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-destructive text-center max-w-[280px]">
                {error}
              </p>
            )}

            {lastText && (state === "success" || state === "paying") && (
              <p className="mt-3 text-[11px] text-muted-foreground text-center break-all max-w-[280px]">
                {lastText}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
