/**
 * QR Pay — Generate and scan QR codes that resolve to UnifiedPayment overlay.
 * Supports: user payment, shop payment, payment request.
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import QRCodeReact from "react-qr-code";
import { Camera, X, QrCode, User, Store, Receipt } from "lucide-react";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { fetchPaymentRequest } from "@/payments/request-money";
import { useAuth } from "@/contexts/AuthContext";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

export type QrPayloadType = "user" | "shop" | "request";

export interface QrPayload {
  type: QrPayloadType;
  id: string;
  amount?: number;
  currency?: string;
  name?: string;
}

/** Encode a QR payload into a URL */
export function encodeQrUrl(payload: QrPayload): string {
  const params = new URLSearchParams();
  params.set("t", payload.type);
  params.set("id", payload.id);
  if (payload.amount) params.set("a", String(payload.amount));
  if (payload.currency) params.set("c", payload.currency);
  if (payload.name) params.set("n", payload.name);
  return `${BASE_URL}/pay/qr?${params.toString()}`;
}

/** Decode a QR URL back into a payload */
export function decodeQrUrl(url: string): QrPayload | null {
  try {
    const u = new URL(url);
    const t = u.searchParams.get("t") as QrPayloadType;
    const id = u.searchParams.get("id");
    if (!t || !id) return null;
    return {
      type: t,
      id,
      amount: u.searchParams.get("a") ? Number(u.searchParams.get("a")) : undefined,
      currency: u.searchParams.get("c") || undefined,
      name: u.searchParams.get("n") || undefined,
    };
  } catch {
    return null;
  }
}

/** QR Code display component */
export function PaymentQrCode({
  payload,
  size = 200,
  className = "",
}: {
  payload: QrPayload;
  size?: number;
  className?: string;
}) {
  const url = encodeQrUrl(payload);
  const Icon = payload.type === "user" ? User : payload.type === "shop" ? Store : Receipt;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="rounded-2xl border border-border bg-white p-4">
        <QRCodeReact value={url} size={size} level="M" />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{payload.name || payload.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}

/** QR Scanner + resolver — scans QR, decodes, opens UnifiedPayment */
export function QrPayScanner({
  onClose,
  onResolved,
}: {
  onClose: () => void;
  onResolved?: (payload: QrPayload) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState("");
  const { openPayment } = useUnifiedPayment();
  const { user } = useAuth();
  const scanningRef = useRef(true);

  const handleQrData = useCallback(async (raw: string) => {
    if (!scanningRef.current) return;
    scanningRef.current = false;
    setScanning(false);

    const payload = decodeQrUrl(raw);
    if (!payload) {
      setError("Invalid QR code");
      setTimeout(() => { scanningRef.current = true; setScanning(true); setError(""); }, 2000);
      return;
    }

    onResolved?.(payload);

    if (payload.type === "request") {
      // Fetch payment request and open payment
      const pr = await fetchPaymentRequest(payload.id);
      if (pr && pr.status === "pending") {
        onClose();
        openPayment({
          amount: pr.amount,
          currency: pr.currency,
          title: pr.title || "Payment request",
          subtitle: pr.subtitle || undefined,
          recipientId: pr.sender_id,
          recipientName: pr.title || "Payment request",
          contextType: "order",
          contextId: pr.id,
        });
      } else {
        setError("Request already paid or not found");
      }
    } else {
      // User or shop payment
      onClose();
      openPayment({
        amount: payload.amount || 0,
        currency: payload.currency || "AED",
        title: `Pay ${payload.name || ""}`.trim(),
        recipientId: payload.id,
        recipientName: payload.name || null,
        contextType: payload.type === "shop" ? "shop" : "generic",
        contextId: payload.id,
      });
    }
  }, [onClose, openPayment, onResolved]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animFrame: number;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        scanLoop();
      } catch {
        setError("Camera access denied");
      }
    }

    async function scanLoop() {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState < 2) {
        animFrame = requestAnimationFrame(scanLoop);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      try {
        const jsQR = (await import("jsqr")).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data && scanningRef.current) {
          handleQrData(code.data);
          return;
        }
      } catch { /* jsQR not available */ }

      animFrame = requestAnimationFrame(scanLoop);
    }

    startCamera();

    return () => {
      cancelAnimationFrame(animFrame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [handleQrData]);

  return (
    <div className="fixed inset-0 z-[110] bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Scan frame */}
        <div className="h-64 w-64 rounded-3xl border-2 border-white/60" />
        <p className="mt-4 text-sm text-white/80 font-medium">
          {scanning ? "Point at a payment QR code" : "Processing..."}
        </p>
        {error && (
          <p className="mt-2 text-sm text-destructive bg-background/80 px-3 py-1 rounded-lg">
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-3 text-white"
        aria-label="Close scanner"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
