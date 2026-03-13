/**
 * OrbitSafetyNumber — Verify peer identity via safety number comparison
 * Signal-inspired: both users compare the same safety number to confirm identity.
 */
import { useState, useEffect } from "react";
import { Shield, ShieldCheck, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useOrbitEncryption } from "@/hooks/useOrbitEncryption";
import { toast } from "sonner";

interface Props {
  peerId: string;
  peerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrbitSafetyNumber({ peerId, peerName, open, onOpenChange }: Props) {
  const { getSafetyNumber } = useOrbitEncryption(undefined); // We only need the function
  const [safetyNumber, setSafetyNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !peerId) return;
    setLoading(true);
    getSafetyNumber(peerId).then(sn => {
      setSafetyNumber(sn);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, peerId, getSafetyNumber]);

  const handleCopy = () => {
    if (!safetyNumber) return;
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    toast.success("Safety number copied");
    setTimeout(() => setCopied(false), 2000);
  };

  // Format: groups of 5 digits, 4 per row
  const formatNumber = (sn: string) => {
    const groups = sn.split(" ");
    const rows: string[][] = [];
    for (let i = 0; i < groups.length; i += 4) {
      rows.push(groups.slice(i, i + 4));
    }
    return rows;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{
        background: "hsl(var(--hud-bg))",
        border: "1px solid hsl(var(--hud-border) / 0.2)",
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: "hsl(var(--hud-text))" }}>
            <ShieldCheck className="h-5 w-5" style={{ color: "hsl(var(--hud-success))" }} />
            Verify Security
          </DialogTitle>
          <DialogDescription style={{ color: "hsl(var(--hud-text-dim))" }}>
            Compare this safety number with <strong style={{ color: "hsl(var(--hud-text))" }}>{peerName}</strong> to verify end-to-end encryption.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "hsl(var(--hud-cyan) / 0.4)" }} />
            </div>
          ) : safetyNumber ? (
            <div className="space-y-4">
              {/* Safety number grid */}
              <div className="p-4 rounded-xl" style={{
                background: "hsl(var(--hud-surface))",
                border: "1px solid hsl(var(--hud-border) / 0.15)",
              }}>
                <div className="space-y-2 font-mono text-center">
                  {formatNumber(safetyNumber).map((row, i) => (
                    <div key={i} className="flex justify-center gap-4">
                      {row.map((group, j) => (
                        <span key={j} className="text-lg font-bold tracking-wider" style={{ color: "hsl(var(--hud-cyan))" }}>
                          {group}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-lg text-xs leading-relaxed" style={{
                background: "hsl(var(--hud-surface) / 0.5)",
                color: "hsl(var(--hud-text-dim))",
                border: "1px solid hsl(var(--hud-border) / 0.1)",
              }}>
                <p className="flex items-start gap-2">
                  <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(var(--hud-success) / 0.6)" }} />
                  If the numbers match on both devices, your conversation is secured with end-to-end encryption. 
                  The server cannot read your messages.
                </p>
              </div>

              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full gap-2"
                style={{
                  borderColor: "hsl(var(--hud-border) / 0.2)",
                  color: "hsl(var(--hud-text))",
                  background: "hsl(var(--hud-surface))",
                }}
              >
                {copied ? <Check className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Safety Number"}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
              <p className="text-sm" style={{ color: "hsl(var(--hud-text-dim))" }}>
                Safety number unavailable. The peer may not have set up encryption yet.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
