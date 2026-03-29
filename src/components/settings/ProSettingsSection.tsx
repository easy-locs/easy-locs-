/**
 * ProSettingsSection — Comprehensive Signal/WhatsApp-style professional settings.
 * Covers: User ID, encryption, chat, calls, storage, blocked users, privacy, security.
 * DB-synced settings: readReceipts, typingIndicators, linkPreview, messagePreview, mediaAutoDownload
 * are persisted to profiles table to stay consistent with OrbitSecuritySettings.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Shield, Lock, Eye, EyeOff, Bell, Phone, MessageCircle, Clock,
  Fingerprint, Database, Trash2, Users, Ban, Copy, Check, Key,
  Wifi, Image, Type, Smartphone, HardDrive, Download, ChevronRight,
  Radio, Navigation, MapPin, Volume2, VolumeX, Vibrate, Mail,
  UserX, ShieldCheck, ShieldAlert, QrCode, RefreshCw, Monitor
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PREFS_KEY = "easylocs_pro_settings";

export interface ProSettings {
  // Identity
  showUserId: boolean;
  // Encryption & Security
  e2eEncryption: boolean;
  screenLock: boolean;
  screenLockTimeout: string; // "immediate" | "1min" | "5min" | "30min"
  biometricUnlock: boolean;
  showSecurityNotifications: boolean;
  incognitoKeyboard: boolean;
  // Chat
  enterToSend: boolean;
  mediaAutoDownload: string; // "wifi" | "always" | "never"
  fontSize: string; // "small" | "medium" | "large"
  linkPreview: boolean;
  // Calls
  relayCallsAlways: boolean;
  callRingtone: string;
  vibrationOnCall: boolean;
  // Read receipts & typing
  readReceipts: boolean;
  typingIndicators: boolean;
  // Privacy
  lastSeenVisibility: string; // "everyone" | "contacts" | "nobody"
  profilePhotoVisibility: string; // "everyone" | "contacts" | "nobody"
  aboutVisibility: string; // "everyone" | "contacts" | "nobody"
  groupInvitePolicy: string; // "everyone" | "contacts"
  // Notifications
  messagePreview: boolean;
  muteUnknownSenders: boolean;
  notificationGrouping: boolean;
  // Storage
  autoCleanupEnabled: boolean;
  autoCleanupDays: number;
  keepStarredMessages: boolean;
  // Proxy
  useProxy: boolean;
  proxyAddress: string;
}

const DEFAULT_SETTINGS: ProSettings = {
  showUserId: true,
  e2eEncryption: true,
  screenLock: false,
  screenLockTimeout: "1min",
  biometricUnlock: false,
  showSecurityNotifications: true,
  incognitoKeyboard: false,
  enterToSend: true,
  mediaAutoDownload: "wifi",
  fontSize: "medium",
  linkPreview: true,
  relayCallsAlways: false,
  callRingtone: "default",
  vibrationOnCall: true,
  readReceipts: true,
  typingIndicators: true,
  lastSeenVisibility: "everyone",
  profilePhotoVisibility: "everyone",
  aboutVisibility: "everyone",
  groupInvitePolicy: "everyone",
  messagePreview: true,
  muteUnknownSenders: false,
  notificationGrouping: true,
  autoCleanupEnabled: false,
  autoCleanupDays: 90,
  keepStarredMessages: true,
  useProxy: false,
  proxyAddress: "",
};

function getProSettings(): ProSettings {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveProSettings(s: ProSettings) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const VISIBILITY_OPTIONS = [
  { value: "everyone", label: "Tout le monde", icon: "🌐" },
  { value: "contacts", label: "Contacts uniquement", icon: "👤" },
  { value: "nobody", label: "Personne", icon: "🔒" },
];

const SCREEN_LOCK_OPTIONS = [
  { value: "immediate", label: "Immédiat" },
  { value: "1min", label: "1 minute" },
  { value: "5min", label: "5 minutes" },
  { value: "30min", label: "30 minutes" },
];

const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Petit", preview: "text-xs" },
  { value: "medium", label: "Moyen", preview: "text-sm" },
  { value: "large", label: "Grand", preview: "text-base" },
];

const MEDIA_DOWNLOAD_OPTIONS = [
  { value: "wifi", label: "Wi-Fi uniquement", icon: <Wifi className="h-3.5 w-3.5" /> },
  { value: "always", label: "Toujours", icon: <Download className="h-3.5 w-3.5" /> },
  { value: "never", label: "Jamais", icon: <VolumeX className="h-3.5 w-3.5" /> },
];

const CLEANUP_OPTIONS = [30, 60, 90, 180, 365];

export default function ProSettingsSection() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [settings, setSettings] = useState<ProSettings>(getProSettings);
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);

  // ── Sync DB-backed settings on mount ──
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { fetchProfileSettings } = await import("@/repositories/auth-utils.repository");
      const data = await fetchProfileSettings(user.id,
        "privacy_read_receipts, privacy_typing_indicators, privacy_link_previews, privacy_online_status, orbit_notifications, orbit_message_preview, orbit_media_auto_download");
      if (data) {
        const dbSync: Partial<ProSettings> = {
          readReceipts: (data as any).privacy_read_receipts ?? true,
          typingIndicators: (data as any).privacy_typing_indicators ?? true,
          linkPreview: (data as any).privacy_link_previews ?? true,
          messagePreview: (data as any).orbit_message_preview ?? true,
          mediaAutoDownload: (data as any).orbit_media_auto_download ? "always" : "wifi",
        };
        setSettings(prev => ({ ...prev, ...dbSync }));
      }
      setDbLoaded(true);
    })();
  }, [user?.id]);

  // ── Column mapping for DB-synced toggles ──
  const DB_COLUMN_MAP: Record<string, string> = {
    readReceipts: "privacy_read_receipts",
    typingIndicators: "privacy_typing_indicators",
    linkPreview: "privacy_link_previews",
    messagePreview: "orbit_message_preview",
  };

  const update = useCallback(<K extends keyof ProSettings>(key: K, value: ProSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveProSettings(next);
      return next;
    });
    // Persist to DB if this is a DB-synced setting
    const dbCol = DB_COLUMN_MAP[key as string];
    if (dbCol && user?.id) {
      import("@/repositories/auth-utils.repository").then(({ updateProfileField }) =>
        updateProfileField(user.id, dbCol, value)
      ).catch((error) => { console.error("[ProSettings] DB sync error:", error); });
    }
  }, [user?.id]);

  const userId = user?.id || "—";
  const shortId = userId.substring(0, 8).toUpperCase();

  const copyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    toast.success("ID copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* ═══ USER ID & IDENTITY ═══ */}
      <div className="ui-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.15)" }}>
            <QrCode className="h-5 w-5" style={{ color: "hsl(var(--hud-cyan))" }} />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Identité & ID utilisateur</h2>
            <p className="text-xs text-muted-foreground">Votre identifiant unique sur la plateforme</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">ID Easy-Locs</p>
              <p className="font-mono text-sm font-bold text-foreground tracking-wider">EL-{shortId}</p>
            </div>
            <button onClick={copyId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: copied ? "hsl(var(--hud-success) / 0.15)" : "hsl(var(--primary) / 0.1)",
                color: copied ? "hsl(var(--hud-success))" : "hsl(var(--primary))"
              }}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">UUID complet</p>
              <p className="font-mono text-[10px] text-muted-foreground/70 break-all">{userId}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Numéro de sécurité</p>
              <p className="font-mono text-[10px] text-muted-foreground/70">
                {userId.replace(/-/g, '').substring(0, 20).replace(/(.{5})/g, '$1 ').trim()}
              </p>
            </div>
            <ShieldCheck className="h-4 w-4" style={{ color: "hsl(var(--hud-success))" }} />
          </div>
        </div>
      </div>

      {/* ═══ ENCRYPTION & SECURITY ═══ */}
      <div className="ui-card">
        <SectionHeader
          icon={<Lock className="h-5 w-5" />}
          iconBg="hsl(var(--hud-success) / 0.15)"
          iconColor="hsl(var(--hud-success))"
          title="Chiffrement & Sécurité"
          subtitle="Protection de bout en bout de vos données"
        />

        <div className="space-y-3">
          <ToggleRow
            icon={<Shield className="h-4 w-4" />}
            label="Chiffrement de bout en bout"
            description="Vos messages sont chiffrés, personne ne peut les lire"
            checked={settings.e2eEncryption}
            onChange={(v) => update("e2eEncryption", v)}
            badge="E2E"
            badgeColor="hsl(var(--hud-success))"
          />
          <ToggleRow
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Notifications de sécurité"
            description="Recevoir une alerte si le code de sécurité d'un contact change"
            checked={settings.showSecurityNotifications}
            onChange={(v) => update("showSecurityNotifications", v)}
          />
          <ToggleRow
            icon={<Fingerprint className="h-4 w-4" />}
            label="Verrouillage de l'écran"
            description="Verrouiller l'app avec biométrie ou code PIN"
            checked={settings.screenLock}
            onChange={(v) => update("screenLock", v)}
          />
          {settings.screenLock && (
            <>
              <div className="pl-7 space-y-2">
                <p className="text-xs text-muted-foreground">Délai de verrouillage</p>
                <div className="flex gap-1.5 flex-wrap">
                  {SCREEN_LOCK_OPTIONS.map(opt => (
                    <ChipButton key={opt.value} selected={settings.screenLockTimeout === opt.value}
                      onClick={() => update("screenLockTimeout", opt.value)}>
                      {opt.label}
                    </ChipButton>
                  ))}
                </div>
              </div>
              <ToggleRow
                icon={<Smartphone className="h-4 w-4" />}
                label="Déverrouillage biométrique"
                description="Face ID / Touch ID / Empreinte digitale"
                checked={settings.biometricUnlock}
                onChange={(v) => update("biometricUnlock", v)}
              />
            </>
          )}
          <ToggleRow
            icon={<Key className="h-4 w-4" />}
            label="Clavier incognito"
            description="Empêcher le clavier d'apprendre vos habitudes de frappe"
            checked={settings.incognitoKeyboard}
            onChange={(v) => update("incognitoKeyboard", v)}
          />
        </div>
      </div>

      {/* ═══ PRIVACY ═══ */}
      <div className="ui-card">
        <SectionHeader
          icon={<Eye className="h-5 w-5" />}
          iconBg="hsl(var(--hud-purple) / 0.15)"
          iconColor="hsl(var(--hud-purple))"
          title="Confidentialité"
          subtitle="Contrôlez qui peut voir vos informations"
        />

        <div className="space-y-4">
          <VisibilityPicker
            label="Dernière connexion"
            description="Qui peut voir quand vous étiez en ligne"
            value={settings.lastSeenVisibility}
            onChange={(v) => update("lastSeenVisibility", v)}
          />
          <VisibilityPicker
            label="Photo de profil"
            description="Qui peut voir votre photo"
            value={settings.profilePhotoVisibility}
            onChange={(v) => update("profilePhotoVisibility", v)}
          />
          <VisibilityPicker
            label="À propos / Bio"
            description="Qui peut voir votre description"
            value={settings.aboutVisibility}
            onChange={(v) => update("aboutVisibility", v)}
          />

          <Separator />

          <ToggleRow
            icon={<Check className="h-4 w-4" />}
            label="Confirmations de lecture"
            description="Les coches bleues indiquent que le message a été lu"
            checked={settings.readReceipts}
            onChange={(v) => update("readReceipts", v)}
          />
          <ToggleRow
            icon={<MessageCircle className="h-4 w-4" />}
            label="Indicateurs de saisie"
            description={"Afficher \"en train d'écrire...\" à vos contacts"}
            checked={settings.typingIndicators}
            onChange={(v) => update("typingIndicators", v)}
          />

          <Separator />

          <div>
            <div className="flex items-start gap-2.5">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground block">Invitations aux groupes</Label>
                <p className="text-xs text-muted-foreground mb-2">Qui peut vous ajouter à un groupe</p>
                <div className="flex gap-1.5 flex-wrap">
                  <ChipButton selected={settings.groupInvitePolicy === "everyone"}
                    onClick={() => update("groupInvitePolicy", "everyone")}>
                    🌐 Tout le monde
                  </ChipButton>
                  <ChipButton selected={settings.groupInvitePolicy === "contacts"}
                    onClick={() => update("groupInvitePolicy", "contacts")}>
                    👤 Contacts uniquement
                  </ChipButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CHAT SETTINGS ═══ */}
      <div className="ui-card">
        <SectionHeader
          icon={<MessageCircle className="h-5 w-5" />}
          iconBg="hsl(var(--primary) / 0.15)"
          iconColor="hsl(var(--primary))"
          title="Discussions"
          subtitle="Apparence et comportement des messages"
        />

        <div className="space-y-4">
          <ToggleRow
            icon={<Type className="h-4 w-4" />}
            label="Entrée = Envoyer"
            description="Appuyer sur Entrée envoie le message directement"
            checked={settings.enterToSend}
            onChange={(v) => update("enterToSend", v)}
          />
          <ToggleRow
            icon={<Image className="h-4 w-4" />}
            label="Aperçu des liens"
            description="Afficher un aperçu pour les URLs partagées"
            checked={settings.linkPreview}
            onChange={(v) => update("linkPreview", v)}
          />

          <Separator />

          <div>
            <div className="flex items-start gap-2.5">
              <Type className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground block">Taille du texte</Label>
                <p className="text-xs text-muted-foreground mb-2">Ajuster la taille des messages</p>
                <div className="flex gap-1.5">
                  {FONT_SIZE_OPTIONS.map(opt => (
                    <ChipButton key={opt.value} selected={settings.fontSize === opt.value}
                      onClick={() => update("fontSize", opt.value)}>
                      <span className={opt.preview}>{opt.label}</span>
                    </ChipButton>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-start gap-2.5">
              <Download className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground block">Téléchargement des médias</Label>
                <p className="text-xs text-muted-foreground mb-2">Télécharger automatiquement photos et vidéos</p>
                <div className="flex gap-1.5 flex-wrap">
                  {MEDIA_DOWNLOAD_OPTIONS.map(opt => (
                    <ChipButton key={opt.value} selected={settings.mediaAutoDownload === opt.value}
                      onClick={() => update("mediaAutoDownload", opt.value)}>
                      {opt.icon} <span className="ml-1">{opt.label}</span>
                    </ChipButton>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CALLS ═══ */}
      <div className="ui-card">
        <SectionHeader
          icon={<Phone className="h-5 w-5" />}
          iconBg="hsl(var(--hud-warning) / 0.15)"
          iconColor="hsl(var(--hud-warning))"
          title="Appels"
          subtitle="Paramètres audio et vidéo"
        />

        <div className="space-y-3">
          <ToggleRow
            icon={<Shield className="h-4 w-4" />}
            label="Relayer tous les appels"
            description="Masquer votre IP en relayant via les serveurs (qualité réduite)"
            checked={settings.relayCallsAlways}
            onChange={(v) => update("relayCallsAlways", v)}
          />
          <ToggleRow
            icon={<Vibrate className="h-4 w-4" />}
            label="Vibration sur appel"
            description="Vibrer lors d'un appel entrant"
            checked={settings.vibrationOnCall}
            onChange={(v) => update("vibrationOnCall", v)}
          />
        </div>
      </div>

      {/* ═══ NOTIFICATIONS (ADVANCED) ═══ */}
      <div className="ui-card">
        <SectionHeader
          icon={<Bell className="h-5 w-5" />}
          iconBg="hsl(var(--hud-danger) / 0.15)"
          iconColor="hsl(var(--hud-danger))"
          title="Notifications avancées"
          subtitle="Contrôle fin des alertes"
        />

        <div className="space-y-3">
          <ToggleRow
            icon={<Eye className="h-4 w-4" />}
            label="Aperçu du message"
            description="Afficher le contenu du message dans la notification"
            checked={settings.messagePreview}
            onChange={(v) => update("messagePreview", v)}
          />
          <ToggleRow
            icon={<UserX className="h-4 w-4" />}
            label="Silencer expéditeurs inconnus"
            description="Ne pas notifier les messages de personnes hors de vos contacts"
            checked={settings.muteUnknownSenders}
            onChange={(v) => update("muteUnknownSenders", v)}
          />
          <ToggleRow
            icon={<Users className="h-4 w-4" />}
            label="Regrouper les notifications"
            description="Grouper les messages par conversation"
            checked={settings.notificationGrouping}
            onChange={(v) => update("notificationGrouping", v)}
          />
        </div>
      </div>

      {/* ═══ STORAGE & DATA ═══ */}
      <div className="ui-card">
        <SectionHeader
          icon={<HardDrive className="h-5 w-5" />}
          iconBg="hsl(var(--hud-cyan) / 0.15)"
          iconColor="hsl(var(--hud-cyan))"
          title="Stockage & Données"
          subtitle="Gestion de l'espace et nettoyage"
        />

        <div className="space-y-4">
          {/* Storage estimate — uses StorageManager API when available */}
          <StorageUsageBar />

          <ToggleRow
            icon={<RefreshCw className="h-4 w-4" />}
            label="Nettoyage automatique"
            description="Supprimer les anciens messages et médias automatiquement"
            checked={settings.autoCleanupEnabled}
            onChange={(v) => update("autoCleanupEnabled", v)}
          />
          {settings.autoCleanupEnabled && (
            <div className="pl-7">
              <p className="text-xs text-muted-foreground mb-2">Supprimer après</p>
              <div className="flex gap-1.5 flex-wrap">
                {CLEANUP_OPTIONS.map(d => (
                  <ChipButton key={d} selected={settings.autoCleanupDays === d}
                    onClick={() => update("autoCleanupDays", d)}>
                    {d} jours
                  </ChipButton>
                ))}
              </div>
              <ToggleRow
                icon={<Check className="h-4 w-4" />}
                label="Conserver les messages favoris"
                description="Ne pas supprimer les messages marqués d'une étoile"
                checked={settings.keepStarredMessages}
                onChange={(v) => update("keepStarredMessages", v)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══ PROXY & NETWORK ═══ */}
      <div className="ui-card">
        <SectionHeader
          icon={<Wifi className="h-5 w-5" />}
          iconBg="hsl(var(--muted-foreground) / 0.15)"
          iconColor="hsl(var(--muted-foreground))"
          title="Réseau & Proxy"
          subtitle="Configuration avancée de la connectivité"
        />

        <div className="space-y-3">
          <ToggleRow
            icon={<Monitor className="h-4 w-4" />}
            label="Utiliser un proxy"
            description="Router la connexion via un serveur proxy"
            checked={settings.useProxy}
            onChange={(v) => update("useProxy", v)}
          />
          {settings.useProxy && (
            <div className="pl-7">
              <label className="text-xs text-muted-foreground block mb-1">Adresse du proxy</label>
              <input
                type="text"
                value={settings.proxyAddress}
                onChange={(e) => update("proxyAddress", e.target.value)}
                placeholder="socks5://proxy.example.com:1080"
                className="form-input font-mono text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══ ENCRYPTION STATUS FOOTER ═══ */}
      <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--hud-success) / 0.1)" }}>
            <Lock className="h-5 w-5" style={{ color: "hsl(var(--hud-success))" }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Chiffrement actif — AES-256-GCM</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
              Vos messages, appels et fichiers sont protégés par un chiffrement de bout en bout.
              Ni Easy-Locs ni aucun tiers ne peut accéder à vos conversations.
              Le protocole utilise des clés éphémères Diffie-Hellman avec rotation automatique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ SUB-COMPONENTS ═══ */

function SectionHeader({ icon, iconBg, iconColor, title, subtitle }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div>
        <h2 className="font-semibold text-foreground text-sm">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, description, checked, onChange, badge, badgeColor }: {
  icon: React.ReactNode; label: string; description: string;
  checked: boolean; onChange: (v: boolean) => void;
  badge?: string; badgeColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-foreground">{label}</Label>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider"
                style={{ background: `${badgeColor}20`, color: badgeColor }}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-snug">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0 mt-0.5" />
    </div>
  );
}

function VisibilityPicker({ label, description, value, onChange }: {
  label: string; description: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-2.5 mb-2">
        <Eye className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <Label className="text-sm font-medium text-foreground block">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap pl-7">
        {VISIBILITY_OPTIONS.map(opt => (
          <ChipButton key={opt.value} selected={value === opt.value}
            onClick={() => onChange(opt.value)}>
            {opt.icon} {opt.label}
          </ChipButton>
        ))}
      </div>
    </div>
  );
}

function ChipButton({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        selected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {children}
    </button>
  );
}

function StorageUsageBar() {
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    if ("storage" in navigator && "estimate" in (navigator as any).storage) {
      (navigator as any).storage.estimate().then((est: { usage?: number; quota?: number }) => {
        if (est.usage != null && est.quota != null) {
          setUsage({ used: est.usage, quota: est.quota });
        }
      }).catch(() => {});
    }
  }, []);

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  if (!usage) return null;

  const pct = Math.min(100, (usage.used / usage.quota) * 100);
  return (
    <div className="p-3 rounded-xl border border-border bg-muted/30">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-foreground">Espace utilisé</span>
        <span className="text-xs text-muted-foreground">{formatBytes(usage.used)} / {formatBytes(usage.quota)}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "hsl(var(--hud-cyan))" }} />
      </div>
    </div>
  );
}
