/**
 * QRContactCard — Generate & scan QR codes for Orbit contacts.
 * Supports BarcodeDetector (Chrome/Android) and jsQR fallback (Safari/iOS).
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { QrCode, ScanLine, Copy, Share2, Check, X, Camera, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import QRCodeLib from "qrcode";
import { requestMediaStream } from "@/lib/device/permissions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded?: () => void;
  initialMode?: "show" | "scan";
}

function encodeContactData(data: { userId: string; name: string; email?: string }) {
  return JSON.stringify({ t: "el-contact", v: 1, ...data });
}

function toBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64Utf8(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function hasBarcodeDetector(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export default function QRContactCard({ open, onOpenChange, onContactAdded, initialMode = "show" }: Props) {
  const { user, orgId } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<"show" | "scan">(initialMode);
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
  }) : "";

  const shareUrl = myData && typeof window !== "undefined"
    ? `${window.location.origin}/add-contact?data=${toBase64Utf8(myData)}`
    : "";

  // Generate QR
  useEffect(() => {
    if (!shareUrl || !open) return;
    QRCodeLib.toDataURL(shareUrl, {
      width: 220, margin: 2,
      color: { dark: "#0a0a0f", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(url => setQrDataUrl(url)).catch(() => {});
  }, [shareUrl, open]);

  const stopScanner = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(tr => tr.stop()); streamRef.current = null; }
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setManualLink("");
      setShowManualInput(false);
      setCopied(false);
    }
  }, [open, initialMode]);

  // Cleanup camera
  useEffect(() => {
    if (!open || mode !== "scan") stopScanner();
    return () => stopScanner();
  }, [open, mode, stopScanner]);

  // Auto-start scan if initialMode is scan
  useEffect(() => {
    if (open && initialMode === "scan") {
      startScannerFn();
    }
     
  }, [open, initialMode]);

  const handleScannedData = useCallback(async (raw: string) => {
    if (!user?.id) return;
    setAdding(true);
    try {
      let contactData: string;
      const trimmed = raw.trim();
      if (trimmed.includes("/add-contact?data=") || /^https?:\/\//i.test(trimmed)) {
        const url = new URL(trimmed);
        const b64 = url.searchParams.get("data");
        if (!b64) throw new Error("No data");
        contactData = fromBase64Utf8(b64);
      } else if (trimmed.startsWith("{")) {
        contactData = trimmed;
      } else {
        contactData = fromBase64Utf8(trimmed);
      }

      const parsed = JSON.parse(contactData);
      if (parsed.t !== "el-contact") throw new Error("Invalid");
      if (parsed.userId === user.id) {
        toast.info(t("orbit.qr.self_scan"));
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
      toast.success(`${parsed.name || "Contact"} ✓`);
      onContactAdded?.();
      onOpenChange(false);
    } catch {
      toast.error(t("orbit.qr.invalid_code"));
    }
    setAdding(false);
    setMode("show");
  }, [user?.id, onContactAdded, onOpenChange, t]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    haptic("success");
    toast.success(t("orbit.qr.link_copied"));
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl, t]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t("orbit.qr.share_title"), url: shareUrl });
        haptic("success");
      } catch {}
    } else {
      handleCopy();
    }
  }, [shareUrl, handleCopy, t]);

  const startScannerFn = useCallback(async () => {
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
              haptic("success");
              stopScanner();
              handleScannedData(barcodes[0].rawValue);
            }
          } catch {}
        }, 300);
      } else {
        const jsQRModule = await import("jsqr");
        const jsQR = jsQRModule.default;
        if (!jsQR) {
          toast.error(t("orbit.qr.scanner_unavailable"));
          setMode("show");
          return;
        }
        scanIntervalRef.current = setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) return;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
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
        }, 250);
      }

      setTimeout(() => setShowManualInput(true), 3000);
    } catch {
      toast.error(t("orbit.qr.camera_required"));
      setMode("show");
    }
  }, [stopScanner, handleScannedData, t]);

  const handleManualLinkSubmit = () => {
    if (!manualLink.trim()) return;
    stopScanner();
    handleScannedData(manualLink.trim());
    setManualLink("");
  };

  const userName = (user as any)?.user_metadata?.full_name || user?.email || "User";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl bg-card border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-base">
            {mode === "show" ? (
              <><QrCode className="h-4 w-4 text-primary" />{t("orbit.qr.my_code")}</>
            ) : (
              <><ScanLine className="h-4 w-4 text-primary" />{t("orbit.qr.scan_title")}</>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "show" ? (
          <div className="flex flex-col items-center pt-2">
            {/* QR Code */}
            <div className="p-4 rounded-2xl bg-white shadow-lg mb-5">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" width={200} height={200} className="rounded-lg" />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center">
                  <QrCode className="h-12 w-12 animate-pulse text-muted-foreground/20" />
                </div>
              )}
            </div>

            <p className="text-sm font-bold text-foreground mb-0.5">{userName}</p>
            <p className="text-[11px] text-muted-foreground/50 mb-5">
              {t("orbit.qr.scan_to_add")}
            </p>

            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 gap-1.5 text-xs h-10 rounded-xl" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("orbit.qr.copied") : t("orbit.qr.copy_link")}
              </Button>
              <Button variant="outline" className="flex-1 gap-1.5 text-xs h-10 rounded-xl" onClick={handleShare}>
                <Share2 className="h-3.5 w-3.5" />
                {t("orbit.qr.share")}
              </Button>
            </div>

            <Button className="w-full mt-3 gap-1.5 h-11 rounded-xl" onClick={startScannerFn}>
              <Camera className="h-4 w-4" />
              {t("orbit.qr.scan_a_code")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center pt-1">
            {/* Camera viewfinder */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-muted/30 border border-border/10">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  {[
                    "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
                    "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
                    "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
                  ].map((cls, i) => (
                    <div key={i} className={`absolute ${cls} w-8 h-8 border-primary`} />
                  ))}
                  <div
                    className="absolute left-2 right-2 h-0.5 bg-primary animate-bounce"
                    style={{ top: "50%", boxShadow: "0 0 12px hsl(var(--primary) / 0.4)" }}
                  />
                </div>
              </div>

              {adding && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-foreground">{t("orbit.qr.adding")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Manual link fallback */}
            {showManualInput && (
              <div className="w-full mb-3 space-y-2">
                <p className="text-[11px] text-center text-muted-foreground/60">
                  {t("orbit.qr.or_paste")}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={manualLink}
                    onChange={e => setManualLink(e.target.value)}
                    placeholder={t("orbit.qr.paste_placeholder")}
                    className="flex-1 h-9 text-xs bg-muted/20"
                    onKeyDown={e => { if (e.key === "Enter") handleManualLinkSubmit(); }}
                  />
                  <Button
                    size="sm"
                    className="h-9 gap-1 rounded-lg"
                    onClick={handleManualLinkSubmit}
                    disabled={!manualLink.trim() || adding}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {t("orbit.add_contact")}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[11px] text-center text-muted-foreground/50 mb-3">
              {t("orbit.qr.point_camera")}
            </p>

            <Button
              variant="outline"
              className="w-full gap-1.5 text-xs h-10 rounded-xl"
              onClick={() => { stopScanner(); onOpenChange(false); }}
            >
              <X className="h-3.5 w-3.5" />
              {t("orbit.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
