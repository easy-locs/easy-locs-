/**
 * OrbitSecuritySettings — Signal-inspired Privacy & Security settings
 * Full settings interface with proper sections, i18n-ready labels,
 * and HUD-themed styling matching the Orbit design system.
 * ALL toggles persist to the profiles table in the database.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldCheck, Fingerprint, Eye, EyeOff, Clock, Lock, KeyRound,
  Smartphone, Bell, BellOff, MessageSquareOff, UserX, Image, Trash2,
  ChevronRight, Globe, Database, HardDrive,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as orbitSecRepo from "@/repositories/orbit-security.repository";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import OrbitSessionManager from "./OrbitSessionManager";
import OrbitPrivacyBadge from "./OrbitPrivacyBadge";
import { wipeAllKeys, hasIdentityKeys } from "@/lib/orbit-keystore";

interface OrbitSecuritySettingsProps {
  userId: string;
}

function SettingSection({ icon: Icon, title, children, iconColor }: {
  icon: any; title: string; children: React.ReactNode; iconColor?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border) / 0.1)",
        }}>
          <Icon className="h-4 w-4" style={{ color: iconColor || "hsl(var(--primary))" }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>{title}</h3>
      </div>
      <div className="ps-[42px] space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        {description && <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function OrbitSecuritySettings({ userId }: OrbitSecuritySettingsProps) {
  const { t } = useI18n();
  const [readReceipts, setReadReceipts] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [linkPreviews, setLinkPreviews] = useState(true);
  const [autoDeletePeriod, setAutoDeletePeriod] = useState("off");
  const [enrolling2FA, setEnrolling2FA] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [hasKeys, setHasKeys] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [mediaAutoDownload, setMediaAutoDownload] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const data = await orbitSecRepo.fetchOrbitPrivacySettings(userId);
      if (data) {
        setReadReceipts(data.privacy_read_receipts ?? true);
        setTypingIndicators(data.privacy_typing_indicators ?? true);
        setOnlineStatus(data.privacy_online_status ?? true);
        setLinkPreviews(data.privacy_link_previews ?? true);
        setNotifications(data.orbit_notifications ?? true);
        setMessagePreview(data.orbit_message_preview ?? true);
        setMediaAutoDownload(data.orbit_media_auto_download ?? true);
        setAutoDeletePeriod(data.default_disappear_ttl || "off");
      }
      setLoaded(true);
    })();
    hasIdentityKeys(userId).then(setHasKeys);
  }, [userId]);

  const persistSetting = useCallback(async (column: string, value: any) => {
    try {
      await orbitSecRepo.updateProfileField(userId, column, value);
      return true;
    } catch (error) {
      console.error("[OrbitSettings] Failed to persist:", column, error);
      toast.error(t("orbit.save_setting_failed"));
      return false;
    }
  }, [userId]);

  const handleToggle = useCallback((
    setter: (v: boolean) => void,
    column: string,
    currentValue: boolean,
  ) => {
    const newVal = !currentValue;
    setter(newVal);
    persistSetting(column, newVal).then(ok => {
      if (!ok) setter(currentValue);
    });
  }, [persistSetting]);

  const handleAutoDeleteChange = useCallback((value: string) => {
    setAutoDeletePeriod(value);
    persistSetting("default_disappear_ttl", value === "off" ? null : value).then(ok => {
      if (!ok) setAutoDeletePeriod(autoDeletePeriod);
    });
  }, [persistSetting, autoDeletePeriod]);

  const handle2FAEnroll = async () => {
    setEnrolling2FA(true);
    try {
      const { data, error } = await orbitSecRepo.enrollMfa2FA();
      if (error) throw error;
      if (data?.totp?.qr_code) {
        setQrCode(data.totp.qr_code);
        toast.info(t("orbit.scan_qr_auth"));
      }
    } catch (err: any) {
      console.error("[Security]", err.message);
      toast.error(t("orbit.2fa_setup_failed") || "2FA setup failed. Please try again.");
    } finally {
      setEnrolling2FA(false);
    }
  };

  const handleWipeKeys = async () => {
    if (!confirm(t("orbit.confirm_wipe_keys"))) return;
    await wipeAllKeys();
    setHasKeys(false);
    toast.success(t("orbit.keys_wiped"));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4" style={{ background: "hsl(var(--background))" }}>
    <div className="space-y-1 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
          background: "linear-gradient(135deg, hsl(var(--hud-success) / 0.15), hsl(var(--primary) / 0.1))",
          border: "1px solid hsl(var(--hud-success) / 0.2)",
        }}>
          <ShieldCheck className="h-6 w-6" style={{ color: "hsl(var(--hud-success))" }} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>
            {t("orbit.privacy_title")}
          </h2>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {t("orbit.privacy_subtitle")}
          </p>
        </div>
        <OrbitPrivacyBadge encrypted />
      </div>

      <div className="rounded-xl p-4 mb-2" style={{
        background: "linear-gradient(135deg, hsl(var(--hud-success) / 0.08), hsl(var(--primary) / 0.05))",
        border: "1px solid hsl(var(--hud-success) / 0.15)",
      }}>
        <div className="flex items-center gap-2.5 mb-2">
          <Lock className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--hud-success))" }}>
            {t("orbit.e2e_active")}
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
          {t("orbit.e2e_description")}
        </p>
        {hasKeys && (
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--hud-success))" }} />
            <span className="text-[11px]" style={{ color: "hsl(var(--hud-success) / 0.7)" }}>
              {t("orbit.keys_present")}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6 pt-2">
        <SettingSection icon={Fingerprint} title={t("orbit.2fa_title")} iconColor="hsl(var(--hud-purple))">
          {qrCode ? (
            <div className="text-center space-y-3 py-2">
              <div className="inline-block p-2 rounded-xl bg-white">
                <img src={qrCode} alt="2FA QR Code" className="w-44 h-44 rounded-lg" />
              </div>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                {t("orbit.security.scan_totp")}
              </p>
              <Button size="sm" variant="outline" onClick={() => setQrCode(null)}
                style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--foreground))" }}>
                {t("orbit.security.done")}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handle2FAEnroll} disabled={enrolling2FA} className="gap-2"
              style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--foreground))", background: "hsl(var(--card))" }}>
              <KeyRound className="h-4 w-4" />
              {enrolling2FA ? t("orbit.security.configuring") : t("orbit.security.enable_2fa")}
            </Button>
          )}
        </SettingSection>

        <Separator style={{ background: "hsl(var(--border) / 0.08)" }} />

        <SettingSection icon={Eye} title={t("orbit.privacy_controls")} iconColor="hsl(var(--primary))">
          <SettingRow label={t("orbit.read_receipts")} description={t("orbit.read_receipts_desc")}>
            <Switch checked={readReceipts} onCheckedChange={() => handleToggle(setReadReceipts, "privacy_read_receipts", readReceipts)} disabled={!loaded} />
          </SettingRow>
          <SettingRow label={t("orbit.online_status")} description={t("orbit.online_status_desc")}>
            <Switch checked={onlineStatus} onCheckedChange={() => handleToggle(setOnlineStatus, "privacy_online_status", onlineStatus)} disabled={!loaded} />
          </SettingRow>
          <SettingRow label={t("orbit.typing_indicator")} description={t("orbit.typing_indicator_desc")}>
            <Switch checked={typingIndicators} onCheckedChange={() => handleToggle(setTypingIndicators, "privacy_typing_indicators", typingIndicators)} disabled={!loaded} />
          </SettingRow>
          <SettingRow label={t("orbit.link_preview")} description={t("orbit.link_preview_desc")}>
            <Switch checked={linkPreviews} onCheckedChange={() => handleToggle(setLinkPreviews, "privacy_link_previews", linkPreviews)} disabled={!loaded} />
          </SettingRow>
        </SettingSection>

        <Separator style={{ background: "hsl(var(--border) / 0.08)" }} />

        <SettingSection icon={Clock} title={t("orbit.disappearing_messages")} iconColor="hsl(var(--hud-warning))">
          <SettingRow label={t("orbit.security.auto_delete")} description={t("orbit.security.auto_delete_desc")}>
            <Select value={autoDeletePeriod} onValueChange={handleAutoDeleteChange} disabled={!loaded}>
              <SelectTrigger className="w-28 h-8 text-xs" style={{
                background: "hsl(var(--card))", borderColor: "hsl(var(--border) / 0.15)", color: "hsl(var(--foreground))",
              }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">{t("orbit.security.disabled")}</SelectItem>
                <SelectItem value="30s">{t("orbit.security.30s")}</SelectItem>
                <SelectItem value="5m">{t("orbit.security.5m")}</SelectItem>
                <SelectItem value="1h">{t("orbit.security.1h")}</SelectItem>
                <SelectItem value="24h">{t("orbit.security.24h")}</SelectItem>
                <SelectItem value="7d">{t("orbit.security.7d")}</SelectItem>
                <SelectItem value="30d">{t("orbit.security.30d")}</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingSection>

        <Separator style={{ background: "hsl(var(--border) / 0.08)" }} />

        <SettingSection icon={Bell} title={t("orbit.notifications")} iconColor="hsl(var(--primary))">
          <SettingRow label={t("orbit.security.notifications_label")} description={t("orbit.security.notifications_desc")}>
            <Switch checked={notifications} onCheckedChange={() => handleToggle(setNotifications, "orbit_notifications", notifications)} disabled={!loaded} />
          </SettingRow>
          <SettingRow label={t("orbit.security.message_preview")} description={t("orbit.security.message_preview_desc")}>
            <Switch checked={messagePreview} onCheckedChange={() => handleToggle(setMessagePreview, "orbit_message_preview", messagePreview)} disabled={!loaded} />
          </SettingRow>
        </SettingSection>

        <Separator style={{ background: "hsl(var(--border) / 0.08)" }} />

        <SettingSection icon={Database} title={t("orbit.storage_data")} iconColor="hsl(var(--muted-foreground))">
          <SettingRow label={t("orbit.security.media_auto_download")} description={t("orbit.security.media_auto_download_desc")}>
            <Switch checked={mediaAutoDownload} onCheckedChange={() => handleToggle(setMediaAutoDownload, "orbit_media_auto_download", mediaAutoDownload)} disabled={!loaded} />
          </SettingRow>
        </SettingSection>

        <Separator style={{ background: "hsl(var(--border) / 0.08)" }} />

        <SettingSection icon={Smartphone} title={t("orbit.connected_devices")} iconColor="hsl(var(--primary))">
          <OrbitSessionManager userId={userId} />
        </SettingSection>

        <Separator style={{ background: "hsl(var(--border) / 0.08)" }} />

        <SettingSection icon={HardDrive} title={t("orbit.advanced")} iconColor="hsl(var(--hud-danger))">
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs"
              onClick={handleWipeKeys}
              style={{
                borderColor: "hsl(var(--hud-danger) / 0.3)",
                color: "hsl(var(--hud-danger))",
                background: "hsl(var(--hud-danger) / 0.05)",
              }}>
              <Trash2 className="h-3.5 w-3.5" />
              {t("orbit.security.wipe_keys")}
            </Button>
            <p className="text-[10px] leading-relaxed" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
              {t("orbit.security.wipe_keys_desc")}
            </p>
          </div>
        </SettingSection>
      </div>

      <div className="pt-6 text-center">
        <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }}>
          {t("orbit.version")} — {t("orbit.security.footer_arch")}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.2)" }}>
          ECDH P-256 · AES-256-GCM · HKDF-SHA256
        </p>
      </div>
    </div>
    </div>
  );
}

export function DisappearingMessagesToggle({
  threadId, currentTTL, onChange,
}: { threadId: string; currentTTL: string; onChange: (ttl: string) => void }) {
  const { t } = useI18n();
  const DISAPPEAR_OPTIONS = [
    { value: "off", label: t("orbit.security.off") },
    { value: "30s", label: t("orbit.security.30s") },
    { value: "5m", label: t("orbit.security.5m") },
    { value: "1h", label: t("orbit.security.1h") },
    { value: "24h", label: t("orbit.security.24h") },
    { value: "7d", label: t("orbit.security.7d") },
  ];

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-3.5 w-3.5" style={{ color: currentTTL !== "off" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)" }} />
      <Select value={currentTTL} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[11px] w-auto gap-1 border-0" style={{
          background: currentTTL !== "off" ? "hsl(var(--primary) / 0.1)" : "hsl(var(--card))",
          color: currentTTL !== "off" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISAPPEAR_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.value === "off" ? t("orbit.security.off") : `⏱ ${opt.label}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
