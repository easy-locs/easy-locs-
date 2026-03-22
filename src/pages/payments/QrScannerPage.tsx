/**
 * QrScannerPage — Premium scanner with green laser, beep, haptic, success animation.
 * Clean UX: no debug info, no env probes, fast startup.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CameraOff, RefreshCcw, CheckCircle2, ScanLine, QrCode, Upload, ExternalLink } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeQr, resolveRoute, isExpired, type UniversalQrPayload } from "@/lib/qr-engine";
import { playScanBeep } from "@/lib/calls/call-ringtone";
import { haptic } from "@/lib/haptics";
import { resolvePayTarget, type ResolvedPayTarget } from "@/lib/wallet/resolvePayTarget";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { useAuth } from "@/contexts/AuthContext";
import { QrResolvedCard } from "@/components/qr/QrResolvedCard";
import { UserProfileQr } from "@/components/qr/UniversalQrWidgets";
import { toast } from "sonner";
import { requestMediaStream } from "@/lib/device/permissions";
import { motion, AnimatePresence } from "framer-motion";

type ScanState = "idle" | "starting" | "scanning" | "paying" | "paid" | "stopped" | "error" | "resolved";
type TabMode = "scan" | "myqr";

const REGION_ID = "qr-reader-region";
const QR_BOX_SIZE = 240;
const CARD_SIZE = 300;

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

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    promise.finally(() => { if (timer) clearTimeout(timer); }),
    new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
  ]);
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
  const [cameraDevices, setCameraDevices] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraRequested, setCameraRequested] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const secure = typeof window === "undefined" ? true : window.isSecureContext;
  const ios = isIOS();
  const safari = isSafariBrowser();

  const setStateSafe = useCallback((s: ScanState) => { if (mountedRef.current) setState(s); }, []);
  const setErrorSafe = useCallback((m: string) => { if (mountedRef.current) setError(m); }, []);

  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      if (mountedRef.current) setCameraDevices(cameras);
      return cameras;
    } catch { return []; }
  }, []);

  const chooseBestCamera = useCallback((cameras: Array<{ id: string; label: string }>, preferredId?: string | null) => {
    if (!cameras.length) return "";
    if (preferredId && cameras.some((c) => c.id === preferredId)) return preferredId;
    if (selectedCameraId && cameras.some((c) => c.id === selectedCameraId)) return selectedCameraId;
    const rear = cameras.find((c) => /back|rear|environment|wide|ultra/i.test(c.label));
    return rear?.id || cameras[cameras.length - 1]?.id || cameras[0].id;
  }, [selectedCameraId]);

  const resetRuntimeFlags = useCallback(() => {
    startingRef.current = false;
    startedRef.current = false;
    stoppingRef.current = false;
    handledRef.current = false;
    scannerRef.current = null;
  }, []);

  const clearScannerInstance = useCallback(async (_reason: string, updateState = true) => {
    const scanner = scannerRef.current;
    ++opRef.current;
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
      let resolved: ResolvedPayTarget;
      try {
        resolved = await resolvePayTarget({ userId: payload.userId, currency: payload.currency || "AED" });
      } catch {
        setErrorSafe("Unresolved recipient — could not verify target");
        setStateSafe("error");
        return;
      }
      if (resolved.walletStatus === "locked") { setErrorSafe("Recipient wallet is locked"); setStateSafe("error"); return; }

      const result = await openPaymentRef.current({
        amount: payload.amount || 0, currency: resolved.currency || "AED",
        title: `Pay ${resolved.displayName || payload.name || "User"}`,
        subtitle: "QR Payment",
        recipientId: resolved.targetUserId,
        recipientName: resolved.displayName || payload.name || "QR Recipient",
        contextType: "generic", contextId: resolved.targetUserId,
        metadata: { source: "qr_scan", qr_type: "pay_user", resolved_wallet_id: resolved.targetWalletId },
      });
      if (!mountedRef.current) return;
      if (result.ok) {
        setTxId(result.transactionId || "");
        setState("paid");
        haptic("success");
        playScanBeep();
      } else if (result.error !== "Cancelled") {
        setError(result.error || "Payment failed");
        setState("error");
      } else {
        setState("idle");
        handledRef.current = false;
      }
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
      if (result.ok) {
        setTxId(result.transactionId || "");
        setState("paid");
        haptic("success");
        playScanBeep();
      } else if (result.error !== "Cancelled") {
        setError(result.error || "Payment failed");
        setState("error");
      } else {
        setState("idle");
        handledRef.current = false;
      }
      return;
    }

    if (payload.action === "profile" || payload.action === "add_contact" || payload.action === "shop") {
      setResolvedPayload(payload);
      setStateSafe("resolved");
      return;
    }

    const route = resolveRoute(payload);
    if (route) { navigateRef.current(route, { replace: true }); return; }
    setErrorSafe("Unsupported QR format");
    setStateSafe("error");
  }, [setErrorSafe, setStateSafe]);

  const handleImageUpload = useCallback(async (file: File) => {
    setStateSafe("starting");
    setErrorSafe("");
    try {
      const scanner = new Html5Qrcode("qr-file-upload-region", { verbose: false });
      const result = await scanner.scanFile(file, false);
      scanner.clear();
      if (!result) throw new Error("No QR code found in image");
      playScanBeep();
      haptic("success");
      setLastText(result);
      await handleQrResult(result);
    } catch {
      toast.error("No QR code found in image. Try another or use live scan.");
    }
  }, [handleQrResult, setErrorSafe, setStateSafe]);

  const startScanner = useCallback(async (preferredDeviceId?: string) => {
    if (!secure || !navigator.mediaDevices?.getUserMedia) {
      setErrorSafe("Camera requires HTTPS or is unavailable");
      setStateSafe("error");
      return;
    }
    if (startingRef.current || startedRef.current || stoppingRef.current) return;
    const el = document.getElementById(REGION_ID);
    if (!el) { setErrorSafe("Scanner container not found."); setStateSafe("error"); return; }

    const startOp = ++opRef.current;
    startingRef.current = true;
    handledRef.current = false;
    setErrorSafe(""); setLastText(""); setTxId("");
    setStateSafe("starting");

    try {
      let grantedDeviceId = "";
      let tempStream: MediaStream | null = null;
      try {
        tempStream = await requestMediaStream({
          camera: true,
          videoConstraints: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        grantedDeviceId = tempStream.getVideoTracks()[0]?.getSettings().deviceId || "";
      } catch (err) {
        const domErr = err as DOMException;
        if (domErr?.name === "NotAllowedError") throw new Error("Camera permission denied. Allow camera in settings.");
        if (domErr?.name === "NotFoundError") {
          setErrorSafe("No camera found — use Upload QR image");
          setStateSafe("error");
          startingRef.current = false;
          return;
        }
        throw new Error(domErr?.message || "Camera unavailable");
      } finally {
        tempStream?.getTracks().forEach((t) => t.stop());
        if (ios || safari) await wait(250);
      }

      if (!mountedRef.current || opRef.current !== startOp) return;

      const cameras = await refreshCameraDevices();
      const preferredCameraId = chooseBestCamera(cameras, preferredDeviceId || grantedDeviceId);
      if (mountedRef.current) setSelectedCameraId(preferredCameraId);
      if (!mountedRef.current || opRef.current !== startOp) return;

      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner;
      const scanConfig = { fps: ios ? 10 : 15, qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE }, disableFlip: false };

      const startWith = async (cfg: any, label: string) => {
        await withTimeout(scanner.start(cfg, scanConfig, async (text) => {
          if (!mountedRef.current || handledRef.current) return;
          handledRef.current = true;
          // ── BEEP + HAPTIC on scan ──
          playScanBeep();
          haptic("success");
          setLastText(text);
          await clearScannerInstance("decode", false);
          await handleQrResult(text);
        }, () => {}), 12000, `Camera start timed out (${label}).`);
      };

      try {
        if (preferredCameraId) await startWith({ deviceId: { exact: preferredCameraId } }, "preferred");
        else await startWith({ facingMode: { ideal: "environment" } }, "facingMode");
      } catch {
        try {
          await Promise.resolve(scanner.clear()).catch(() => {});
          scannerRef.current = scanner;
          await wait(ios ? 250 : 100);
          await startWith({ facingMode: "environment" }, "fallback");
        } catch {
          resetRuntimeFlags();
          setErrorSafe("Camera unavailable — use Upload QR image below.");
          setStateSafe("error");
          return;
        }
      }

      if (!mountedRef.current || opRef.current !== startOp) { await clearScannerInstance("stale", false); return; }
      startedRef.current = true; startingRef.current = false; stoppingRef.current = false;
      setStateSafe("scanning");
    } catch (err) {
      resetRuntimeFlags();
      setErrorSafe(err instanceof Error ? err.message : "Unable to access camera.");
      setStateSafe("error");
    }
  }, [chooseBestCamera, clearScannerInstance, handleQrResult, ios, refreshCameraDevices, safari, secure, setErrorSafe, setStateSafe, resetRuntimeFlags]);

  // Auto-start scanner
  useEffect(() => {
    mountedRef.current = true;
    if (tab === "scan" && secure) {
      const t = setTimeout(() => {
        if (mountedRef.current && !startingRef.current && !startedRef.current) {
          setCameraRequested(true);
          void startScanner();
        }
      }, 300);
      return () => { clearTimeout(t); mountedRef.current = false; void clearScannerInstance("unmount", false); };
    }
    return () => { mountedRef.current = false; void clearScannerInstance("unmount", false); };
  }, [clearScannerInstance, tab, secure, startScanner]);

  useEffect(() => {
    if (tab === "myqr" && (startedRef.current || startingRef.current)) void clearScannerInstance("tab-switch");
  }, [tab, clearScannerInstance]);

  const handleReset = () => {
    setError(""); setLastText(""); setTxId(""); setResolvedPayload(null);
    setState("idle"); handledRef.current = false;
  };

  const handleStartCamera = async (preferredDeviceId?: string) => {
    setCameraRequested(true);
    await startScanner(preferredDeviceId);
  };

  const handleSwitchCamera = async () => {
    const cameras = cameraDevices.length ? cameraDevices : await refreshCameraDevices();
    if (!cameras.length) { setErrorSafe("No alternate camera found."); setStateSafe("error"); return; }
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextCamera = cameras[(currentIndex + 1 + cameras.length) % cameras.length];
    await clearScannerInstance("switch-camera", false);
    handleReset();
    await handleStartCamera(nextCamera.id);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} className="rounded-full p-2 active:scale-95 transition-transform hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-foreground">Scan & Pay</h1>
          <p className="text-[11px] text-muted-foreground truncate">Send or receive money instantly</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex border-b border-border/30">
        <button type="button" onClick={() => { setTab("scan"); handleReset(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors active:scale-[0.97] ${tab === "scan" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          <ScanLine className="h-4 w-4" /> Scan
        </button>
        <button type="button" onClick={() => setTab("myqr")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors active:scale-[0.97] ${tab === "myqr" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          <QrCode className="h-4 w-4" /> My QR
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-6">
        {tab === "myqr" ? (
          <div className="w-full flex flex-col items-center" style={{ maxWidth: CARD_SIZE }}>
            {user?.id ? (
              <UserProfileQr userId={user.id} displayName={user.user_metadata?.display_name || user.email?.split("@")[0]} />
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to see your QR code</p>
            )}
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {state === "paid" ? (
                <motion.div
                  key="paid"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="space-y-4 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
                  >
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </motion.div>
                  <p className="text-xl font-bold text-foreground">Payment sent!</p>
                  {txId && <p className="text-[11px] text-muted-foreground font-mono">TX: {txId.slice(0, 16)}…</p>}
                  <button type="button" onClick={() => navigate("/wallet/hub", { replace: true })} className="mt-5 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform">
                    Done
                  </button>
                </motion.div>
              ) : state === "resolved" && resolvedPayload ? (
                <motion.div key="resolved" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <QrResolvedCard payload={resolvedPayload} openPayment={openPayment} currentUserId={user?.id} currentOrgId={orgId} onReset={handleReset} />
                </motion.div>
              ) : (
                <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
                  {/* Camera viewfinder */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-border/50 bg-black/90" style={{ maxWidth: CARD_SIZE }}>
                    <div id={REGION_ID} className="h-full w-full" />

                    {/* Corner markers */}
                    <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg pointer-events-none" />
                    <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg pointer-events-none" />
                    <div className="absolute bottom-12 left-3 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg pointer-events-none" />
                    <div className="absolute bottom-12 right-3 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg pointer-events-none" />

                    {/* GREEN LASER SCAN LINE */}
                    {(state === "scanning" || state === "starting") && (
                      <div
                        className="absolute left-3 right-3 h-0.5 pointer-events-none z-10"
                        style={{
                          background: "linear-gradient(90deg, transparent, hsl(142 70% 50%), hsl(142 80% 60%), hsl(142 70% 50%), transparent)",
                          boxShadow: "0 0 8px hsl(142 70% 50% / 0.6), 0 0 20px hsl(142 70% 50% / 0.3)",
                          animation: "qr-laser-scan 2.5s ease-in-out infinite",
                        }}
                      />
                    )}

                    {/* Status bar */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-background/80 py-2.5 backdrop-blur-sm">
                      {state === "scanning" || state === "starting" ? (
                        <Camera className="h-4 w-4 animate-pulse text-primary" />
                      ) : state === "paying" ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <CameraOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-foreground">
                        {state === "idle" && "Initializing…"}
                        {state === "starting" && "Starting camera…"}
                        {state === "scanning" && "Point at QR code"}
                        {state === "paying" && "Processing payment…"}
                        {state === "stopped" && "Scanner stopped"}
                        {state === "error" && "Scanner error"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 w-full max-w-[320px] space-y-3">
                    {error && <p className="text-center text-sm text-destructive">{error}</p>}

                    <div className="flex flex-col gap-2">
                      {!cameraRequested || state === "idle" ? (
                        <button type="button" onClick={() => { handleReset(); void handleStartCamera(); }}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground active:scale-[0.97] transition-transform">
                          <Camera className="h-4 w-4" /> Start camera
                        </button>
                      ) : null}

                      {(state === "error" || state === "stopped") && (
                        <button type="button" onClick={() => { handleReset(); void handleStartCamera(selectedCameraId || undefined); }}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground active:scale-[0.97] transition-transform">
                          <RefreshCcw className="h-4 w-4" /> Retry camera
                        </button>
                      )}

                      {cameraDevices.length >= 2 && (
                        <button type="button" onClick={() => void handleSwitchCamera()}
                          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.97] transition-transform">
                          <Camera className="h-4 w-4" /> Switch camera
                        </button>
                      )}

                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground active:scale-[0.97] transition-transform">
                        <Upload className="h-4 w-4" /> Upload QR image
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file); e.target.value = ""; }} />
                    </div>
                  </div>

                  <div id="qr-file-upload-region" className="hidden" />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Laser animation keyframes */}
      <style>{`
        @keyframes qr-laser-scan {
          0%, 100% { top: 15%; opacity: 0.4; }
          50% { top: 70%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
