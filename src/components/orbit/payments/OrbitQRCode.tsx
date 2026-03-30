/**
 * OrbitQRCode — Generate and display payment QR codes.
 * UNIFIED: Uses qr-engine canonical format.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, Share2, Clock, Shield, Check, Loader2 } from "lucide-react";
import BrandedQR from "@/components/qr/BrandedQR";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { encodeQr, toResolveUrl, qr } from "@/lib/qr-engine";
import { formatMoney } from "@/lib/format";

interface OrbitQRCodeProps {
  type: "static" | "dynamic";
  recipientType?: "user" | "business" | "provider" | "store";
  amount?: number;
  currency?: string;
  locsEquivalent?: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  expiresInMinutes?: number;
  orgId?: string;
}

export default function OrbitQRCode({
  type,
  recipientType = "user",
  amount,
  currency = "AED",
  locsEquivalent,
  referenceType,
  referenceId,
  description,
  expiresInMinutes = 30,
  orgId,
}: OrbitQRCodeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Canonical identity resolution: prefer orbit profile name
  const { displayName } = useResolvedIdentity({
    display_name: user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.user_metadata?.name,
    email: user?.email,
  });

  const qrData = useMemo(() => {
    if (!user?.id) return null;
    if (type === "dynamic" && amount && amount > 0) {
      return encodeQr(qr.payUser(user.id, { amount, currency, name: description || displayName }));
    }
    return encodeQr(qr.receive(user.id, displayName));
  }, [user?.id, type, amount, currency, description, displayName]);

  const shareUrl = useMemo(() => {
    if (!user?.id) return "";
    if (type === "dynamic" && amount && amount > 0) {
      return toResolveUrl(qr.payUser(user.id, { amount, currency, name: description || displayName }));
    }
    return toResolveUrl(qr.receive(user.id, displayName));
  }, [user?.id, type, amount, currency, description, displayName]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    toast({ title: "QR link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: "Payment QR",
        text: `Pay ${displayName}`,
        url: shareUrl,
      });
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-5 p-6"
    >
      {/* QR Display */}
      <div className="relative p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="w-52 h-52 flex items-center justify-center">
          {qrData ? (
            <BrandedQR value={qrData} size={200} darkMode />
          ) : (
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
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
      {type === "dynamic" && amount && amount > 0 && (
        <div className="w-full space-y-2 text-center">
          <p className="text-2xl font-black text-foreground">
            {formatMoney(amount, currency)}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground italic">"{description}"</p>
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
        <span>Canonical QR • Versioned • Orbit Secure</span>
      </div>
    </motion.div>
  );
}
