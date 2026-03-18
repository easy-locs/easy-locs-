/**
 * QrScannerPage — Unified Scan + My QR page.
 * Tab toggle: Scan (camera) | My QR (receive money).
 * Camera starts only on explicit user tap (required for iOS Safari).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CameraOff, RefreshCcw, CheckCircle2, Info, ScanLine, QrCode } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeQr, resolveRoute, isExpired, isSecurityAction, type UniversalQrPayload } from "@/lib/qr-engine";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { QrResolvedCard } from "@/components/qr/QrResolvedCard";
import { UserProfileQr } from "@/components/qr/UniversalQrWidgets";

type ScanState = "idle" | "starting" | "scanning" | "paying" | "paid" | "stopped" | "error" | "resolved";
type TabMode = "scan" | "myqr";

const REGION_ID = "qr-reader-region";
const QR_BOX_SIZE = 240;

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Android/i.test(ua);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function QrScannerPage() {
  const navigate = useNavigate();
  const { openPayment } = useUnifiedPayment();
  const { user, orgId } = useAuth();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const startedRef = useRef(false);
  const stoppingRef = useRef(false);
  const handledRef = useRef(false);
  const opRef = useRef(0);

  const navigateRef = useRef(navigate);
  const openPaymentRef = useRef(openPayment);
  navigateRef.current = navigate;
  openPaymentRef.current = openPayment;

  const [tab, setTab] = useState<TabMode>("scan");
  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [lastText, setLastText] = useState("");
  const [txId, setTxId] = useState("");
  const [resolvedPayload, setResolvedPayload] = useState<UniversalQrPayload | null>(null);
  const [cameraCount, setCameraCount] = useState<number | null>(null);

  const secure = typeof window === "undefined" ? true : window.isSecureContext;
  const ios = isIOS();
  const safari = isSafariBrowser();

  const log = useCallback((event: string, data?: unknown) => {
    if (data !== undefined) console.info(`[qr-scanner] ${event}`, data);
    else console.info(`[qr-scanner] ${event}`);
  }, []);

  const setStateSafe = useCallback((s: ScanState) => { if (mountedRef.current) setState(s); }, []);
  const setErrorSafe = useCallback((m: string) => { if (mountedRef.current) setError(m); }, []);

  const resetRuntimeFlags = useCallback(() => {
    startingRef.current = false;
    startedRef.current = false;
    stoppingRef.current = false;
    handledRef.current = false;
    scannerRef.current = null;
  }, []);

  const clearScannerInstance = useCallback(async (reason: string, updateState = true) => {
    const scanner = scannerRef.current;
    const opId = ++opRef.current;
    if (!scanner) { resetRuntimeFlags(); if (updateState && mountedRef.current) setState("stopped"); return; }
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    try { if (startedRef.current) await scanner.stop(); } catch {}
    try { await Promise.resolve(scanner.clear()); } catch {}
    resetRuntimeFlags();
    if (updateState && mountedRef.current) setState("stopped");
  }, [resetRuntimeFlags]);

  const handleQrResult = useCallback(async (raw: string) => {
    const payload = decodeQr(raw);
    if (!payload) { setErrorSafe("Unsupported QR format"); setStateSafe("error"); return; }
    if (isExpired(payload)) { setErrorSafe("This QR code has expired"); setStateSafe("error"); return; }

    if (payload.action === "pay_user") {
      setStateSafe("paying");
      const result = await openPaymentRef.current({
        amount: payload.amount || 0, currency: payload.currency || "AED",
        title: "QR Payment", subtitle: "Scanned payment",
        recipientId: payload.userId, recipientName: payload.name || "QR Recipient",
        contextType: "generic", contextId: payload.userId,
        metadata: { source: "qr_scan", qr_type: "pay_user" },
      });
      if (!mountedRef.current) return;
      if (result.ok) { setTxId(result.transactionId || ""); setState("paid"); }
      else if (result.error !== "Cancelled") { setError(result.error || "Payment failed"); setState("error"); }
      else { setState("idle"); handledRef.current = false; }
      return;
    }

    if (payload.action === "pay_shop") {
      setStateSafe("paying");
      let shopOwnerId: string | undefined;
      try {
        const { data: shop } = await supabase.from("storefront_pages").select("user_id").eq("slug", payload.shopSlug).maybeSingle();
        shopOwnerId = shop?.user_id || undefined;
      } catch {}
      if (!shopOwnerId) { setErrorSafe("Shop not found"); setStateSafe("error"); return; }
      const result = await openPaymentRef.current({
        amount: payload.amount || 0, currency: payload.currency || "AED",
        title: `Pay ${payload.name || "Shop"}`, subtitle: "QR shop payment",
        recipientId: shopOwnerId, contextType: "shop", contextId: payload.shopSlug,
        metadata: { source: "qr_scan", qr_type: "pay_shop", shopSlug: payload.shopSlug },
      });
      if (!mountedRef.current) return;
      if (result.ok) { setTxId(result.transactionId || ""); setState("paid"); }
      else if (result.error !== "Cancelled") { setError(result.error || "Payment failed"); setState("error"); }
      else { setState("idle"); handledRef.current = false; }
      return;
    }

    if (payload.action === "profile" || payload.action === "add_contact" || payload.action === "shop") {
      setResolvedPayload(payload); setStateSafe("resolved"); return;
    }

    const route = resolveRoute(payload);
    if (route) { navigateRef.current(route, { replace: true }); return; }
    setErrorSafe("Unsupported QR format"); setStateSafe("error");
  }, [setErrorSafe, setStateSafe]);

  const startScanner = useCallback(async () => {
    if (!secure) { setErrorSafe("Camera scanning requires HTTPS."); setStateSafe("error"); return; }
    if (startingRef.current || startedRef.current || stoppingRef.current) return;
    const el = document.getElementById(REGION_ID);
    if (!el) { setErrorSafe("Scanner container not found."); setStateSafe("error"); return; }

    const startOp = ++opRef.current;
    startingRef.current = true;
    handledRef.current = false;
    setErrorSafe(""); setLastText(""); setTxId("");
    setStateSafe("starting");

    try {
      // Preflight camera
      let tempStream: MediaStream | null = null;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch (err) {
        const domErr = err as DOMException;
        if (domErr?.name === "NotAllowedError") throw new Error("Camera permission denied.");
        if (domErr?.name === "NotFoundError") throw new Error("No camera found.");
        throw new Error(domErr?.message || "Unable to open camera.");
      } finally {
        tempStream?.getTracks().forEach((t) => t.stop());
        if (ios || safari) await wait(250);
      }

      if (!mountedRef.current || opRef.current !== startOp) return;

      // Select camera
      let preferredCameraId: string | null = null;
      try {
        const cameras = await Html5Qrcode.getCameras();
        setCameraCount(cameras.length);
        const rear = cameras.find((c) => /back|rear|environment|wide/i.test(c.label));
        preferredCameraId = rear?.id || cameras[cameras.length - 1]?.id || cameras[0]?.id || null;
      } catch {}

      if (!mountedRef.current || opRef.current !== startOp) return;

      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner;
      const scanConfig = { fps: ios ? 6 : 10, qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE }, aspectRatio: 1, disableFlip: false };

      const startWith = async (cfg: any, label: string) => {
        await scanner.start(cfg, scanConfig, async (text) => {
          if (!mountedRef.current || handledRef.current) return;
          handledRef.current = true;
          setLastText(text);
          await clearScannerInstance("decode", false);
          await handleQrResult(text);
        }, () => {});
      };

      try {
        if (preferredCameraId) await startWith({ deviceId: { exact: preferredCameraId } }, "preferred");
        else await startWith({ facingMode: { ideal: "environment" } }, "facingMode");
      } catch {
        await Promise.resolve(scanner.clear()).catch(() => {});
        scannerRef.current = scanner;
        await wait(ios ? 250 : 100);
        await startWith({ facingMode: "environment" }, "fallback");
      }

      if (!mountedRef.current || opRef.current !== startOp) { await clearScannerInstance("stale", false); return; }
      startedRef.current = true; startingRef.current = false; stoppingRef.current = false;
      setStateSafe("scanning");
    } catch (err) {
      resetRuntimeFlags();
      setErrorSafe(err instanceof Error ? err.message : "Unable to access camera.");
      setStateSafe("error");
    }
  }, [clearScannerInstance, handleQrResult, ios, safari, secure, setErrorSafe, setStateSafe, resetRuntimeFlags]);

  // Cleanup on tab switch or unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; void clearScannerInstance("unmount", false); };
  }, [clearScannerInstance]);

  // Stop scanner when switching to My QR tab
  useEffect(() => {
    if (tab === "myqr" && (startedRef.current || startingRef.current)) {
      void clearScannerInstance("tab-switch");
    }
  }, [tab, clearScannerInstance]);

  const handleReset = () => {
    setError(""); setLastText(""); setTxId(""); setResolvedPayload(null);
    setState("idle"); handledRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} className="rounded-full p-2 transition hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-foreground">Pay & Scan</h1>
          <p className="text-[11px] text-muted-foreground">Send or receive money instantly</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex border-b border-border/30">
        <button
          type="button"
          onClick={() => { setTab("scan"); handleReset(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${tab === "scan" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ScanLine className="h-4 w-4" /> Scan
        </button>
        <button
          type="button"
          onClick={() => { setTab("myqr"); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${tab === "myqr" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <QrCode className="h-4 w-4" /> My QR
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-6">
        {tab === "myqr" ? (
          /* ── My QR Tab ── */
          user?.id ? (
            <UserProfileQr userId={user.id} displayName={user.user_metadata?.display_name || user.email?.split("@")[0]} />
          ) : (
            <p className="text-sm text-muted-foreground">Sign in to see your QR code</p>
          )
        ) : (
          /* ── Scan Tab ── */
          <>
            {!secure && (
              <p className="mb-4 px-4 text-center text-xs text-destructive">
                Camera scanning requires HTTPS or a secure app context.
              </p>
            )}

            {state === "paid" ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-bold text-foreground">Payment sent!</p>
                {txId && <p className="text-[11px] text-muted-foreground">TX: {txId.slice(0, 16)}…</p>}
                <button type="button" onClick={() => navigate(-1)} className="mt-5 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                  Done
                </button>
              </div>
            ) : state === "resolved" && resolvedPayload ? (
              <QrResolvedCard payload={resolvedPayload} openPayment={openPayment} currentUserId={user?.id} currentOrgId={orgId} onReset={handleReset} />
            ) : (
              <>
                <div className="relative aspect-square w-full max-w-[300px] overflow-hidden rounded-2xl border-2 border-border/50 bg-muted/30">
                  <div id={REGION_ID} className="h-full w-full" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-background/80 py-3 backdrop-blur-sm">
                    {state === "scanning" || state === "starting" ? (
                      <Camera className="h-4 w-4 animate-pulse text-primary" />
                    ) : state === "paying" ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <CameraOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-foreground">
                      {state === "idle" && "Tap Start to scan"}
                      {state === "starting" && "Starting camera…"}
                      {state === "scanning" && "Point at QR code"}
                      {state === "paying" && "Processing…"}
                      {state === "stopped" && "Scanner stopped"}
                      {state === "error" && "Scanner error"}
                    </span>
                  </div>
                </div>

                {error && <p className="mt-4 max-w-[280px] text-center text-sm text-destructive">{error}</p>}

                <div className="mt-6 flex w-full max-w-[300px] gap-3">
                  <button
                    type="button"
                    disabled={state === "starting" || state === "scanning" || state === "paying"}
                    onClick={startScanner}
                    className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Camera className="h-4 w-4" /> Start
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={state !== "scanning" && state !== "starting"}
                    onClick={() => void clearScannerInstance("manual-stop")}
                    className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <CameraOff className="h-4 w-4" /> Stop
                    </span>
                  </button>
                </div>

                {(state === "error" || state === "stopped") && (
                  <button type="button" onClick={handleReset} className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
                    <RefreshCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
