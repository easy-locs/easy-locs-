/**
 * QrScannerPage — Futuristic pro scanner. Single clean frame, no duplicates.
 * 30fps decode, instant beep+haptic. Premium UI.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CameraOff, RefreshCcw, CheckCircle2, ScanLine, QrCode, Upload } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeQr, resolveRoute, isExpired, type UniversalQrPayload } from "@/lib/qr-engine";
import { playScanBeep } from "@/lib/audio/scan-beep";
import { haptic } from "@/lib/haptics";
import { platformBus } from "@/lib/shared/platform-bus";
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
const QR_BOX = 260;

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    p.finally(() => { if (t) clearTimeout(t); }),
    new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); }),
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

  const setS = useCallback((s: ScanState) => { if (mountedRef.current) setState(s); }, []);
  const setE = useCallback((m: string) => { if (mountedRef.current) setError(m); }, []);

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      if (mountedRef.current) setCameraDevices(cams);
      return cams;
    } catch { return []; }
  }, []);

  const bestCamera = useCallback((cams: Array<{ id: string; label: string }>, preferred?: string | null) => {
    if (!cams.length) return "";
    if (preferred && cams.some(c => c.id === preferred)) return preferred;
    if (selectedCameraId && cams.some(c => c.id === selectedCameraId)) return selectedCameraId;
    const rear = cams.find(c => /back|rear|environment|wide|ultra/i.test(c.label));
    return rear?.id || cams[cams.length - 1]?.id || cams[0].id;
  }, [selectedCameraId]);

  const resetFlags = useCallback(() => {
    startingRef.current = false;
    startedRef.current = false;
    stoppingRef.current = false;
    handledRef.current = false;
    scannerRef.current = null;
  }, []);

  const clearScanner = useCallback(async (_reason: string, updateState = true) => {
    const sc = scannerRef.current;
    ++opRef.current;
    if (!sc) { resetFlags(); if (updateState && mountedRef.current) setState("stopped"); return; }
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    try { if (startedRef.current) await sc.stop(); } catch {}
    try { await Promise.resolve(sc.clear()); } catch {}
    resetFlags();
    if (updateState && mountedRef.current) setState("stopped");
  }, [resetFlags]);

  const handleQrResult = useCallback(async (raw: string) => {
    const payload = decodeQr(raw);
    if (!payload) {
      platformBus.emit("qr.scan.failed", { raw, reason: "unsupported_format" }, "system");
      setE("Unsupported QR format"); setS("error"); return;
    }
    if (isExpired(payload)) {
      platformBus.emit("qr.scan.expired", { action: payload.action }, "system");
      setE("QR code expired"); setS("error"); return;
    }

    platformBus.emit("qr.scan.decoded", { action: payload.action, raw }, "system");

    if (payload.action === "pay_user") {
      platformBus.emit("qr.payment.initiated", { action: "pay_user", userId: payload.userId }, "wallet");
      setS("paying");
      let resolved: ResolvedPayTarget;
      try {
        resolved = await resolvePayTarget({ userId: payload.userId, currency: payload.currency || "AED" });
      } catch {
        setE("Could not verify recipient"); setS("error"); return;
      }
      if (resolved.walletStatus === "locked") { setE("Recipient wallet is locked"); setS("error"); return; }

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
        haptic("success"); playScanBeep();
        platformBus.emit("qr.payment.completed", { action: "pay_user", txId: result.transactionId }, "wallet");
      } else if (result.error !== "Cancelled") {
        setError(result.error || "Payment failed"); setState("error");
        platformBus.emit("qr.payment.failed", { action: "pay_user", error: result.error }, "wallet");
      } else {
        setState("idle"); handledRef.current = false;
      }
      return;
    }

    if (payload.action === "pay_shop") {
      setS("paying");
      let shopOwnerId: string | undefined;
      try {
        const { data: shop } = await supabase.from("storefront_pages").select("user_id").eq("slug", payload.shopSlug).maybeSingle();
        shopOwnerId = shop?.user_id || undefined;
      } catch {}
      if (!shopOwnerId) { setE("Shop not found"); setS("error"); return; }
      const result = await openPaymentRef.current({
        amount: payload.amount || 0, currency: payload.currency || "AED",
        title: `Pay ${payload.name || "Shop"}`, subtitle: "QR shop payment",
        recipientId: shopOwnerId, contextType: "shop", contextId: payload.shopSlug,
        metadata: { source: "qr_scan", qr_type: "pay_shop", shopSlug: payload.shopSlug },
      });
      if (!mountedRef.current) return;
      if (result.ok) {
        setTxId(result.transactionId || ""); setState("paid");
        haptic("success"); playScanBeep();
      } else if (result.error !== "Cancelled") {
        setError(result.error || "Payment failed"); setState("error");
      } else {
        setState("idle"); handledRef.current = false;
      }
      return;
    }

    if (payload.action === "profile" || payload.action === "add_contact" || payload.action === "shop") {
      setResolvedPayload(payload); setS("resolved"); return;
    }

    const route = resolveRoute(payload);
    if (route) {
      platformBus.emit("qr.navigation", { action: payload.action, route }, "system");
      navigateRef.current(route, { replace: true }); return;
    }
    setE("Unsupported QR format"); setS("error");
  }, [setE, setS]);

  const handleImageUpload = useCallback(async (file: File) => {
    setS("starting"); setE("");
    try {
      const sc = new Html5Qrcode("qr-file-upload-region", { verbose: false });
      const result = await sc.scanFile(file, false);
      sc.clear();
      if (!result) throw new Error("No QR found");
      playScanBeep(); haptic("success");
      setLastText(result);
      await handleQrResult(result);
    } catch {
      toast.error("No QR code found. Try another image.");
    }
  }, [handleQrResult, setE, setS]);

  const startScanner = useCallback(async (preferredDeviceId?: string) => {
    if (!secure || !navigator.mediaDevices?.getUserMedia) {
      setE("Camera requires HTTPS"); setS("error"); return;
    }
    if (startingRef.current || startedRef.current || stoppingRef.current) return;
    const el = document.getElementById(REGION_ID);
    if (!el) { setE("Scanner container missing"); setS("error"); return; }

    const startOp = ++opRef.current;
    startingRef.current = true;
    handledRef.current = false;
    setE(""); setLastText(""); setTxId("");
    setS("starting");

    try {
      let grantedId = "";
      let tempStream: MediaStream | null = null;
      try {
        tempStream = await requestMediaStream({
          camera: true,
          videoConstraints: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        grantedId = tempStream.getVideoTracks()[0]?.getSettings().deviceId || "";
      } catch (err) {
        const de = err as DOMException;
        if (de?.name === "NotAllowedError") throw new Error("Camera permission denied");
        if (de?.name === "NotFoundError") { setE("No camera — use Upload QR"); setS("error"); startingRef.current = false; return; }
        throw new Error(de?.message || "Camera unavailable");
      } finally {
        tempStream?.getTracks().forEach(t => t.stop());
        if (ios) await new Promise(r => setTimeout(r, 200));
      }

      if (!mountedRef.current || opRef.current !== startOp) return;

      const cams = await refreshCameras();
      const camId = bestCamera(cams, preferredDeviceId || grantedId);
      if (mountedRef.current) setSelectedCameraId(camId);
      if (!mountedRef.current || opRef.current !== startOp) return;

      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner;

      const cfg = { fps: 30, qrbox: { width: QR_BOX, height: QR_BOX }, disableFlip: false };

      const doStart = async (vidCfg: any, label: string) => {
        await withTimeout(scanner.start(vidCfg, cfg, async (text) => {
          if (!mountedRef.current || handledRef.current) return;
          handledRef.current = true;
          playScanBeep(); haptic("success");
          setLastText(text);
          await clearScanner("decode", false);
          await handleQrResult(text);
        }, () => {}), 10000, `Camera timed out (${label})`);
      };

      try {
        if (camId) await doStart({ deviceId: { exact: camId } }, "preferred");
        else await doStart({ facingMode: { ideal: "environment" } }, "facing");
      } catch {
        try {
          await Promise.resolve(scanner.clear()).catch(() => {});
          scannerRef.current = scanner;
          if (ios) await new Promise(r => setTimeout(r, 200));
          await doStart({ facingMode: "environment" }, "fallback");
        } catch {
          resetFlags();
          setE("Camera unavailable — upload QR image"); setS("error"); return;
        }
      }

      if (!mountedRef.current || opRef.current !== startOp) { await clearScanner("stale", false); return; }
      startedRef.current = true; startingRef.current = false;
      setS("scanning");
    } catch (err) {
      resetFlags();
      setE(err instanceof Error ? err.message : "Camera error"); setS("error");
    }
  }, [bestCamera, clearScanner, handleQrResult, ios, refreshCameras, secure, setE, setS, resetFlags]);

  useEffect(() => {
    mountedRef.current = true;
    if (tab === "scan" && secure) {
      const t = setTimeout(() => {
        if (mountedRef.current && !startingRef.current && !startedRef.current) {
          setCameraRequested(true);
          void startScanner();
        }
      }, 150);
      return () => { clearTimeout(t); mountedRef.current = false; void clearScanner("unmount", false); };
    }
    return () => { mountedRef.current = false; void clearScanner("unmount", false); };
  }, [clearScanner, tab, secure, startScanner]);

  useEffect(() => {
    if (tab === "myqr" && (startedRef.current || startingRef.current)) void clearScanner("tab-switch");
  }, [tab, clearScanner]);

  const handleReset = () => {
    setError(""); setLastText(""); setTxId(""); setResolvedPayload(null);
    setState("idle"); handledRef.current = false;
  };

  const handleStartCamera = async (pid?: string) => {
    setCameraRequested(true);
    await startScanner(pid);
  };

  const handleSwitchCamera = async () => {
    const cams = cameraDevices.length ? cameraDevices : await refreshCameras();
    if (!cams.length) { setE("No alternate camera"); setS("error"); return; }
    const idx = cams.findIndex(c => c.id === selectedCameraId);
    const next = cams[(idx + 1 + cams.length) % cams.length];
    await clearScanner("switch", false);
    handleReset();
    await handleStartCamera(next.id);
  };

  const isActive = state === "scanning" || state === "starting";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 backdrop-blur-sm active:scale-95 transition-transform">
          <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
        </button>
        <h1 className="text-base font-black text-foreground tracking-tight flex-1">Scan & Pay</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 p-1 rounded-2xl bg-muted/40 backdrop-blur-sm">
          <button type="button" onClick={() => { setTab("scan"); handleReset(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-[0.97]"
            style={{
              background: tab === "scan" ? "hsl(var(--card))" : "transparent",
              color: tab === "scan" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: tab === "scan" ? "0 2px 12px hsl(var(--primary) / 0.1)" : "none",
            }}>
            <ScanLine className="h-3.5 w-3.5" /> Scan
          </button>
          <button type="button" onClick={() => setTab("myqr")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-[0.97]"
            style={{
              background: tab === "myqr" ? "hsl(var(--card))" : "transparent",
              color: tab === "myqr" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: tab === "myqr" ? "0 2px 12px hsl(var(--primary) / 0.1)" : "none",
            }}>
            <QrCode className="h-3.5 w-3.5" /> My QR
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-auto px-4 pb-6">
        {tab === "myqr" ? (
          <div className="w-full flex flex-col items-center max-w-[320px]">
            {user?.id ? (
              <UserProfileQr userId={user.id} displayName={user.user_metadata?.display_name || user.email?.split("@")[0]} />
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to see your QR</p>
            )}
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {state === "paid" ? (
                <motion.div key="paid" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.05 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  </motion.div>
                  <p className="text-xl font-black text-foreground">Payment sent!</p>
                  {txId && <p className="text-[11px] text-muted-foreground font-mono">TX: {txId.slice(0, 16)}…</p>}
                  <button type="button" onClick={() => navigate("/wallet/hub", { replace: true })}
                    className="mt-4 rounded-2xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform">
                    Done
                  </button>
                </motion.div>
              ) : state === "resolved" && resolvedPayload ? (
                <motion.div key="resolved" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <QrResolvedCard payload={resolvedPayload} openPayment={openPayment} currentUserId={user?.id} currentOrgId={orgId} onReset={handleReset} />
                </motion.div>
              ) : (
                <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
                  {/* ── Single Viewfinder — NO duplicate inner frame ── */}
                  <div className="relative w-full aspect-square overflow-hidden rounded-3xl bg-black/95" style={{ maxWidth: 320 }}>
                    {/* Camera feed */}
                    <div id={REGION_ID} className="absolute inset-0 [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full [&>div]:!border-none [&>div>img]:!hidden" />

                    {/* Hide html5-qrcode's built-in scan region border */}
                    <style>{`
                      #${REGION_ID} > div { border: none !important; box-shadow: none !important; }
                      #${REGION_ID} img[alt="Info icon"] { display: none !important; }
                    `}</style>

                    {/* Single premium corner markers */}
                    <div className="absolute inset-6 pointer-events-none z-20">
                      <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] rounded-tl-xl" style={{ borderColor: "hsl(var(--primary))" }} />
                      <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] rounded-tr-xl" style={{ borderColor: "hsl(var(--primary))" }} />
                      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] rounded-bl-xl" style={{ borderColor: "hsl(var(--primary))" }} />
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] rounded-br-xl" style={{ borderColor: "hsl(var(--primary))" }} />
                    </div>

                    {/* Animated laser line */}
                    {isActive && (
                      <div
                        className="absolute left-8 right-8 h-[2px] pointer-events-none z-30"
                        style={{
                          background: "linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--primary)), transparent)",
                          boxShadow: "0 0 16px hsl(var(--primary) / 0.6), 0 0 32px hsl(var(--primary) / 0.2)",
                          animation: "qr-laser 2s ease-in-out infinite",
                        }}
                      />
                    )}

                    {/* Vignette overlay */}
                    <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.5) 100%)" }} />
                  </div>

                  {/* Status pill */}
                  <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-muted/40 backdrop-blur-sm">
                    {isActive ? (
                      <Camera className="h-3.5 w-3.5 animate-pulse text-primary" />
                    ) : state === "paying" ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <CameraOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-semibold text-foreground">
                      {state === "idle" && "Initializing…"}
                      {state === "starting" && "Starting…"}
                      {state === "scanning" && "Point at QR code"}
                      {state === "paying" && "Processing…"}
                      {state === "stopped" && "Stopped"}
                      {state === "error" && "Error"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 w-full space-y-2" style={{ maxWidth: 320 }}>
                    {error && <p className="text-center text-sm text-destructive font-medium">{error}</p>}

                    {!cameraRequested || state === "idle" ? (
                      <button type="button" onClick={() => { handleReset(); void handleStartCamera(); }}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform">
                        <Camera className="h-4 w-4" /> Start camera
                      </button>
                    ) : null}

                    {(state === "error" || state === "stopped") && (
                      <button type="button" onClick={() => { handleReset(); void handleStartCamera(selectedCameraId || undefined); }}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform">
                        <RefreshCcw className="h-4 w-4" /> Retry
                      </button>
                    )}

                    <div className="flex gap-2">
                      {cameraDevices.length >= 2 && (
                        <button type="button" onClick={() => void handleSwitchCamera()}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/10 px-3 py-3 text-xs font-bold text-foreground active:scale-[0.97] transition-transform">
                          <Camera className="h-3.5 w-3.5" /> Switch
                        </button>
                      )}
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/10 px-3 py-3 text-xs font-bold text-foreground active:scale-[0.97] transition-transform">
                        <Upload className="h-3.5 w-3.5" /> Upload QR
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); e.target.value = ""; }} />
                  </div>

                  <div id="qr-file-upload-region" className="hidden" />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <style>{`
        @keyframes qr-laser {
          0%, 100% { top: 15%; opacity: 0.3; }
          50% { top: 75%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
