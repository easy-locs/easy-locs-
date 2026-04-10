/**
 * QRContactCard — Generate & scan QR codes for Orbit contacts.
 * Supports BarcodeDetector (Chrome/Android) and jsQR fallback (Safari/iOS).
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { QrCode, ScanLine, Copy, Share2, Check, X, Camera, Link2 } from "lucide-react";
import "@/styles/qr-scan-line.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { playScanBeep } from "@/lib/audio/scan-beep";
import { toast } from "sonner";
import QRCodeLib from "qrcode";
import { requestMediaStream } from "@/lib/device/permissions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded?: () => void;
  onSendAsAttachment?: (file: File) => void;
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

export default function QRContactCard({ open, onOpenChange, onContactAdded, onSendAsAttachment, initialMode = "show" }: Props) {
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
    name: user.user_metadata?.full_name || `EL-${user.id.replace(/-/g, "").substring(0, 8).toUpperCase()}`,
  }) : "";

  const directAddUrl = user && typeof window !== "undefined"
    ? `${window.location.origin}/orbit/add?userId=${user.id}`
    : "";

  const qrPayload = myData && typeof window !== "undefined"
    ? `${window.location.origin}/orbit/add?userId=${user!.id}&data=${encodeURIComponent(toBase64Utf8(myData))}`
    : "";

  useEffect(() => {
    if (!qrPayload || !open) return;
    QRCodeLib.toCanvas(document.createElement("canvas"), qrPayload, {
      width: 220, margin: 2,
      color: { dark: "#0a0a0f", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(canvas => {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const size = canvas.width;
        const logoSize = Math.round(size * 0.22);
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        const pad = 4;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, 8);
        ctx.fill();
        ctx.fillStyle = "#0a0a0f";
        ctx.beginPath();
        ctx.roundRect(x, y, logoSize, logoSize, 6);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(logoSize * 0.32)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("EL", x + logoSize / 2, y + logoSize * 0.42);
        ctx.font = `${Math.round(logoSize * 0.15)}px system-ui, sans-serif`;
        ctx.fillText("Easy-Locs", x + logoSize / 2, y + logoSize * 0.72);
      }
      setQrDataUrl(canvas.toDataURL("image/png"));
    }).catch(() => {});
  }, [qrPayload, open]);

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
      if (/^https?:\/\//i.test(trimmed)) {
        const url = new URL(trimmed);
        let b64 = url.searchParams.get("data");
        if (!b64 && url.hash) {
          const hashQuery = url.hash.split("?")[1];
          if (hashQuery) b64 = new URLSearchParams(hashQuery).get("data");
        }
        const directUserId = url.searchParams.get("userId");
        if (b64) {
          contactData = fromBase64Utf8(b64);
        } else if (directUserId) {
          contactData = JSON.stringify({ t: "el-contact", v: 1, userId: directUserId, name: `User ${directUserId.substring(0, 8)}` });
        } else {
          throw new Error("No data");
        }
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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(directAddUrl);
      setCopied(true);
      haptic("success");
      toast.success(t("orbit.qr.link_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("orbit.contacts.copy_failed"));
    }
  }, [directAddUrl, t]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) { handleCopy(); return; }
    try {
      if (qrDataUrl) {
        const res = await fetch(qrDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `easy-locs-qr-${userName.replace(/\s/g, "-")}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${userName} — Easy-Locs`,
            text: t("orbit.qr.scan_to_add"),
            url: directAddUrl,
            files: [file],
          });
          haptic("success");
          return;
        }
      }
      await navigator.share({ title: `${userName} — Easy-Locs`, text: t("orbit.qr.scan_to_add"), url: directAddUrl });
      haptic("success");
    } catch { /* user cancelled */ }
  }, [directAddUrl, qrDataUrl, handleCopy, userName, t]);

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
              playScanBeep(); haptic("success");
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
            playScanBeep(); haptic("success");
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

  const userName = user?.user_metadata?.full_name || (user?.id ? `EL-${user.id.replace(/-/g, "").substring(0, 8).toUpperCase()}` : "User");

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

            {onSendAsAttachment && qrDataUrl && (
              <Button
                variant="outline"
                className="w-full mt-3 gap-1.5 h-10 rounded-xl text-xs"
                onClick={async () => {
                  try {
                    const res = await fetch(qrDataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], `qr-${userName.replace(/\s/g, "-")}.png`, { type: "image/png" });
                    onSendAsAttachment(file);
                    haptic("success");
                    toast.success("QR code sent as attachment");
                    onOpenChange(false);
                  } catch {
                    toast.error("Failed to send QR");
                  }
                }}
              >
                <Share2 className="h-3.5 w-3.5" />
                Send in chat
              </Button>
            )}

            <Button className="w-full mt-3 gap-1.5 h-11 rounded-xl" onClick={startScannerFn}>
              <Camera className="h-4 w-4" />
              {t("orbit.qr.scan_a_code")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center pt-1">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-black border border-white/5">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              <div className="qr-corner qr-corner-tl" />
              <div className="qr-corner qr-corner-tr" />
              <div className="qr-corner qr-corner-bl" />
              <div className="qr-corner qr-corner-br" />

              <div className="qr-scan-line-glow" />
              <div className="qr-scan-line" />
              <div className="qr-grid-overlay" />
              <div className="qr-target-ring" />
              <div className="qr-vignette" />

              {adding && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-30">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-white">{t("orbit.qr.adding")}</p>
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
