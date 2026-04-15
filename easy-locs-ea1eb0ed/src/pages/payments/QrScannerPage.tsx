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
import { generateIdempotencyKey, isDuplicatePayment, recordPaymentAttempt } from "@/lib/merchant-qr/merchant-qr-engine";
import { lookupShopBySlug } from "@/repositories/qr-payment.repository";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { useAuth } from "@/contexts/AuthContext";
import { QrResolvedCard } from "@/components/qr/QrResolvedCard";
import ReceiveQrPanel from "@/components/wallet/ReceiveQrPanel";
import { toast } from "sonner";
import { requestMediaStream } from "@/lib/device/permissions";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumPaymentSuccess } from "@/components/pay/PremiumPaymentSuccess";
import { playPremiumSuccessBeep, hapticPremiumSuccess } from "@/lib/scan/feedback";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

type ScanState = "idle" | "starting" | "scanning" | "paying" | "paid" | "stopped" | "error" | "resolved";
type TabMode = "scan" | "myqr";
type PendingQrPayment = {
  kind: "user" | "shop";
  recipientId: string;
  recipientName: string;
  walletId: string;
  currency: string;
  amount: number | null;
  contextId: string;
  payload: UniversalQrPayload;
  startedAt: number;
  timings: { decodeMs: number; recipientResolveMs: number; walletResolveMs: number };
};

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
  useUiEngine("payments-qrscannerpage");
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
  const [pendingPayment, setPendingPayment] = useState<PendingQrPayment | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [cameraDevices, setCameraDevices] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [cameraRequested, setCameraRequested] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState("");

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

  const getRearCamera = useCallback((cams: Array<{ id: string; label: string }>) => {
    return cams.find(c => /back|rear|environment|wide|ultra|main|world/i.test(c.label));
  }, []);

  const bestCamera = useCallback((cams: Array<{ id: string; label: string }>, preferred?: string | null) => {
    if (!cams.length) return "";
    const rear = getRearCamera(cams);
    if (rear) return rear.id;
    if (preferred) {
      const preferredCam = cams.find(c => c.id === preferred);
      if (preferredCam && /back|rear|environment|wide|ultra|main|world/i.test(preferredCam.label)) return preferredCam.id;
    }
    if (selectedCameraId && cams.some(c => c.id === selectedCameraId)) return selectedCameraId;
    if (preferred && cams.some(c => c.id === preferred)) return preferred;
    return rear?.id || cams[cams.length - 1]?.id || cams[0].id;
  }, [getRearCamera, selectedCameraId]);

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

  const [payStepLabel, setPayStepLabel] = useState("");

  const handleQrResult = useCallback(async (raw: string) => {
    const t0 = performance.now();

    const payload = decodeQr(raw);
    const decodeMs = performance.now() - t0;

    if (!payload) {
      platformBus.emit("qr:scan_failed", { raw, reason: "unsupported_format" }, "system");
      setE("Unsupported QR format"); setS("error"); return;
    }
    if (isExpired(payload)) {
      platformBus.emit("qr:scan_expired", { action: payload.action }, "system");
      setE("QR code expired"); setS("error"); return;
    }

    platformBus.emit("qr:scan_decoded", { action: payload.action, raw }, "system");

    const completePayment = async (draft: PendingQrPayment, amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) {
        setE("Missing amount");
        setS("error");
        return;
      }
      // ── Duplicate payment protection ──
      const idempotencyKey = generateIdempotencyKey(
        user?.id || "anon",
        draft.recipientId,
        amount,
        draft.contextId,
      );
      if (isDuplicatePayment(idempotencyKey)) {
        setE("Duplicate payment detected — please wait 30s before retrying");
        setS("error");
        return;
      }
      recordPaymentAttempt(idempotencyKey);
      setPayStepLabel("Opening payment…");
      setS("paying");
      const tPayStart = performance.now();
      const result = await openPaymentRef.current({
        amount,
        currency: draft.currency,
        title: `Pay ${draft.recipientName}`,
        subtitle: draft.kind === "shop" ? "Merchant payment" : "QR payment",
        recipientId: draft.recipientId,
        recipientName: draft.recipientName,
        contextType: draft.kind === "shop" ? "shop" : draft.payload.action === "pay_c2c" ? "c2c_purchase" : "generic",
        contextId: draft.contextId,
        metadata: {
          source: "qr_scan",
          qr_type: draft.payload.action,
          resolved_wallet_id: draft.walletId,
          qr_branch: draft.amount && draft.amount > 0 ? "fixed_amount" : "manual_amount",
          ...(draft.payload.action === "pay_c2c" ? { transactionType: "c2c_purchase" } : {}),
        },
      });
      if (!mountedRef.current) return;
      if (result.ok) {
        if (draft.payload.action === "pay_c2c" && result.transactionId) {
          const c2cPl = draft.payload as import("@/lib/qr-engine").PayC2CQr;
          try {
            const { c2cService: svc } = await import("@/services/domain/c2c.service");
            await svc.confirmPaymentAndMarkSold(c2cPl.listingId, c2cPl.offerId, result.transactionId);
          } catch (err) {
            console.warn("[QR] C2C post-payment automation failed:", err);
          }
        }
        setPendingPayment(null);
        setManualAmount("");
        setSuccessAmount(`${amount} ${draft.currency}`);
        playPremiumSuccessBeep();
        hapticPremiumSuccess();
        setShowPremiumSuccess(true);
        setTimeout(() => {
          setShowPremiumSuccess(false);
          setTxId(result.transactionId || "");
          setState("paid");
        }, 1600);
      } else if (result.error !== "Cancelled") {
        setE(result.error || "Payment failed");
        setS("error");
      } else {
        setS("idle");
        handledRef.current = false;
      }
    };

    if (payload.action === "pay_user") {
      if (!payload.userId?.trim()) {
        setE("Invalid QR"); setS("error"); return;
      }
      setPayStepLabel("Verifying payment…");
      setS("paying");
      try {
        const resolved = await withTimeout(
          resolvePayTarget({ userId: payload.userId, currency: payload.currency || "AED" }),
          6000,
          "Request timeout"
        );
        const recipientName = resolved.displayName?.trim();
        if (!resolved.targetUserId) { setE("Recipient not found"); setS("error"); return; }
        if (!recipientName) { setE("Recipient name unavailable"); setS("error"); return; }
        if (resolved.walletStatus === "locked") { toast.error("Recipient's wallet is currently locked"); setE("Recipient wallet is locked"); setS("error"); return; }
        if (resolved.walletStatus === "missing" || !resolved.targetWalletId) { toast.error("Could not set up payment — recipient wallet unavailable. Please try again."); setE("Recipient has no active wallet"); setS("error"); return; }
        if (user?.id && resolved.targetUserId === user.id) { setE("Cannot pay yourself"); setS("error"); return; }

        const draft: PendingQrPayment = {
          kind: "user",
          recipientId: resolved.targetUserId,
          recipientName,
          walletId: resolved.targetWalletId,
          currency: resolved.currency || payload.currency || "AED",
          amount: typeof payload.amount === "number" && payload.amount > 0 ? payload.amount : null,
          contextId: resolved.targetUserId,
          payload,
          startedAt: t0,
          timings: {
            decodeMs,
            recipientResolveMs: resolved.timings?.recipientResolveMs ?? 0,
            walletResolveMs: resolved.timings?.walletResolveMs ?? 0,
          },
        };

        if (draft.amount) {
          await completePayment(draft, draft.amount);
        } else {
          setPendingPayment(draft);
          setManualAmount("");
          setPayStepLabel("Amount required");
          setS("resolved");
        }
      } catch (err) {
        setE(err instanceof Error ? err.message : "Recipient not found");
        setS("error");
      }
      return;
    }

    if (payload.action === "pay_shop") {
      if (!payload.shopSlug?.trim()) {
        setE("Invalid QR"); setS("error"); return;
      }
      setPayStepLabel("Loading merchant…");
      setS("paying");
      try {
        const shopData = await withTimeout(
          lookupShopBySlug(payload.shopSlug!),
          5000,
          "Request timeout"
        );
        const shopOwnerId = shopData?.user_id as string | undefined;
        const shopName = shopData?.name?.trim() as string | undefined;
        if (!shopOwnerId) { setE("Merchant not found"); setS("error"); return; }
        if (!shopName) { setE("Merchant name unavailable"); setS("error"); return; }

        const resolved = await withTimeout(
          resolvePayTarget({ userId: shopOwnerId, currency: payload.currency || "AED" }),
          6000,
          "Request timeout"
        );
        if (resolved.walletStatus === "locked") { setE("Merchant wallet is locked"); setS("error"); return; }
        if (resolved.walletStatus === "missing" || !resolved.targetWalletId) { setE("Merchant has no active wallet"); setS("error"); return; }

        const draft: PendingQrPayment = {
          kind: "shop",
          recipientId: shopOwnerId,
          recipientName: shopName,
          walletId: resolved.targetWalletId,
          currency: resolved.currency || payload.currency || "AED",
          amount: typeof payload.amount === "number" && payload.amount > 0 ? payload.amount : null,
          contextId: payload.shopSlug,
          payload,
          startedAt: t0,
          timings: {
            decodeMs,
            recipientResolveMs: resolved.timings?.recipientResolveMs ?? 0,
            walletResolveMs: resolved.timings?.walletResolveMs ?? 0,
          },
        };

        if (draft.amount) {
          await completePayment(draft, draft.amount);
        } else {
          setPendingPayment(draft);
          setManualAmount("");
          setPayStepLabel("Amount required");
          setS("resolved");
        }
      } catch (err) {
        setE(err instanceof Error ? err.message : "Merchant not found");
        setS("error");
      }
      return;
    }

    if (payload.action === "profile" || payload.action === "add_contact" || payload.action === "shop") {
      setResolvedPayload(payload); setS("resolved"); return;
    }

    if (payload.action === "pay_c2c") {
      const c2cPayload = payload as import("@/lib/qr-engine").PayC2CQr;
      try {
        setPayStepLabel("Verifying C2C offer…");
        setS("paying");

        const { c2cService: svc } = await import("@/services/domain/c2c.service");
        const validation = await svc.validateC2CPaymentRequest(
          c2cPayload.listingId,
          c2cPayload.offerId,
          c2cPayload.sellerId,
          c2cPayload.amount,
          c2cPayload.currency || "EUR",
          user?.id || "",
        );
        if (!validation.valid) {
          setE(validation.reason);
          setS("error");
          return;
        }

        const resolvedTarget = await resolvePayTarget({ userId: c2cPayload.sellerId });
        if (!resolvedTarget || !resolvedTarget.targetWalletId) { setE("Seller wallet not found"); setS("error"); return; }
        const draft: PendingQrPayment = {
          kind: "user",
          recipientId: c2cPayload.sellerId,
          recipientName: resolvedTarget.displayName || "Seller",
          walletId: resolvedTarget.targetWalletId,
          currency: c2cPayload.currency || "EUR",
          amount: c2cPayload.amount,
          contextId: `c2c_${c2cPayload.listingId}_${c2cPayload.offerId}`,
          payload,
          startedAt: performance.now(),
          timings: {
            decodeMs,
            recipientResolveMs: resolvedTarget.timings?.recipientResolveMs ?? 0,
            walletResolveMs: resolvedTarget.timings?.walletResolveMs ?? 0,
          },
        };
        if (c2cPayload.amount > 0) {
          await completePayment(draft, c2cPayload.amount);
        } else {
          setPendingPayment(draft);
          setManualAmount("");
          setPayStepLabel("Enter payment amount");
          setS("resolved");
        }
      } catch (err) {
        setE(err instanceof Error ? err.message : "C2C payment error");
        setS("error");
      }
      return;
    }

    const route = resolveRoute(payload);
    if (route) {
      platformBus.emit("qr:navigation", { action: payload.action, route }, "system");
      navigateRef.current(route, { replace: true }); return;
    }
    setE("Unsupported QR format"); setS("error");
  }, [setE, setS, user?.id]);

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
      const rearCam = getRearCamera(cams);
      const camId = rearCam?.id || bestCamera(cams, preferredDeviceId || grantedId);
      if (mountedRef.current) setSelectedCameraId(camId);
      if (!mountedRef.current || opRef.current !== startOp) return;

      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner;

      const cfg = { fps: 15, qrbox: { width: QR_BOX, height: QR_BOX }, disableFlip: false, videoConstraints: { facingMode: { ideal: "environment" }, focusMode: "continuous" as any, width: { ideal: 1280 }, height: { ideal: 720 } } };

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
        if (camId) {
          await doStart({ deviceId: { exact: camId } }, "selected-device");
        } else {
          try {
            await doStart({ facingMode: { exact: "environment" } }, "environment-exact");
          } catch {
            if (rearCam?.id) {
              await Promise.resolve(scanner.clear()).catch(() => {});
              scannerRef.current = scanner;
              if (ios) await new Promise(r => setTimeout(r, 200));
              await doStart({ deviceId: { exact: rearCam.id } }, "rear-device");
            } else if (camId) {
              await Promise.resolve(scanner.clear()).catch(() => {});
              scannerRef.current = scanner;
              if (ios) await new Promise(r => setTimeout(r, 200));
              await doStart({ deviceId: { exact: camId } }, "preferred-device");
            } else {
              throw new Error("No rear camera available");
            }
          }
        }
      } catch {
        try {
          await Promise.resolve(scanner.clear()).catch(() => {});
          scannerRef.current = scanner;
          if (ios) await new Promise(r => setTimeout(r, 200));
          await doStart({ facingMode: { ideal: "environment" } }, "environment-ideal");
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
      }

      if (!mountedRef.current || opRef.current !== startOp) { await clearScanner("stale", false); return; }
      startedRef.current = true; startingRef.current = false;
      setS("scanning");
    } catch (err) {
      resetFlags();
      setE(err instanceof Error ? err.message : "Camera error"); setS("error");
    }
  }, [bestCamera, clearScanner, getRearCamera, handleQrResult, ios, refreshCameras, secure, selectedCameraId, setE, setS, resetFlags]);

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
    setPendingPayment(null); setManualAmount("");
    setPayStepLabel(""); setState("idle"); handledRef.current = false;
  };

  const handleStartCamera = async (pid?: string) => {
    setCameraRequested(true);
    await startScanner(pid);
  };

  const isActive = state === "scanning" || state === "starting";

  return (
    <SubPageShell>
      <div className="fixed inset-0 z-fullscreen flex flex-col bg-black">
      <PremiumPaymentSuccess
        open={showPremiumSuccess}
        logoUrl="/easylocs-logo.png"
        amount={successAmount}
      />

      {tab === "scan" && (state === "scanning" || state === "starting" || state === "idle") ? (
        <>
          <div className="absolute inset-0 z-0">
            <div id={REGION_ID} className="absolute inset-0 [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full [&>div]:!border-none [&>div>img]:!hidden" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md active:scale-95 transition-transform border border-white/10">
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <div className="qr-status-dot" />
                <span className="text-xs font-bold text-white/80 tracking-wide uppercase">
                  {state === "scanning" ? "Live" : "Starting"}
                </span>
              </div>
              <button type="button" onClick={() => setTab("myqr")} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md active:scale-95 transition-transform border border-white/10">
                <QrCode className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-6">
              <div className="relative w-full max-w-[300px] aspect-square">
                <div className="qr-corner qr-corner-tl" />
                <div className="qr-corner qr-corner-tr" />
                <div className="qr-corner qr-corner-bl" />
                <div className="qr-corner qr-corner-br" />

                {isActive && (
                  <>
                    <div className="qr-scan-line-glow" />
                    <div className="qr-scan-line" />
                  </>
                )}

                <div className="qr-grid-overlay" />
                <div className="qr-target-ring" />
                <div className="qr-target-ring-outer" />
                <div className="qr-vignette" />
              </div>
            </div>

            <div className="px-6 pb-8 space-y-4">
              <div className="flex items-center justify-center gap-2 py-2">
                {isActive ? (
                  <Camera className="h-4 w-4 animate-pulse text-emerald-400" />
                ) : (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                )}
                <span className="text-sm font-semibold text-white/90">
                  {state === "scanning" ? "Point at QR code" : "Initializing camera…"}
                </span>
              </div>

              <div className="flex gap-3 justify-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-white active:scale-95 transition-transform">
                  <Upload className="h-4 w-4" /> Upload QR
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); e.target.value = ""; }} />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full bg-background">
          <div className="flex items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 backdrop-blur-sm active:scale-95 transition-transform">
              <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
            </button>
            <h1 className="text-base font-bold text-foreground tracking-tight flex-1">Scan & Pay</h1>
          </div>

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

          <div className="flex flex-1 flex-col items-center justify-center overflow-auto px-4 pb-6">
            {tab === "myqr" ? (
              <div className="w-full max-w-[360px] px-2">
                <ReceiveQrPanel />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {state === "paid" ? (
                  <motion.div key="paid" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.05 }}
                      className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </motion.div>
                    <p className="text-xl font-bold text-foreground">Payment sent!</p>
                    {txId && <p className="text-[11px] text-muted-foreground font-mono">TX: {txId.slice(0, 16)}…</p>}
                    <button type="button" onClick={() => navigate("/wallet", { replace: true })}
                      className="mt-4 rounded-2xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform">
                      Done
                    </button>
                  </motion.div>
                ) : state === "resolved" && pendingPayment ? (
                  <motion.div key="manual-pay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[340px] rounded-[28px] overflow-hidden shadow-xl">
                    <div className="p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, hsl(226 24% 14%), hsl(226 22% 18%))" }}>
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--accent) / 0.15)" }}>
                        <span className="text-xs font-bold" style={{ color: "hsl(var(--accent))" }}>
                          {pendingPayment.recipientName?.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold line-clamp-1 break-words" style={{ color: "hsl(0 0% 100%)" }}>{pendingPayment.recipientName}</p>
                        <p className="text-[10px]" style={{ color: "hsl(0 0% 100% / 0.45)" }}>{pendingPayment.kind === "shop" ? "Merchant" : "User"} · {pendingPayment.currency}</p>
                      </div>
                    </div>
                    <div className="bg-card p-5 space-y-4">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Enter amount</p>
                      <div className="flex flex-wrap gap-2">
                        {[5, 10, 20, 50, 100, 250].map(val => {
                          const active = manualAmount === String(val);
                          return (
                            <button key={val} type="button"
                              onClick={() => setManualAmount(prev => prev === String(val) ? "" : String(val))}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                              style={{
                                background: active ? "hsl(var(--accent))" : "hsl(var(--muted) / 0.5)",
                                color: active ? "hsl(226 24% 14%)" : "hsl(var(--foreground))",
                                border: active ? "none" : "1px solid hsl(var(--border) / 0.3)",
                              }}>
                              {val}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        placeholder="Custom amount"
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-lg font-semibold text-foreground outline-none"
                        style={{ fontSize: "16px" }}
                      />
                      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={handleReset} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground active:scale-[0.97] transition-transform">Cancel</button>
                        <button
                          type="button"
                          onClick={async () => {
                            const amount = Number(manualAmount);
                            if (!Number.isFinite(amount) || amount <= 0) { setE("Missing amount"); return; }
                            if (pendingPayment.payload.action === "pay_c2c") {
                              const c2cPl = pendingPayment.payload as import("@/lib/qr-engine").PayC2CQr;
                              const { c2cService: svc } = await import("@/services/domain/c2c.service");
                              const validation = await svc.validateC2CPaymentRequest(c2cPl.listingId, c2cPl.offerId, c2cPl.sellerId, amount, c2cPl.currency || "EUR", user?.id || "");
                              if (!validation.valid) { setE(validation.reason); return; }
                            }
                            const iKey = generateIdempotencyKey(user?.id || "anon", pendingPayment.recipientId, amount, pendingPayment.contextId);
                            if (isDuplicatePayment(iKey)) { setE("Duplicate payment — wait 30s"); return; }
                            recordPaymentAttempt(iKey);
                            setError(""); setPayStepLabel("Opening payment…"); setState("paying");
                            const result = await openPaymentRef.current({
                              amount, currency: pendingPayment.currency,
                              title: `Pay ${pendingPayment.recipientName}`,
                              subtitle: pendingPayment.kind === "shop" ? "Merchant payment" : "QR payment",
                              recipientId: pendingPayment.recipientId, recipientName: pendingPayment.recipientName,
                              contextType: pendingPayment.kind === "shop" ? "shop" : pendingPayment.payload.action === "pay_c2c" ? "c2c_purchase" : "generic",
                              contextId: pendingPayment.contextId,
                              metadata: { source: "qr_scan", qr_type: pendingPayment.payload.action, resolved_wallet_id: pendingPayment.walletId, qr_branch: "manual_amount", ...(pendingPayment.payload.action === "pay_c2c" ? { transactionType: "c2c_purchase" } : {}) },
                            });
                            if (result.ok) {
                              if (pendingPayment.payload.action === "pay_c2c" && result.transactionId) {
                                const c2cPl = pendingPayment.payload as import("@/lib/qr-engine").PayC2CQr;
                                try { const { c2cService: svc } = await import("@/services/domain/c2c.service"); await svc.confirmPaymentAndMarkSold(c2cPl.listingId, c2cPl.offerId, result.transactionId); } catch (err) { console.warn("[QR] C2C post-payment failed:", err); }
                              }
                              setPendingPayment(null); setManualAmount("");
                              setSuccessAmount(`${amount} ${pendingPayment.currency}`);
                              playPremiumSuccessBeep(); hapticPremiumSuccess();
                              setShowPremiumSuccess(true);
                              setTimeout(() => { setShowPremiumSuccess(false); setTxId(result.transactionId || ""); setState("paid"); }, 1600);
                            } else if (result.error !== "Cancelled") { setError(result.error || "Payment failed"); setState("error"); }
                            else { setState("idle"); handledRef.current = false; }
                          }}
                          className="rounded-2xl px-4 py-3 text-sm font-bold active:scale-[0.97] transition-transform"
                          style={{ background: "hsl(var(--accent))", color: "hsl(226 24% 14%)" }}>
                          Continue
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : state === "resolved" && resolvedPayload ? (
                  <motion.div key="resolved" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <QrResolvedCard payload={resolvedPayload} openPayment={openPayment} currentUserId={user?.id} currentOrgId={orgId} onReset={handleReset} />
                  </motion.div>
                ) : (
                  <motion.div key="scanner-fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
                    <div className="relative w-full aspect-square overflow-hidden rounded-[28px] bg-black/95" style={{ maxWidth: 320 }}>
                      <div id={`${REGION_ID}-fb`} className="absolute inset-0" />
                      <div className="qr-corner qr-corner-tl" />
                      <div className="qr-corner qr-corner-tr" />
                      <div className="qr-corner qr-corner-bl" />
                      <div className="qr-corner qr-corner-br" />
                      <div className="qr-vignette" />
                    </div>

                    <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-muted/40 backdrop-blur-sm">
                      {state === "paying" ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <CameraOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-semibold text-foreground">
                        {state === "paying" && (payStepLabel || "Processing…")}
                        {state === "stopped" && "Stopped"}
                        {state === "error" && "Error"}
                      </span>
                    </div>

                    {state === "paying" && (
                      <button type="button" onClick={handleReset} className="mt-2 text-xs font-semibold text-muted-foreground underline active:scale-95 transition-transform">Cancel</button>
                    )}

                    <div className="mt-4 w-full space-y-2" style={{ maxWidth: 320 }}>
                      {error && <p className="text-center text-sm text-destructive font-medium">{error}</p>}
                      {(!cameraRequested || state === "idle") && (
                        <button type="button" onClick={() => { handleReset(); void handleStartCamera(); }}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform">
                          <Camera className="h-4 w-4" /> Start camera
                        </button>
                      )}
                      {(state === "error" || state === "stopped") && (
                        <button type="button" onClick={() => { handleReset(); void handleStartCamera(selectedCameraId || undefined); }}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground active:scale-[0.97] transition-transform">
                          <RefreshCcw className="h-4 w-4" /> Retry
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/10 px-3 py-3 text-xs font-bold text-foreground active:scale-[0.97] transition-transform">
                          <Upload className="h-3.5 w-3.5" /> Upload QR
                        </button>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); e.target.value = ""; }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      <div id="qr-file-upload-region" className="hidden" />
      </div>
    </SubPageShell>
  );
}
