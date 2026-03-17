/**
 * QrScannerPage — Mobile-hardened QR scanner.
 * Camera starts only on explicit user tap (required for iOS Safari).
 * Robust lifecycle: no double-start, no race conditions, safe unmount.
 * Temporary debug logs enabled for iPhone/Safari scanner diagnosis.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CameraOff, RefreshCcw, CheckCircle2, Info } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { decodeQr, resolveRoute, isExpired, isSecurityAction } from "@/lib/qr-engine";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";

type ScanState = "idle" | "starting" | "scanning" | "paying" | "paid" | "stopped" | "error";
type PermissionStateLike = "unknown" | "granted" | "denied" | "prompt" | "unsupported";

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

  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [lastText, setLastText] = useState("");
  const [txId, setTxId] = useState("");
  const [permissionState, setPermissionState] = useState<PermissionStateLike>("unknown");
  const [cameraCount, setCameraCount] = useState<number | null>(null);

  const secure = typeof window === "undefined" ? true : window.isSecureContext;
  const ios = isIOS();
  const safari = isSafariBrowser();

  const log = useCallback((event: string, data?: unknown) => {
    if (data !== undefined) {
      console.info(`[qr-scanner] ${event}`, data);
    } else {
      console.info(`[qr-scanner] ${event}`);
    }
  }, []);

  const setStateSafe = useCallback((nextState: ScanState) => {
    if (mountedRef.current) setState(nextState);
  }, []);

  const setErrorSafe = useCallback((message: string) => {
    if (mountedRef.current) setError(message);
  }, []);

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

    if (!scanner) {
      log(`stop/clear skipped (${reason})`, { hasScanner: false, started: startedRef.current, stopping: stoppingRef.current });
      resetRuntimeFlags();
      if (updateState && mountedRef.current) setState("stopped");
      return;
    }

    if (stoppingRef.current) {
      log(`stop/clear skipped (${reason})`, { hasScanner: true, reason: "already stopping" });
      return;
    }

    stoppingRef.current = true;
    log(`stop/clear begin (${reason})`, { started: startedRef.current, opId });

    try {
      if (startedRef.current) {
        await scanner.stop();
        log(`scanner stop success (${reason})`);
      } else {
        log(`scanner stop skipped (${reason})`, { started: false });
      }
    } catch (err) {
      console.warn(`[qr-scanner] scanner stop failed (${reason})`, err);
    }

    try {
      await Promise.resolve(scanner.clear());
      log(`scanner clear success (${reason})`);
    } catch (err) {
      console.warn(`[qr-scanner] scanner clear failed (${reason})`, err);
    }

    resetRuntimeFlags();
    if (updateState && mountedRef.current) {
      setState("stopped");
    }
  }, [log, resetRuntimeFlags]);

  const handleQrResult = useCallback(async (raw: string) => {
    const payload = decodeQrPayload(raw);

    if (payload) {
      if (payload.type === "user_pay") {
        setStateSafe("paying");
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

        if (!mountedRef.current) return;
        if (result.ok) {
          setTxId(result.transactionId || "");
          setState("paid");
        } else {
          setError(result.error || "Payment failed");
          setState("error");
        }
        return;
      }

      if (payload.type === "shop_pay") {
        setStateSafe("paying");
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

        if (!mountedRef.current) return;
        if (result.ok) {
          setTxId(result.transactionId || "");
          setState("paid");
        } else {
          setError(result.error || "Payment failed");
          setState("error");
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

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      try {
        const url = new URL(raw);
        navigateRef.current(`${url.pathname}${url.search}${url.hash}`, { replace: true });
        return;
      } catch {
        // ignore invalid URL payloads
      }
    }

    setErrorSafe("Unsupported QR format");
    setStateSafe("error");
  }, [setErrorSafe, setStateSafe]);

  const resolvePermissionState = useCallback(async () => {
    try {
      if (!("permissions" in navigator) || !navigator.permissions?.query) {
        log("permission API unsupported");
        setPermissionState("unsupported");
        return;
      }

      const result = await navigator.permissions.query({ name: "camera" as PermissionName });
      log("permission state", { state: result.state });
      setPermissionState(result.state as PermissionStateLike);
    } catch (err) {
      console.warn("[qr-scanner] permission query failed", err);
      setPermissionState("unsupported");
    }
  }, [log]);

  const preflightCameraAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API unsupported on this browser.");
    }

    log("preflight getUserMedia begin", { ios, safari });

    let tempStream: MediaStream | null = null;
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      const track = tempStream.getVideoTracks()[0];
      log("permission granted", {
        label: track?.label || "",
        settings: typeof track?.getSettings === "function" ? track.getSettings() : null,
      });
      setPermissionState("granted");
    } catch (err) {
      console.error("[qr-scanner] start failure reason", err);
      const domErr = err as DOMException;
      if (domErr?.name === "NotAllowedError") {
        setPermissionState("denied");
        throw new Error("Camera permission denied. Please allow camera access in Safari settings.");
      }
      if (domErr?.name === "NotFoundError") {
        throw new Error("No camera found on this device.");
      }
      if (domErr?.name === "NotReadableError") {
        throw new Error("Camera is already in use by another app or tab.");
      }
      throw new Error(domErr?.message || "Unable to open the camera.");
    } finally {
      tempStream?.getTracks().forEach((track) => track.stop());
      log("preflight stream stopped");
      if (ios || safari) {
        await wait(250);
      }
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((device) => device.kind === "videoinput");
      setCameraCount(videos.length);
      log("camera devices found", videos.map((device) => ({
        deviceId: device.deviceId,
        label: device.label,
        kind: device.kind,
      })));
    } catch (err) {
      console.warn("[qr-scanner] enumerateDevices failed", err);
    }
  }, [ios, log, safari]);

  const selectCameraId = useCallback(async () => {
    try {
      const cameras = await Html5Qrcode.getCameras();
      setCameraCount(cameras.length);
      log("html5-qrcode cameras found", cameras);

      if (!cameras.length) return null;

      const rear = cameras.find((camera) => /back|rear|environment|wide/i.test(camera.label));
      if (rear) return rear.id;

      return cameras[cameras.length - 1]?.id || cameras[0]?.id || null;
    } catch (err) {
      console.warn("[qr-scanner] Html5Qrcode.getCameras failed", err);
      return null;
    }
  }, [log]);

  const startScanner = useCallback(async () => {
    log("scanner start requested", {
      state,
      secure,
      ios,
      safari,
      starting: startingRef.current,
      started: startedRef.current,
      stopping: stoppingRef.current,
    });

    if (!secure) {
      setPermissionState("denied");
      setErrorSafe("Camera scanning requires HTTPS or a secure app context.");
      setStateSafe("error");
      return;
    }

    if (startingRef.current || startedRef.current || stoppingRef.current) {
      log("scanner start blocked", {
        starting: startingRef.current,
        started: startedRef.current,
        stopping: stoppingRef.current,
      });
      return;
    }

    const el = document.getElementById(REGION_ID);
    if (!el) {
      setErrorSafe("Scanner container not found. Please try again.");
      setStateSafe("error");
      return;
    }

    const startOp = ++opRef.current;
    startingRef.current = true;
    handledRef.current = false;
    setErrorSafe("");
    setLastText("");
    setTxId("");
    setStateSafe("starting");

    try {
      await resolvePermissionState();
      await preflightCameraAccess();
      if (!mountedRef.current || opRef.current !== startOp) return;

      const preferredCameraId = await selectCameraId();
      if (!mountedRef.current || opRef.current !== startOp) return;

      const scanner = new Html5Qrcode(REGION_ID, {
        verbose: false,
      });
      scannerRef.current = scanner;

      const scanConfig = {
        fps: ios ? 6 : 10,
        qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE },
        aspectRatio: 1,
        disableFlip: false,
      };

      const startWithConfig = async (cameraConfig: string | { facingMode: string | { ideal: string } } | { deviceId: { exact: string } }, label: string) => {
        log("scanner start attempt", { label, cameraConfig, scanConfig });
        await scanner.start(
          cameraConfig,
          scanConfig,
          async (decodedText) => {
            if (!mountedRef.current || handledRef.current) return;
            handledRef.current = true;
            log("successful decode", { decodedText });
            setLastText(decodedText);
            await clearScannerInstance("decode", false);
            await handleQrResult(decodedText);
          },
          () => {
            // ignore frame-level decode misses
          }
        );
      };

      try {
        if (preferredCameraId) {
          await startWithConfig({ deviceId: { exact: preferredCameraId } }, "preferred-device");
        } else {
          await startWithConfig({ facingMode: { ideal: "environment" } }, "facingMode-environment");
        }
      } catch (firstErr) {
        console.warn("[qr-scanner] primary start failed", firstErr);
        log("start failure reason", { phase: "primary", error: String(firstErr) });
        await Promise.resolve(scanner.clear()).catch(() => undefined);
        scannerRef.current = scanner;
        await wait(ios ? 250 : 100);
        await startWithConfig({ facingMode: "environment" }, "fallback-environment");
      }

      if (!mountedRef.current || opRef.current !== startOp) {
        await clearScannerInstance("stale-start", false);
        return;
      }

      startedRef.current = true;
      startingRef.current = false;
      stoppingRef.current = false;
      log("scanner start success", { cameraCount, permissionState });
      setStateSafe("scanning");
    } catch (err) {
      console.error("[qr-scanner] start failure reason", err);
      resetRuntimeFlags();

      const message = err instanceof Error ? err.message : "Unable to access camera. Check permissions and HTTPS.";
      setErrorSafe(message);
      setStateSafe("error");
    }
  }, [cameraCount, clearScannerInstance, handleQrResult, ios, log, permissionState, preflightCameraAccess, resolvePermissionState, safari, secure, setErrorSafe, setStateSafe, selectCameraId, state, resetRuntimeFlags]);

  const stopScanner = useCallback(async () => {
    await clearScannerInstance("manual-stop");
  }, [clearScannerInstance]);

  useEffect(() => {
    mountedRef.current = true;
    resolvePermissionState();

    return () => {
      mountedRef.current = false;
      void clearScannerInstance("unmount", false);
    };
  }, [clearScannerInstance, resolvePermissionState]);

  const permissionHint =
    permissionState === "denied"
      ? "Camera access is denied. Enable it in Safari settings, then try again."
      : permissionState === "prompt"
        ? "Safari will ask for camera permission after you tap Start Scanner."
        : permissionState === "unsupported"
          ? "Camera permission status cannot be pre-read on this browser."
          : permissionState === "granted"
            ? "Camera access granted. You can start scanning."
            : "Tap Start Scanner to begin.";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
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
          <p className="text-[11px] text-muted-foreground">Pay, connect, open shop, or resolve request</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-6">
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
            <div className="mb-4 flex w-full max-w-[320px] items-start gap-2 rounded-2xl border border-border bg-card p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>{permissionHint}</p>
                <p>
                  {cameraCount === null ? "Camera devices not checked yet." : `${cameraCount} camera device${cameraCount === 1 ? "" : "s"} found.`}
                  {ios ? " iPhone/iPad mode active." : ""}
                  {safari ? " Safari compatibility mode active." : ""}
                </p>
              </div>
            </div>

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
              <p className="mt-4 max-w-[280px] text-center text-sm text-destructive">{error}</p>
            )}

            {lastText && (
              <p className="mt-3 max-w-[280px] break-all text-center text-[11px] text-muted-foreground">
                {lastText}
              </p>
            )}

            <div className="mt-6 flex w-full max-w-[300px] gap-3">
              <button
                type="button"
                disabled={state === "starting" || state === "scanning" || state === "paying"}
                onClick={startScanner}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
              >
                <span className="flex items-center justify-center gap-2">
                  <Camera className="h-4 w-4" />
                  Start Scanner
                </span>
              </button>
              <button
                type="button"
                disabled={state !== "scanning" && state !== "starting"}
                onClick={() => void stopScanner()}
                className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                <span className="flex items-center justify-center gap-2">
                  <CameraOff className="h-4 w-4" />
                  Stop
                </span>
              </button>
            </div>

            {(state === "error" || state === "stopped") && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setLastText("");
                  setTxId("");
                  setState("idle");
                  handledRef.current = false;
                  log("scanner reset");
                }}
                className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
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
