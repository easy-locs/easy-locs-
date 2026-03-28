/**
 * useQrScannerEngine — Atomic: camera lifecycle, QR decode, and scan state management.
 * Extracts hardware interaction from QrScannerPage.tsx.
 */
import { useCallback, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export type ScanState = "idle" | "starting" | "scanning" | "paying" | "paid" | "stopped" | "error" | "resolved";

const REGION_ID = "qr-reader-region";
const QR_BOX = 260;

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function useQrScannerEngine() {
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

  const setS = useCallback((s: ScanState) => { if (mountedRef.current) setState(s); }, []);
  const setE = useCallback((m: string) => { if (mountedRef.current) setError(m); }, []);

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      if (mountedRef.current) setCameraDevices(cams);
      return cams;
    } catch { return []; }
  }, []);

  const getRearCamera = useCallback((cams: { id: string; label: string }[]) => {
    return cams.find((c) => /back|rear|environment|wide|ultra|main|world/i.test(c.label));
  }, []);

  const bestCamera = useCallback((cams: { id: string; label: string }[], preferred?: string | null) => {
    if (!cams.length) return "";
    const rear = getRearCamera(cams);
    if (rear) return rear.id;
    if (preferred && cams.some((c) => c.id === preferred)) return preferred;
    if (selectedCameraId && cams.some((c) => c.id === selectedCameraId)) return selectedCameraId;
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

  return {
    scannerRef, mountedRef, startingRef, startedRef, stoppingRef, handledRef, opRef,
    state, error, cameraDevices, selectedCameraId, ios,
    setS, setE, setState, setError, setCameraDevices, setSelectedCameraId,
    refreshCameras, getRearCamera, bestCamera, resetFlags, clearScanner,
    REGION_ID, QR_BOX,
  };
}
