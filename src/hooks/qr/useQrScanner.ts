/**
 * useQrScanner — Manages camera lifecycle, device selection, scanning state.
 * Extracted from QrScannerPage. Zero DB logic.
 */
import { useCallback, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { requestMediaStream } from "@/lib/device/permissions";
import { playScanBeep } from "@/lib/audio/scan-beep";
import { haptic } from "@/lib/haptics";

export type ScanState = "idle" | "starting" | "scanning" | "paying" | "paid" | "stopped" | "error" | "resolved";

const QR_BOX = 260;
const REGION_ID = "qr-reader-region";

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

export function useQrScanner(onDecoded: (text: string) => Promise<void>) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const startedRef = useRef(false);
  const stoppingRef = useRef(false);
  const handledRef = useRef(false);
  const opRef = useRef(0);

  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [cameraDevices, setCameraDevices] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const ios = isIOS();
  const secure = typeof window === "undefined" ? true : window.isSecureContext;

  const setS = useCallback((s: ScanState) => { if (mountedRef.current) setState(s); }, []);
  const setE = useCallback((m: string) => { if (mountedRef.current) setError(m); }, []);

  const resetFlags = useCallback(() => {
    startingRef.current = false;
    startedRef.current = false;
    stoppingRef.current = false;
    handledRef.current = false;
    scannerRef.current = null;
  }, []);

  const clearScanner = useCallback(async (updateState = true) => {
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

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === "videoinput").map((d, i) => ({
        id: d.deviceId, label: d.label || `Camera ${i + 1}`,
      }));
      if (mountedRef.current) setCameraDevices(cams);
      return cams;
    } catch { return []; }
  }, []);

  const getRearCamera = useCallback((cams: { id: string; label: string }[]) =>
    cams.find(c => /back|rear|environment|wide|ultra|main|world/i.test(c.label)), []);

  const bestCamera = useCallback((cams: { id: string; label: string }[], preferred?: string | null) => {
    if (!cams.length) return "";
    const rear = getRearCamera(cams);
    if (rear) return rear.id;
    if (preferred && cams.some(c => c.id === preferred)) return preferred;
    if (selectedCameraId && cams.some(c => c.id === selectedCameraId)) return selectedCameraId;
    return rear?.id || cams[cams.length - 1]?.id || cams[0].id;
  }, [getRearCamera, selectedCameraId]);

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
    setE(""); setS("starting");

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
      const camId = getRearCamera(cams)?.id || bestCamera(cams, preferredDeviceId || grantedId);
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
          await clearScanner(false);
          await onDecoded(text);
        }, () => {}), 10000, `Camera timed out (${label})`);
      };

      try {
        if (camId) { await doStart({ deviceId: { exact: camId } }, "device"); }
        else { await doStart({ facingMode: { ideal: "environment" } }, "env"); }
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

      if (!mountedRef.current || opRef.current !== startOp) { await clearScanner(false); return; }
      startedRef.current = true; startingRef.current = false;
      setS("scanning");
    } catch (err) {
      resetFlags();
      setE(err instanceof Error ? err.message : "Camera error"); setS("error");
    }
  }, [bestCamera, clearScanner, getRearCamera, ios, onDecoded, refreshCameras, secure, selectedCameraId, setE, setS, resetFlags]);

  const handleImageUpload = useCallback(async (file: File) => {
    setS("starting"); setE("");
    try {
      const sc = new Html5Qrcode("qr-file-upload-region", { verbose: false });
      const result = await sc.scanFile(file, false);
      sc.clear();
      if (!result) throw new Error("No QR found");
      playScanBeep(); haptic("success");
      await onDecoded(result);
    } catch {
      setE("No QR code found");
      setS("error");
    }
  }, [onDecoded, setE, setS]);

  const switchCamera = useCallback(async () => {
    const cams = cameraDevices.length ? cameraDevices : await refreshCameras();
    if (!cams.length) { setE("No alternate camera"); setS("error"); return; }
    const idx = cams.findIndex(c => c.id === selectedCameraId);
    const next = cams[(idx + 1 + cams.length) % cams.length];
    await clearScanner(false);
    handledRef.current = false;
    await startScanner(next.id);
  }, [cameraDevices, clearScanner, refreshCameras, selectedCameraId, setE, setS, startScanner]);

  return {
    state, error, cameraDevices, selectedCameraId,
    setState: setS, setError: setE,
    startScanner, clearScanner, switchCamera,
    handleImageUpload, handledRef, mountedRef,
    isActive: state === "scanning" || state === "starting",
    secure,
    REGION_ID,
  };
}
