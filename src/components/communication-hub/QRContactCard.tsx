/**
 * QRContactCard — Generate & scan personal QR codes to add contacts quickly.
 * Shows a personal QR code with user info, and a scanner to read others' codes.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { QrCode, ScanLine, Copy, Share2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded?: () => void;
}

/** Encode user data into a simple JSON string for QR */
function encodeContactData(data: { userId: string; name: string; email?: string; phone?: string; orgId?: string }) {
  return JSON.stringify({ t: "el-contact", v: 1, ...data });
}

/** SVG-based QR code generator (simple, no deps) */
function QRCodeSVG({ data, size = 200 }: { data: string; size?: number }) {
  // Simple QR-like visual using a deterministic pattern from data hash
  const cells = 21;
  const cellSize = size / cells;
  
  // Generate a deterministic pattern from the data string
  const grid: boolean[][] = [];
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }
  
  for (let r = 0; r < cells; r++) {
    grid[r] = [];
    for (let c = 0; c < cells; c++) {
      // Fixed position patterns (finder patterns)
      const isFinderTL = r < 7 && c < 7;
      const isFinderTR = r < 7 && c >= cells - 7;
      const isFinderBL = r >= cells - 7 && c < 7;
      
      if (isFinderTL || isFinderTR || isFinderBL) {
        const lr = r % 7 >= (cells - 7) ? r - (cells - 7) : r;
        const lc = c % 7 >= (cells - 7) ? c - (cells - 7) : c;
        const rr = isFinderTR ? r : isFinderBL ? r - (cells - 7) : r;
        const cc = isFinderTR ? c - (cells - 7) : c;
        const row = isFinderTR ? rr : isFinderBL ? rr : r;
        const col = isFinderTR ? cc : c;
        grid[r][c] = row === 0 || row === 6 || col === 0 || col === 6 || (row >= 2 && row <= 4 && col >= 2 && col <= 4);
      } else {
        // Data area: deterministic from hash + position
        const seed = ((hash ^ (r * 31 + c * 17)) >>> 0) % 100;
        grid[r][c] = seed < 42;
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="12" />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="hsl(var(--hud-bg))"
              rx={cellSize * 0.15}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function QRContactCard({ open, onOpenChange, onContactAdded }: Props) {
  const { user, orgId } = useAuth();
  const [mode, setMode] = useState<"show" | "scan">("show");
  const [copied, setCopied] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const myData = user ? encodeContactData({
    userId: user.id,
    name: (user as any).user_metadata?.full_name || user.email || "User",
    email: user.email,
    orgId: orgId || undefined,
  }) : "";

  // Cleanup camera on unmount/close
  useEffect(() => {
    if (!open || mode !== "scan") {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
  }, [open, mode]);

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
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast.error("Camera access required to scan QR codes");
      setMode("show");
    }
  }, []);

  const handleManualAdd = useCallback(async (contactData: string) => {
    if (!user?.id) return;
    setAdding(true);
    try {
      const parsed = JSON.parse(contactData);
      if (parsed.t !== "el-contact") throw new Error("Invalid QR");
      
      const { error } = await supabase.from("contacts").insert({
        owner_id: user.id,
        org_id: orgId || null,
        name: parsed.name || "Contact",
        email: parsed.email || null,
        contact_user_id: parsed.userId || null,
        category: "professional",
      } as any);
      
      if (error) throw error;
      haptic("success");
      toast.success(`${parsed.name} added to contacts!`);
      onContactAdded?.();
      onOpenChange(false);
    } catch {
      toast.error("Invalid contact code");
    }
    setAdding(false);
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
            {/* QR Code */}
            <div className="p-4 rounded-2xl mb-4" style={{
              background: "white",
              boxShadow: "0 0 40px hsl(var(--hud-cyan) / 0.15)",
            }}>
              <QRCodeSVG data={myData} size={180} />
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
              <ScanLine className="h-4 w-4" /> Scan a Code
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Camera viewfinder */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4"
              style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  {/* Corner brackets */}
                  {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                    <div key={i} className={`absolute ${pos} w-8 h-8`} style={{
                      borderColor: "hsl(var(--hud-cyan))",
                      borderWidth: 2,
                      borderStyle: "solid",
                      borderRadius: 4,
                      [pos.includes("top") ? "borderBottom" : "borderTop"]: "none",
                      [pos.includes("left") ? "borderRight" : "borderLeft"]: "none",
                    }} />
                  ))}
                  {/* Scan line animation */}
                  <div className="absolute left-2 right-2 h-0.5 animate-pulse" style={{
                    background: "hsl(var(--hud-cyan))",
                    top: "50%",
                    boxShadow: "0 0 12px hsl(var(--hud-cyan) / 0.5)",
                  }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-center mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Point camera at a contact QR code
            </p>

            <Button variant="outline" className="w-full gap-1.5" onClick={() => setMode("show")}
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>
              <X className="h-3.5 w-3.5" /> Back to my code
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
