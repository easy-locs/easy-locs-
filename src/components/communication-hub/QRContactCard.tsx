/**
 * QRContactCard — Generate & scan personal QR codes to add contacts quickly.
 * Uses real QR code generation (qrcode lib) and multiple scanning strategies:
 * 1. BarcodeDetector API (Chrome/Edge/Android)
 * 2. Canvas frame capture + manual URL input fallback (Safari/iOS)
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { QrCode, ScanLine, Copy, Share2, Check, X, Camera, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QRCodeLib from "qrcode";
import { requestMediaStream } from "@/lib/device/permissions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded?: () => void;
}

/** Encode user data into a simple JSON string for QR */
function encodeContactData(data: { userId: string; name: string; email?: string; phone?: string; orgId?: string }) {
  return JSON.stringify({ t: "el-contact", v: 1, ...data });
}

function toBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64Utf8(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Check if BarcodeDetector is available */
function hasBarcodeDetector(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export default function QRContactCard({ open, onOpenChange, onContactAdded }: Props) {
  const { user, orgId } = useAuth();
  const [mode, setMode] = useState<"show" | "scan">("show");
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const myData = user ? encodeContactData({
    userId: user.id,
    name: (user as any).user_metadata?.full_name || user.email || "User",
    email: user.email,
    orgId: orgId || undefined,
  }) : "";

  const shareUrl = myData && typeof window !== "undefined"
    ? `${window.location.origin}/add-contact?data=${toBase64Utf8(myData)}`
    : "";

  // Generate real QR code
  useEffect(() => {
    if (!shareUrl || !open) return;
    QRCodeLib.toDataURL(shareUrl, {
      width: 220,
      margin: 2,
      color: { dark: "#0a0a0f", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(url => setQrDataUrl(url)).catch(() => {});
  }, [shareUrl, open]);

  // Cleanup camera on unmount/close
  useEffect(() => {
    if (!open || mode !== "scan") {
      stopScanner();
    }
    return () => stopScanner();
  }, [open, mode]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setMode("show");
      setManualLink("");
      setShowManualInput(false);
    }
  }, [open]);

  const stopScanner = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    haptic("success");
    toast.success("Contact link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Add me as a contact", url: shareUrl });
        haptic("success");
      } catch {}
    } else {
      handleCopy();
    }
  }, [shareUrl, handleCopy]);

  const startScanner = useCallback(async () => {
    setMode("scan");
    setShowManualInput(false);
    haptic("medium");
    try {
      const stream = await requestMediaStream({
        camera: true,
        videoConstraints: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (hasBarcodeDetector()) {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const raw = barcodes[0].rawValue;
              haptic("success");
              stopScanner();
              handleScannedData(raw);
            }
          } catch {}
        }, 300);
      } else {
        // jsQR fallback for Safari/iOS — actively scans camera frames
        const jsQRModule = await import("jsqr");
        const jsQR = jsQRModule.default;
        if (!jsQR) {
          toast.error("QR scanner unavailable on this browser");
          setMode("show");
          return;
        }
        scanIntervalRef.current = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) return;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          // Use actual video dimensions for accuracy
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 640;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const image = ctx.getImageData(0, 0, w, h);
          const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
          if (result?.data) {
            haptic("success");
            stopScanner();
            handleScannedData(result.data);
          }
        }, 250); // Faster scan interval for responsiveness
      }

      setTimeout(() => setShowManualInput(true), 2200);
    } catch {
      toast.error("Camera access required to scan QR codes");
      setMode("show");
    }
  }, [stopScanner]);

  const handleScannedData = useCallback(async (raw: string) => {
    if (!user?.id) return;
    setAdding(true);
    try {
      // Handle URL/base64/json formats robustly
      let contactData: string;
      const trimmed = raw.trim();
      if (trimmed.includes("/add-contact?data=") || /^https?:\/\//i.test(trimmed)) {
        const url = new URL(trimmed);
        const b64 = url.searchParams.get("data");
        if (!b64) throw new Error("No data in URL");
        contactData = fromBase64Utf8(b64);
      } else if (trimmed.startsWith("{")) {
        contactData = trimmed;
      } else {
        contactData = fromBase64Utf8(trimmed);
      }

      const parsed = JSON.parse(contactData);
      if (parsed.t !== "el-contact") throw new Error("Invalid QR code");
      if (parsed.userId === user.id) {
        toast.info("That's your own code!");
        setAdding(false);
        setMode("show");
        return;
      }

      const { upsertOrbitContact } = await import("@/lib/orbit/orbit-contacts-service");
      await upsertOrbitContact({
        ownerUserId: user.id,
        peerUserId: parsed.userId || null,
        peerOrbitId: parsed.orbitId || null,
        displayName: parsed.name || "Contact",
        email: parsed.email || null,
        source: "qr_scan",
        metadata: { qr: true },
      });

      haptic("success");
      toast.success(`${parsed.name} added to contacts!`);
      onContactAdded?.();
      onOpenChange(false);
    } catch {
      toast.error("Invalid contact QR code or link");
    }
    setAdding(false);
    setMode("show");
  }, [user?.id, orgId, onContactAdded, onOpenChange]);

  const handleManualLinkSubmit = () => {
    if (!manualLink.trim()) return;
    stopScanner();
    handleScannedData(manualLink.trim());
    setManualLink("");
  };

  const userName = (user as any)?.user_metadata?.full_name || user?.email || "User";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
            <QrCode className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
            {mode === "show" ? "My Contact Code" : "Scan Contact"}
          </DialogTitle>
        </DialogHeader>

        {mode === "show" ? (
          <div className="flex flex-col items-center">
            {/* Real QR Code */}
            <div className="p-3 rounded-2xl mb-4" style={{
              background: "white",
              boxShadow: "0 0 40px hsl(var(--hud-cyan) / 0.15)",
            }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" width={200} height={200} className="rounded-lg" />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <QrCode className="h-12 w-12 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
                </div>
              )}
            </div>

            {/* User info */}
            <p className="text-sm font-semibold mb-0.5" style={{ color: "hsl(var(--hud-text))" }}>
              {userName}
            </p>
            <p className="text-[11px] mb-4" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Scan to add me as a contact
            </p>

            {/* Actions */}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 gap-1.5 text-xs" onClick={handleCopy}
                style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))", background: "hsl(var(--hud-surface))" }}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
              <Button variant="outline" className="flex-1 gap-1.5 text-xs" onClick={handleShare}
                style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))", background: "hsl(var(--hud-surface))" }}>
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            </div>

            <Button className="w-full mt-3 gap-1.5" onClick={startScanner}
              style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
              <Camera className="h-4 w-4" /> Scan a Code
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Camera viewfinder */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  {/* Corner brackets */}
                  {[
                    { pos: "top-0 left-0", borderBottom: "none", borderRight: "none" },
                    { pos: "top-0 right-0", borderBottom: "none", borderLeft: "none" },
                    { pos: "bottom-0 left-0", borderTop: "none", borderRight: "none" },
                    { pos: "bottom-0 right-0", borderTop: "none", borderLeft: "none" },
                  ].map((corner, i) => (
                    <div key={i} className={`absolute ${corner.pos} w-8 h-8`} style={{
                      borderColor: "hsl(var(--hud-cyan))",
                      borderWidth: 2,
                      borderStyle: "solid",
                      borderRadius: 4,
                      ...(corner.borderBottom === "none" && { borderBottom: "none" }),
                      ...(corner.borderTop === "none" && { borderTop: "none" }),
                      ...(corner.borderRight === "none" && { borderRight: "none" }),
                      ...(corner.borderLeft === "none" && { borderLeft: "none" }),
                    }} />
                  ))}
                  {/* Scan line animation */}
                  <div className="absolute left-2 right-2 h-0.5 animate-bounce" style={{
                    background: "hsl(var(--hud-cyan))",
                    top: "50%",
                    boxShadow: "0 0 12px hsl(var(--hud-cyan) / 0.5)",
                  }} />
                </div>
              </div>
              {adding && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                      style={{ borderColor: "hsl(var(--hud-cyan))", borderTopColor: "transparent" }} />
                    <p className="text-xs" style={{ color: "hsl(var(--hud-text))" }}>Adding contact...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Manual link input fallback */}
            {showManualInput && (
              <div className="w-full mb-3 space-y-2">
                <p className="text-[11px] text-center" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                  Or paste a contact link:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={manualLink}
                    onChange={e => setManualLink(e.target.value)}
                    placeholder="Paste contact link..."
                    className="flex-1 h-9 text-xs border-0"
                    style={{ background: "hsl(var(--hud-surface))", color: "hsl(var(--hud-text))" }}
                    onKeyDown={e => { if (e.key === "Enter") handleManualLinkSubmit(); }}
                  />
                  <Button size="sm" className="h-9 gap-1" onClick={handleManualLinkSubmit}
                    disabled={!manualLink.trim() || adding}
                    style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
                    <Link2 className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-center mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {hasBarcodeDetector() ? "Point camera at a contact QR code" : "Scanning for QR codes... You can also paste a link below"}
            </p>

            <div className="flex gap-2 w-full">
              {!showManualInput && (
                <Button variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => setShowManualInput(true)}
                  style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>
                  <Link2 className="h-3.5 w-3.5" /> Paste Link
                </Button>
              )}
              <Button variant="outline" className={`${showManualInput ? "w-full" : "flex-1"} gap-1.5 text-xs`}
                onClick={() => { stopScanner(); setMode("show"); }}
                style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>
                <X className="h-3.5 w-3.5" /> Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
