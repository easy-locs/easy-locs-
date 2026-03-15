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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import OrbitSessionManager from "./OrbitSessionManager";
import OrbitPrivacyBadge from "./OrbitPrivacyBadge";
import { wipeAllKeys, hasIdentityKeys } from "@/lib/orbit-keystore";

interface OrbitSecuritySettingsProps {
  userId: string;
}

// ─── Section Component ────────────────────────────────────
function SettingSection({ icon: Icon, title, children, iconColor }: {
  icon: any; title: string; children: React.ReactNode; iconColor?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
          background: "hsl(var(--hud-surface))",
          border: "1px solid hsl(var(--hud-border) / 0.1)",
        }}>
          <Icon className="h-4 w-4" style={{ color: iconColor || "hsl(var(--hud-cyan))" }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{title}</h3>
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
        <p className="text-sm" style={{ color: "hsl(var(--hud-text))" }}>{label}</p>
        {description && <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{description}</p>}
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

  // Load settings from DB on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("profiles").select(
        "privacy_read_receipts, privacy_typing_indicators, privacy_online_status, privacy_link_previews, orbit_notifications, orbit_message_preview, orbit_media_auto_download, default_disappear_ttl"
      ).eq("id", userId).single();
      if (data) {
        setReadReceipts((data as any).privacy_read_receipts ?? true);
        setTypingIndicators((data as any).privacy_typing_indicators ?? true);
        setOnlineStatus((data as any).privacy_online_status ?? true);
        setLinkPreviews((data as any).privacy_link_previews ?? true);
        setNotifications((data as any).orbit_notifications ?? true);
        setMessagePreview((data as any).orbit_message_preview ?? true);
        setMediaAutoDownload((data as any).orbit_media_auto_download ?? true);
        setAutoDeletePeriod((data as any).default_disappear_ttl || "off");
      }
      setLoaded(true);
    })();
    hasIdentityKeys(userId).then(setHasKeys);
  }, [userId]);

  // Persist a single setting to DB
  const persistSetting = useCallback(async (column: string, value: any) => {
    const { error } = await supabase.from("profiles").update({ [column]: value } as any).eq("id", userId);
    if (error) {
      console.error("[OrbitSettings] Failed to persist:", column, error);
      toast.error("Failed to save setting");
      return false;
    }
    return true;
  }, [userId]);

  const handleToggle = useCallback((
    setter: (v: boolean) => void,
    column: string,
    currentValue: boolean,
  ) => {
    const newVal = !currentValue;
    setter(newVal);
    persistSetting(column, newVal).then(ok => {
      if (!ok) setter(currentValue); // rollback
    });
  }, [persistSetting]);

  const handleAutoDeleteChange = useCallback((value: string) => {
    setAutoDeletePeriod(value);
    persistSetting("default_disappear_ttl", value === "off" ? null : value).then(ok => {
      if (!ok) setAutoDeletePeriod(autoDeletePeriod); // rollback
    });
  }, [persistSetting, autoDeletePeriod]);

  const handle2FAEnroll = async () => {
    setEnrolling2FA(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      if (data?.totp?.qr_code) {
        setQrCode(data.totp.qr_code);
        toast.info("Scannez le QR code avec votre app d'authentification");
      }
    } catch (err: any) {
      toast.error(err.message || "Échec de la configuration 2FA");
    } finally {
      setEnrolling2FA(false);
    }
  };

  const handleWipeKeys = async () => {
    if (!confirm("⚠️ Supprimer toutes les clés de chiffrement de cet appareil ? Vous ne pourrez plus déchiffrer les anciens messages chiffrés.")) return;
    await wipeAllKeys();
    setHasKeys(false);
    toast.success("Clés de chiffrement supprimées de cet appareil");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4" style={{ background: "hsl(var(--hud-bg))" }}>
    <div className="space-y-1 max-w-lg mx-auto pb-24">
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3 pb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
          background: "linear-gradient(135deg, hsl(var(--hud-success) / 0.15), hsl(var(--hud-cyan) / 0.1))",
          border: "1px solid hsl(var(--hud-success) / 0.2)",
        }}>
          <ShieldCheck className="h-6 w-6" style={{ color: "hsl(var(--hud-success))" }} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: "hsl(var(--hud-text))" }}>
            {t("orbit.privacy_title") || "Orbit Privacy"}
          </h2>
          <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>
            {t("orbit.privacy_subtitle") || "Signal-inspired privacy standard"}
          </p>
        </div>
        <OrbitPrivacyBadge encrypted />
      </div>

      {/* ═══ E2E Status Banner ═══ */}
      <div className="rounded-xl p-4 mb-2" style={{
        background: "linear-gradient(135deg, hsl(var(--hud-success) / 0.08), hsl(var(--hud-cyan) / 0.05))",
        border: "1px solid hsl(var(--hud-success) / 0.15)",
      }}>
        <div className="flex items-center gap-2.5 mb-2">
          <Lock className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
          <span className="text-sm font-semibold" style={{ color: "hsl(var(--hud-success))" }}>
            {t("orbit.e2e_active") || "Chiffrement de bout en bout actif"}
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--hud-text-dim))" }}>
          {t("orbit.e2e_description") || "Les messages, appels et fichiers partagés sont chiffrés sur votre appareil avant l'envoi. Le serveur ne peut pas lire vos contenus."}
        </p>
        {hasKeys && (
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "hsl(var(--hud-success))" }} />
            <span className="text-[11px]" style={{ color: "hsl(var(--hud-success) / 0.7)" }}>
              {t("orbit.keys_present") || "Clés d'identité présentes sur cet appareil"}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6 pt-2">
        {/* ═══ Two-Factor Authentication ═══ */}
        <SettingSection icon={Fingerprint} title="Authentification à deux facteurs" iconColor="hsl(var(--hud-purple))">
          {qrCode ? (
            <div className="text-center space-y-3 py-2">
              <div className="inline-block p-2 rounded-xl bg-white">
                <img src={qrCode} alt="2FA QR Code" className="w-44 h-44 rounded-lg" />
              </div>
              <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim))" }}>
                Scannez avec Google Authenticator, Authy ou toute app TOTP
              </p>
              <Button size="sm" variant="outline" onClick={() => setQrCode(null)}
                style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))" }}>
                Terminé
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handle2FAEnroll} disabled={enrolling2FA} className="gap-2"
              style={{ borderColor: "hsl(var(--hud-border) / 0.2)", color: "hsl(var(--hud-text))", background: "hsl(var(--hud-surface))" }}>
              <KeyRound className="h-4 w-4" />
              {enrolling2FA ? "Configuration..." : "Activer la 2FA"}
            </Button>
          )}
        </SettingSection>

        <Separator style={{ background: "hsl(var(--hud-border) / 0.08)" }} />

        {/* ═══ Privacy Controls ═══ */}
        <SettingSection icon={Eye} title="Confidentialité" iconColor="hsl(var(--hud-cyan))">
          <SettingRow label="Accusés de lecture" description="Les autres voient quand vous avez lu leurs messages">
            <Switch checked={readReceipts} onCheckedChange={() => handleToggle(setReadReceipts, "privacy_read_receipts", readReceipts)} disabled={!loaded} />
          </SettingRow>
          <SettingRow label="Statut en ligne" description="Montrer quand vous êtes en ligne">
            <Switch checked={onlineStatus} onCheckedChange={() => handleToggle(setOnlineStatus, "privacy_online_status", onlineStatus)} disabled={!loaded} />
          </SettingRow>
          <SettingRow label="Indicateur de saisie" description="Montrer quand vous écrivez un message">
            <Switch checked={typingIndicators} onCheckedChange={() => handleToggle(setTypingIndicators, "privacy_typing_indicators", typingIndicators)} disabled={!loaded} />
          </SettingRow>
          <SettingRow label="Aperçu des liens" description="Générer un aperçu pour les liens envoyés">
            <Switch checked={linkPreviews} onCheckedChange={() => handleToggle(setLinkPreviews, "privacy_link_previews", linkPreviews)} disabled={!loaded} />
          </SettingRow>
        </SettingSection>

        <Separator style={{ background: "hsl(var(--hud-border) / 0.08)" }} />

        {/* ═══ Disappearing Messages ═══ */}
        <SettingSection icon={Clock} title="Messages éphémères" iconColor="hsl(var(--hud-warning))">
          <SettingRow label="Suppression automatique" description="Tous les nouveaux messages seront supprimés après ce délai">
            <Select value={autoDeletePeriod} onValueChange={handleAutoDeleteChange} disabled={!loaded}>
              <SelectTrigger className="w-28 h-8 text-xs" style={{
                background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))",
              }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Désactivé</SelectItem>
                <SelectItem value="30s">30 secondes</SelectItem>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="1h">1 heure</SelectItem>
                <SelectItem value="24h">24 heures</SelectItem>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SettingSection>

        <Separator style={{ background: "hsl(var(--hud-border) / 0.08)" }} />

        {/* ═══ Notifications ═══ */}
        <SettingSection icon={Bell} title="Notifications" iconColor="hsl(var(--hud-cyan))">
          <SettingRow label="Notifications" description="Recevoir des notifications pour les nouveaux messages">
            <Switch checked={notifications} onCheckedChange={() => handleToggle(setNotifications, "orbit_notifications", notifications)} disabled={!loaded} />
          </SettingRow>
          <SettingRow label="Aperçu du message" description="Afficher le contenu dans la notification">
            <Switch checked={messagePreview} onCheckedChange={() => handleToggle(setMessagePreview, "orbit_message_preview", messagePreview)} disabled={!loaded} />
          </SettingRow>
        </SettingSection>

        <Separator style={{ background: "hsl(var(--hud-border) / 0.08)" }} />

        {/* ═══ Storage & Data ═══ */}
        <SettingSection icon={Database} title="Stockage et données" iconColor="hsl(var(--hud-text-dim))">
          <SettingRow label="Téléchargement auto des médias" description="Télécharger automatiquement photos et vidéos">
            <Switch checked={mediaAutoDownload} onCheckedChange={() => handleToggle(setMediaAutoDownload, "orbit_media_auto_download", mediaAutoDownload)} disabled={!loaded} />
          </SettingRow>
        </SettingSection>

        <Separator style={{ background: "hsl(var(--hud-border) / 0.08)" }} />

        {/* ═══ Session Management ═══ */}
        <SettingSection icon={Smartphone} title="Appareils connectés" iconColor="hsl(var(--hud-cyan))">
          <OrbitSessionManager userId={userId} />
        </SettingSection>

        <Separator style={{ background: "hsl(var(--hud-border) / 0.08)" }} />

        {/* ═══ Advanced / Danger Zone ═══ */}
        <SettingSection icon={HardDrive} title="Avancé" iconColor="hsl(var(--hud-danger))">
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs"
              onClick={handleWipeKeys}
              style={{
                borderColor: "hsl(var(--hud-danger) / 0.3)",
                color: "hsl(var(--hud-danger))",
                background: "hsl(var(--hud-danger) / 0.05)",
              }}>
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer les clés de chiffrement
            </Button>
            <p className="text-[10px] leading-relaxed" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              Supprime les clés E2E de cet appareil. Les messages déjà chiffrés ne pourront plus être déchiffrés sur cet appareil.
            </p>
          </div>
        </SettingSection>
      </div>

      {/* ═══ Footer ═══ */}
      <div className="pt-6 text-center">
        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
          Orbit v1.0 — Signal-inspired privacy architecture
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.2)" }}>
          ECDH P-256 · AES-256-GCM · HKDF-SHA256
        </p>
      </div>
    </div>
    </div>
  );
}

/** Disappearing messages config component */
export function DisappearingMessagesToggle({
  threadId, currentTTL, onChange,
}: { threadId: string; currentTTL: string; onChange: (ttl: string) => void }) {
  const DISAPPEAR_OPTIONS = [
    { value: "off", label: "Off" },
    { value: "30s", label: "30 seconds" },
    { value: "5m", label: "5 minutes" },
    { value: "1h", label: "1 hour" },
    { value: "24h", label: "24 hours" },
    { value: "7d", label: "7 days" },
  ];

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-3.5 w-3.5" style={{ color: currentTTL !== "off" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.4)" }} />
      <Select value={currentTTL} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[11px] w-auto gap-1 border-0" style={{
          background: currentTTL !== "off" ? "hsl(var(--hud-cyan) / 0.1)" : "hsl(var(--hud-surface))",
          color: currentTTL !== "off" ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
        }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISAPPEAR_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.value === "off" ? "Off" : `⏱ ${opt.label}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
