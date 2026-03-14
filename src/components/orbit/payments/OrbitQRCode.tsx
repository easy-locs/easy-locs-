/**
 * OrbitQRCode — Generate and display payment QR codes (static & dynamic)
 * Uses server-side signing via orbit-payment edge function
 * Real QR rendering via qrcode.react
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Share2, Clock, Shield, Check, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatLocs } from "@/lib/orbit-payments";
import type { QRPayload, StaticQRPayload, DynamicQRPayload } from "@/lib/orbit-payments/types";

interface OrbitQRCodeProps {
  type: "static" | "dynamic";
  recipientType?: StaticQRPayload["recipient_type"];
  amount?: number;
  currency?: string;
  locsEquivalent?: number;
  referenceType?: DynamicQRPayload["reference_type"];
  referenceId?: string;
  description?: string;
  expiresInMinutes?: number;
  orgId?: string;
}

export default function OrbitQRCode({
  type,
  recipientType = "user",
  amount,
  currency = "EUR",
  locsEquivalent,
  referenceType,
  referenceId,
  description,
  expiresInMinutes = 30,
  orgId,
}: OrbitQRCodeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrData, setQrData] = useState<string | null>(null);
  const [payload, setPayload] = useState<QRPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const generateQR = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("orbit-payment", {
        body: {
          action: "generate_qr",
          qr_type: type,
          recipient_type: recipientType,
          amount,
          currency,
          locs_equivalent: locsEquivalent,
          reference_type: referenceType,
          reference_id: referenceId,
          description,
          expires_in_minutes: expiresInMinutes,
          org_id: orgId,
        },
      });

      if (error) throw error;
      if (data?.payload) {
        setPayload(data.payload as QRPayload);
        setQrData(data.encoded);
      }
    } catch (err) {
      console.error("QR generation failed:", err);
      toast({ title: "QR generation failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, type, recipientType, amount, currency, locsEquivalent, referenceType, referenceId, description, expiresInMinutes, orgId, toast]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  const handleCopy = async () => {
    if (!qrData) return;
    await navigator.clipboard.writeText(qrData);
    setCopied(true);
    toast({ title: "QR data copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!qrData || !navigator.share) return;
    try {
      const name = payload?.recipient_name || "me";
      await navigator.share({
        title: "Orbit Payment QR",
        text: `Pay ${name} via Orbit`,
        url: `${window.location.origin}/pay?qr=${encodeURIComponent(qrData)}`,
      });
    } catch {
      // User cancelled
    }
  };

  const expiresAt = payload?.qr_type === "dynamic" ? new Date(payload.expires_at) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-5 p-6"
    >
      {/* QR Display */}
      <div className="relative p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="w-52 h-52 flex items-center justify-center">
          {loading ? (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          ) : qrData ? (
            <QRCodeSVG
              value={qrData}
              size={200}
              level="M"
              includeMargin={false}
              bgColor="transparent"
              fgColor="hsl(var(--foreground))"
              imageSettings={{
                src: "",
                height: 0,
                width: 0,
                excavate: false,
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Failed to generate QR</p>
          )}
        </div>

        {/* Type badge */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <span
            className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              type === "static"
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground"
            }`}
          >
            {type === "static" ? "My QR" : "Payment QR"}
          </span>
        </div>
      </div>

      {/* Payment info (dynamic only) */}
      {type === "dynamic" && payload?.qr_type === "dynamic" && (
        <div className="w-full space-y-2 text-center">
          <p className="text-2xl font-black text-foreground">
            {formatCurrency(payload.amount, payload.currency)}
          </p>
          {payload.locs_equivalent && (
            <p className="text-sm text-muted-foreground">
              ≈ {formatLocs(payload.locs_equivalent)}
            </p>
          )}
          {payload.description && (
            <p className="text-sm text-muted-foreground italic">"{payload.description}"</p>
          )}
          {expiresAt && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-warning">
              <Clock className="w-3 h-3" />
              <span>
                Expires {expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 w-full">
        <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1 rounded-xl" disabled={!qrData}>
          {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {"share" in navigator && (
          <Button variant="outline" size="sm" onClick={handleShare} className="flex-1 rounded-xl" disabled={!qrData}>
            <Share2 className="w-4 h-4 mr-1.5" />
            Share
          </Button>
        )}
      </div>

      {/* Security */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Server-signed • Anti-replay • Orbit Secure</span>
      </div>
    </motion.div>
  );
}
