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
import { useI18n } from "@/lib/i18n";

interface Props {
  peerId: string;
  peerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useLevelConfig() {
  const { t } = useI18n();
  return {
    none: {
      icon: ShieldX,
      label: t("orbit.security.not_encrypted"),
      color: "hsl(var(--hud-danger))",
      bg: "hsl(var(--hud-danger) / 0.08)",
      description: t("orbit.security.not_encrypted_desc"),
    },
    encrypted: {
      icon: ShieldCheck,
      label: t("orbit.security.encrypted"),
      color: "hsl(var(--hud-success))",
      bg: "hsl(var(--hud-success) / 0.08)",
      description: t("orbit.security.encrypted_desc"),
    },
    verified: {
      icon: ShieldCheck,
      label: t("orbit.security.verified"),
      color: "hsl(var(--primary))",
      bg: "hsl(var(--primary) / 0.08)",
      description: t("orbit.security.verified_desc"),
    },
    key_changed: {
      icon: ShieldAlert,
      label: t("orbit.security.key_changed"),
      color: "hsl(var(--hud-warning))",
      bg: "hsl(var(--hud-warning) / 0.08)",
      description: t("orbit.security.key_changed_desc"),
    },
  } as Record<SecurityLevel, { icon: typeof Shield; label: string; color: string; bg: string; description: string }>;
}

export default function OrbitSecurityPanel({ peerId, peerName, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { getSecurityInfo, getSafetyNumber } = useOrbitEncryption(user?.id);
  const [info, setInfo] = useState<SessionSecurityInfo | null>(null);
  const [safetyNumber, setSafetyNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);
  const LEVEL_CONFIG = useLevelConfig();

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
        background: "hsl(var(--background))",
        border: "1px solid hsl(var(--border) / 0.2)",
      }}>
        <div className="p-6 pb-4" style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
          <DialogHeader>
            <DialogTitle className="sr-only">{t("orbit.security.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center">
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
                background: "hsl(var(--card))",
                border: `2px solid ${config.color}40`,
              }}>
                <IconComponent className="h-8 w-8" style={{ color: config.color }} />
              </div>
              {info.level === "encrypted" && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${config.color}` }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              )}
            </motion.div>

            <h3 className="text-base font-bold mb-1" style={{ color: "hsl(var(--foreground))" }}>
              {config.label}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
              {config.description}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          <SecurityRow
            icon={Lock}
            label={t("orbit.security.e2e")}
            value={info.peerHasKeys ? t("orbit.security.active") : t("orbit.security.unavailable")}
            active={info.peerHasKeys}
          />
          <SecurityRow
            icon={RefreshCw}
            label={t("orbit.security.double_ratchet")}
            value={info.ratchetActive ? t("orbit.security.active") : t("orbit.security.pending")}
            active={info.ratchetActive}
          />
          <SecurityRow
            icon={Key}
            label={t("orbit.security.identity_key")}
            value={info.keyChanged ? t("orbit.security.changed") : info.peerHasKeys ? t("orbit.security.stable") : t("orbit.security.none")}
            active={info.peerHasKeys && !info.keyChanged}
            warning={info.keyChanged}
          />
          <SecurityRow
            icon={Cpu}
            label={t("orbit.security.device_session")}
            value={info.deviceId ? info.deviceId.slice(0, 8) + "…" : "—"}
            active={!!info.deviceId}
            mono
          />

          {safetyNumber && (
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid hsl(var(--border) / 0.1)" }}>
              <button
                onClick={() => { setShowSafetyNumber(!showSafetyNumber); haptic("light"); }}
                className="w-full flex items-center gap-2 text-left"
              >
                <Fingerprint className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-xs font-medium flex-1" style={{ color: "hsl(var(--foreground))" }}>
                  {t("orbit.security.safety_number")}
                </span>
                <Badge variant="outline" className="text-[0.625rem]" style={{
                  borderColor: "hsl(var(--primary) / 0.2)",
                  color: "hsl(var(--primary))",
                }}>
                  {showSafetyNumber ? t("orbit.security.tap_to_hide") : t("orbit.security.tap_to_verify")}
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
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border) / 0.1)",
                    }}>
                      <p className="font-mono text-xs leading-relaxed tracking-wider" style={{ color: "hsl(var(--foreground))" }}>
                        {safetyNumber}
                      </p>
                      <p className="text-[0.625rem] mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {t("orbit.security.compare_number", { name: peerName })}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {info.keyChanged && (
          <div className="mx-6 mb-4 p-3 rounded-xl flex items-start gap-2" style={{
            background: "hsl(var(--hud-warning) / 0.08)",
            border: "1px solid hsl(var(--hud-warning) / 0.2)",
          }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--hud-warning))" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "hsl(var(--hud-warning))" }}>
                {t("orbit.security.identity_changed")}
              </p>
              <p className="text-[0.625rem] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.security.identity_changed_desc", { name: peerName })}
              </p>
            </div>
          </div>
        )}

        <div className="px-6 pb-6">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onOpenChange(false)}
            style={{
              background: "hsl(var(--card))",
              borderColor: "hsl(var(--border) / 0.2)",
              color: "hsl(var(--foreground))",
            }}
          >
            {t("orbit.security.close")}
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
      : "hsl(var(--muted-foreground) / 0.4)";

  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
      <span className="text-xs flex-1" style={{ color: "hsl(var(--muted-foreground))" }}>
        {label}
      </span>
      <span className={`text-xs font-medium ${mono ? "font-mono" : ""}`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}
