/**
 * OrbitQRCode — Generate and display payment QR codes (static & dynamic)
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { QrCode, Copy, Share2, Clock, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  createStaticQR,
  createDynamicQR,
  encodeQRPayload,
  formatCurrency,
  formatLocs,
} from "@/lib/orbit-payments";
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
  const [userName, setUserName] = useState("User");

  // Load user display name from profiles
  useEffect(() => {
    if (!user?.id) return;
    const loadName = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.full_name) setUserName(data.full_name);
      else if (user.email) setUserName(user.email);
    };
    loadName();
  }, [user]);
  const [copied, setCopied] = useState(false);

  const generateQR = useCallback(async () => {
    if (!user?.id) return;
    const name = (profile as any)?.full_name || user.email || "User";

    let qrPayload: QRPayload;
    if (type === "static") {
      qrPayload = createStaticQR({ userId: user.id, name, type: recipientType, orgId });
    } else {
      qrPayload = await createDynamicQR({
        userId: user.id,
        name,
        amount: amount || 0,
        currency,
        locsEquivalent,
        referenceType,
        referenceId,
        description,
        expiresInMinutes,
      });
    }

    setPayload(qrPayload);
    setQrData(encodeQRPayload(qrPayload));
  }, [user, profile, type, recipientType, amount, currency, locsEquivalent, referenceType, referenceId, description, expiresInMinutes, orgId]);

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
      await navigator.share({
        title: "Orbit Payment QR",
        text: `Pay ${(profile as any)?.full_name || "me"} via Orbit`,
        url: `${window.location.origin}/pay?qr=${encodeURIComponent(qrData)}`,
      });
    } catch {
      // User cancelled share
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
        {/* SVG QR placeholder — in production, use a QR library */}
        <div className="w-48 h-48 bg-foreground/5 rounded-xl flex items-center justify-center relative overflow-hidden">
          {qrData ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              {/* Grid-based QR visualization */}
              <div className="w-full h-full grid grid-cols-11 grid-rows-11 gap-[1px]">
                {Array.from({ length: 121 }).map((_, i) => {
                  // Generate deterministic pattern from qrData
                  const charCode = qrData.charCodeAt(i % qrData.length);
                  const isActive = charCode % 3 !== 0;
                  const isCorner =
                    (i < 33 && i % 11 < 3) ||
                    (i < 33 && i % 11 > 7) ||
                    (i > 87 && i % 11 < 3);
                  return (
                    <div
                      key={i}
                      className={`rounded-[1px] ${
                        isCorner
                          ? "bg-foreground"
                          : isActive
                            ? "bg-foreground/90"
                            : "bg-transparent"
                      }`}
                    />
                  );
                })}
              </div>
              {/* Center logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shadow-md">
                  <span className="text-[8px] font-black text-accent-foreground leading-none">
                    EL
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <QrCode className="w-12 h-12 text-muted-foreground/30" />
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex-1 rounded-xl"
        >
          {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {"share" in navigator && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 rounded-xl"
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            Share
          </Button>
        )}
      </div>

      {/* Security */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Signed payload • Anti-replay protection • Orbit Secure</span>
      </div>
    </motion.div>
  );
}
