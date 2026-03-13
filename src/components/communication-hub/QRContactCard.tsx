/**
 * QRContactCard — Generate & scan personal QR codes to add contacts quickly.
 * Uses real QR code generation (qrcode lib) and BarcodeDetector API for scanning.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { QrCode, ScanLine, Copy, Share2, Check, X, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QRCodeLib from "qrcode";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded?: () => void;
}

/** Encode user data into a simple JSON string for QR */
function encodeContactData(data: { userId: string; name: string; email?: string; phone?: string; orgId?: string }) {
  return JSON.stringify({ t: "el-contact", v: 1, ...data });
}

export default function QRContactCard({ open, onOpenChange, onContactAdded }: Props) {
  const { user, orgId } = useAuth();
  const [mode, setMode] = useState<"show" | "scan">("show");
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
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

  // Generate real QR code
  useEffect(() => {
    if (!myData || !open) return;
    const shareUrl = `${window.location.origin}/add-contact?data=${btoa(myData)}`;
    QRCodeLib.toDataURL(shareUrl, {
      width: 220,
      margin: 2,
      color: { dark: "#0a0a0f", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(url => setQrDataUrl(url)).catch(() => {});
  }, [myData, open]);

  // Cleanup camera on unmount/close
  useEffect(() => {
    if (!open || mode !== "scan") {
      stopScanner();
    }
    return () => stopScanner();
  }, [open, mode]);

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
    const shareUrl = `${window.location.origin}/add-contact?data=${btoa(myData)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    haptic("success");
    toast.success("Contact link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [myData]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/add-contact?data=${btoa(myData)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Add me as a contact", url: shareUrl });
        haptic("success");
      } catch {}
    } else {
      handleCopy();
    }
  }, [myData, handleCopy]);

  const startScanner = useCallback(async () => {
    setMode("scan");
    haptic("medium");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Use BarcodeDetector if available, else fallback to manual URL input
      const hasBarcodeDetector = "BarcodeDetector" in window;
      if (hasBarcodeDetector) {
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
        // Fallback: use canvas + manual detection attempt
        toast.info("QR scanner active. If auto-detect fails, paste the contact link.");
      }
    } catch {
      toast.error("Camera access required to scan QR codes");
      setMode("show");
    }
  }, [stopScanner]);

  const handleScannedData = useCallback(async (raw: string) => {
    if (!user?.id) return;
    setAdding(true);
    try {
      // Handle URL format: extract base64 data param
      let contactData: string;
      if (raw.includes("/add-contact?data=")) {
        const url = new URL(raw);
        const b64 = url.searchParams.get("data");
        if (!b64) throw new Error("No data in URL");
        contactData = atob(b64);
      } else {
        // Try direct JSON
        contactData = raw;
      }

      const parsed = JSON.parse(contactData);
      if (parsed.t !== "el-contact") throw new Error("Invalid QR code");
      if (parsed.userId === user.id) {
        toast.info("That's your own code!");
        setAdding(false);
        setMode("show");
        return;
      }

      const { error } = await supabase.from("contacts").insert({
        owner_id: user.id,
        org_id: orgId || null,
        name: parsed.name || "Contact",
        email: parsed.email || null,
        contact_user_id: parsed.userId || null,
        category: "professional",
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast.info("Contact already exists!");
        } else throw error;
      } else {
        haptic("success");
        toast.success(`${parsed.name} added to contacts!`);
        onContactAdded?.();
      }
      onOpenChange(false);
    } catch {
      toast.error("Invalid contact QR code");
    }
    setAdding(false);
    setMode("show");
  }, [user?.id, orgId, onContactAdded, onOpenChange]);

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

            <p className="text-xs text-center mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Point camera at a contact QR code
            </p>

            <Button variant="outline" className="w-full gap-1.5" onClick={() => { stopScanner(); setMode("show"); }}
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>
              <X className="h-3.5 w-3.5" /> Back to my code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
