/**
 * OrbitSecurityPanel — Security state UI for conversations.
 * Shows: encrypted, verified, safety number, key changed, secure channel state.
 * HUD-themed, accessible from chat header.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Lock, Key, Fingerprint, RefreshCw,
  CheckCircle2, AlertTriangle, Cpu, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrbitEncryption, type SessionSecurityInfo, type SecurityLevel } from "@/hooks/useOrbitEncryption";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";

interface Props {
  peerId: string;
  peerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LEVEL_CONFIG: Record<SecurityLevel, {
  icon: typeof Shield;
  label: string;
  color: string;
  bg: string;
  description: string;
}> = {
  none: {
    icon: ShieldX,
    label: "Not Encrypted",
    color: "hsl(var(--hud-danger))",
    bg: "hsl(var(--hud-danger) / 0.08)",
    description: "Messages are not end-to-end encrypted. The peer has not published encryption keys.",
  },
  encrypted: {
    icon: ShieldCheck,
    label: "Encrypted",
    color: "hsl(var(--hud-success))",
    bg: "hsl(var(--hud-success) / 0.08)",
    description: "Messages are end-to-end encrypted with P-521 ECDH. Only you and this contact can read them.",
  },
  verified: {
    icon: ShieldCheck,
    label: "Verified",
    color: "hsl(var(--hud-cyan))",
    bg: "hsl(var(--hud-cyan) / 0.08)",
    description: "This contact's identity has been verified using safety numbers. Maximum security.",
  },
  key_changed: {
    icon: ShieldAlert,
    label: "Key Changed",
    color: "hsl(var(--hud-warning))",
    bg: "hsl(var(--hud-warning) / 0.08)",
    description: "This contact's encryption key has changed. Verify their identity with safety numbers.",
  },
};

export default function OrbitSecurityPanel({ peerId, peerName, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { getSecurityInfo, getSafetyNumber } = useOrbitEncryption(user?.id);
  const [info, setInfo] = useState<SessionSecurityInfo | null>(null);
  const [safetyNumber, setSafetyNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);

  useEffect(() => {
    if (!open || !peerId) return;
    setLoading(true);
    (async () => {
      const secInfo = await getSecurityInfo(peerId);
      setInfo(secInfo);
      if (secInfo.peerHasKeys) {
        const sn = await getSafetyNumber(peerId);
        setSafetyNumber(sn);
      }
      setLoading(false);
    })();
  }, [open, peerId, getSecurityInfo, getSafetyNumber]);

  if (!info) return null;

  const config = LEVEL_CONFIG[info.level];
  const IconComponent = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden" style={{
        background: "hsl(var(--hud-bg))",
        border: "1px solid hsl(var(--hud-border) / 0.2)",
      }}>
        {/* Header */}
        <div className="p-6 pb-4" style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.1)" }}>
          <DialogHeader>
            <DialogTitle className="sr-only">Security Info</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center">
            {/* Animated security icon */}
            <motion.div
              className="relative w-20 h-20 mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="absolute inset-0 rounded-full" style={{
                background: `radial-gradient(circle, ${config.bg}, transparent)`,
              }} />
              <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{
                background: "hsl(var(--hud-surface))",
                border: `2px solid ${config.color}40`,
              }}>
                <IconComponent className="h-8 w-8" style={{ color: config.color }} />
              </div>
              {/* Scanning ring for encrypted */}
              {info.level === "encrypted" && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${config.color}` }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              )}
            </motion.div>

            <h3 className="text-base font-bold mb-1" style={{ color: "hsl(var(--hud-text))" }}>
              {config.label}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--hud-text-dim))" }}>
              {config.description}
            </p>
          </div>
        </div>

        {/* Security details */}
        <div className="px-6 py-4 space-y-3">
          {/* Channel state indicators */}
          <SecurityRow
            icon={Lock}
            label="End-to-End Encryption"
            value={info.peerHasKeys ? "Active" : "Unavailable"}
            active={info.peerHasKeys}
          />
          <SecurityRow
            icon={RefreshCw}
            label="Double Ratchet"
            value={info.ratchetActive ? "Active" : "Pending"}
            active={info.ratchetActive}
          />
          <SecurityRow
            icon={Key}
            label="Identity Key"
            value={info.keyChanged ? "Changed ⚠️" : info.peerHasKeys ? "Stable" : "None"}
            active={info.peerHasKeys && !info.keyChanged}
            warning={info.keyChanged}
          />
          <SecurityRow
            icon={Cpu}
            label="Device Session"
            value={info.deviceId ? info.deviceId.slice(0, 8) + "…" : "N/A"}
            active={!!info.deviceId}
            mono
          />

          {/* Safety Number */}
          {safetyNumber && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.1)" }}>
              <button
                onClick={() => { setShowSafetyNumber(!showSafetyNumber); haptic("light"); }}
                className="w-full flex items-center gap-2 text-left"
              >
                <Fingerprint className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
                <span className="text-xs font-medium flex-1" style={{ color: "hsl(var(--hud-text))" }}>
                  Safety Number
                </span>
                <Badge variant="outline" className="text-[9px]" style={{
                  borderColor: "hsl(var(--hud-cyan) / 0.2)",
                  color: "hsl(var(--hud-cyan))",
                }}>
                  Tap to {showSafetyNumber ? "hide" : "verify"}
                </Badge>
              </button>

              <AnimatePresence>
                {showSafetyNumber && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 rounded-xl text-center" style={{
                      background: "hsl(var(--hud-surface))",
                      border: "1px solid hsl(var(--hud-border) / 0.1)",
                    }}>
                      <p className="font-mono text-xs leading-relaxed tracking-wider" style={{ color: "hsl(var(--hud-text))" }}>
                        {safetyNumber}
                      </p>
                      <p className="text-[10px] mt-2" style={{ color: "hsl(var(--hud-text-dim))" }}>
                        Compare this number with {peerName} to verify identity
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Key changed warning */}
        {info.keyChanged && (
          <div className="mx-6 mb-4 p-3 rounded-xl flex items-start gap-2" style={{
            background: "hsl(var(--hud-warning) / 0.08)",
            border: "1px solid hsl(var(--hud-warning) / 0.2)",
          }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--hud-warning))" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "hsl(var(--hud-warning))" }}>
                Identity key changed
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim))" }}>
                {peerName} may have reinstalled the app or is using a new device. Verify their safety number.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onOpenChange(false)}
            style={{
              background: "hsl(var(--hud-surface))",
              borderColor: "hsl(var(--hud-border) / 0.2)",
              color: "hsl(var(--hud-text))",
            }}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SecurityRow({ icon: Icon, label, value, active, warning, mono }: {
  icon: typeof Lock;
  label: string;
  value: string;
  active: boolean;
  warning?: boolean;
  mono?: boolean;
}) {
  const color = warning
    ? "hsl(var(--hud-warning))"
    : active
      ? "hsl(var(--hud-success))"
      : "hsl(var(--hud-text-dim) / 0.4)";

  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
      <span className="text-xs flex-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
        {label}
      </span>
      <span className={`text-xs font-medium ${mono ? "font-mono" : ""}`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}
