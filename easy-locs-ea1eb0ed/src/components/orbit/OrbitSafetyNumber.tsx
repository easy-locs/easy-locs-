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
import { useI18n } from "@/lib/i18n";

interface Props {
  peerId: string;
  peerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrbitSafetyNumber({ peerId, peerName, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const { getSafetyNumber } = useOrbitEncryption(undefined);
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
    toast.success(t("orbit.safety_number_copied"));
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
        background: "hsl(var(--background))",
        border: "1px solid hsl(var(--border) / 0.2)",
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
            <ShieldCheck className="h-5 w-5" style={{ color: "hsl(var(--hud-success))" }} />
            {t("orbit.verify_security")}
          </DialogTitle>
          <DialogDescription style={{ color: "hsl(var(--muted-foreground))" }}>
            {t("orbit.safety_verify_desc").replace("{name}", peerName)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "hsl(var(--primary) / 0.4)" }} />
            </div>
          ) : safetyNumber ? (
            <div className="space-y-4">
              {/* Safety number grid */}
              <div className="p-4 rounded-xl" style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border) / 0.15)",
              }}>
                <div className="space-y-2 font-mono text-center">
                  {formatNumber(safetyNumber).map((row, i) => (
                    <div key={i} className="flex justify-center gap-4">
                      {row.map((group, j) => (
                        <span key={j} className="text-lg font-bold tracking-wider" style={{ color: "hsl(var(--primary))" }}>
                          {group}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-lg text-xs leading-relaxed" style={{
                background: "hsl(var(--card) / 0.5)",
                color: "hsl(var(--muted-foreground))",
                border: "1px solid hsl(var(--border) / 0.1)",
              }}>
                <p className="flex items-start gap-2">
                  <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(var(--hud-success) / 0.6)" }} />
                  {t("orbit.safety_match_desc")}
                </p>
              </div>

              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full gap-2"
                style={{
                  borderColor: "hsl(var(--border) / 0.2)",
                  color: "hsl(var(--foreground))",
                  background: "hsl(var(--card))",
                }}
              >
                {copied ? <Check className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} /> : <Copy className="h-4 w-4" />}
                {copied ? t("orbit.copied") : t("orbit.copy_safety_number")}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.safety_unavailable")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
