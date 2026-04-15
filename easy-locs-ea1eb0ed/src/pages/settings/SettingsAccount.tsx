/**
 * SettingsAccount — Standalone account settings page
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Camera } from "lucide-react";
import { CSS } from "@/config/ui";
import { useAuth } from "@/contexts/AuthContext";
import * as settingsRepo from "@/repositories/settings.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type Locale } from "@/lib/i18n";
import { invalidateOrbitProfileCache, ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import { uploadAvatar, saveProfile, updateAvatarOnly } from "@/lib/orbit/orbit-account.repository";
import CountrySelect from "@/components/ui/CountrySelect";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ProfileQrCard from "@/components/qr/ProfileQrCard";

const LOCALE_METADATA: Record<string, { flag: string; english: string }> = {
  fr: { flag: "🇫🇷", english: "French" },
  en: { flag: "🇬🇧", english: "English" },
  es: { flag: "🇪🇸", english: "Spanish" },
  de: { flag: "🇩🇪", english: "German" },
  it: { flag: "🇮🇹", english: "Italian" },
  pt: { flag: "🇵🇹", english: "Portuguese" },
  nl: { flag: "🇳🇱", english: "Dutch" },
  pl: { flag: "🇵🇱", english: "Polish" },
  tr: { flag: "🇹🇷", english: "Turkish" },
  ar: { flag: "🇸🇦", english: "Arabic" },
  ja: { flag: "🇯🇵", english: "Japanese" },
  ko: { flag: "🇰🇷", english: "Korean" },
  zh: { flag: "🇨🇳", english: "Chinese" },
  hi: { flag: "🇮🇳", english: "Hindi" },
  th: { flag: "🇹🇭", english: "Thai" },
  vi: { flag: "🇻🇳", english: "Vietnamese" },
  id: { flag: "🇮🇩", english: "Indonesian" },
  ms: { flag: "🇲🇾", english: "Malay" },
  sv: { flag: "🇸🇪", english: "Swedish" },
  da: { flag: "🇩🇰", english: "Danish" },
  nb: { flag: "🇳🇴", english: "Norwegian" },
  fi: { flag: "🇫🇮", english: "Finnish" },
  el: { flag: "🇬🇷", english: "Greek" },
  cs: { flag: "🇨🇿", english: "Czech" },
  hu: { flag: "🇭🇺", english: "Hungarian" },
  ro: { flag: "🇷🇴", english: "Romanian" },
  hr: { flag: "🇭🇷", english: "Croatian" },
  bg: { flag: "🇧🇬", english: "Bulgarian" },
  sk: { flag: "🇸🇰", english: "Slovak" },
  he: { flag: "🇮🇱", english: "Hebrew" },
  uk: { flag: "🇺🇦", english: "Ukrainian" },
  fa: { flag: "🇮🇷", english: "Persian" },
  bn: { flag: "🇧🇩", english: "Bengali" },
  sw: { flag: "🇰🇪", english: "Swahili" },
  tl: { flag: "🇵🇭", english: "Filipino/Tagalog" },
  ur: { flag: "🇵🇰", english: "Urdu" },
  am: { flag: "🇪🇹", english: "Amharic" },
  ha: { flag: "🇳🇬", english: "Hausa" },
  yo: { flag: "🇳🇬", english: "Yoruba" },
  wo: { flag: "🇸🇳", english: "Wolof" },
  ru: { flag: "🇷🇺", english: "Russian" },
  sl: { flag: "🇸🇮", english: "Slovenian" },
  lt: { flag: "🇱🇹", english: "Lithuanian" },
  lv: { flag: "🇱🇻", english: "Latvian" },
  et: { flag: "🇪🇪", english: "Estonian" },
};

export default function SettingsAccount() {
  useUiEngine("settings-account");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, setLocale, availableLocales } = useI18n();
  const [profile, setProfile] = useState({ name: "", email: "", country: "FR", locale: "fr" as Locale });
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localeSearch, setLocaleSearch] = useState("");
  const [showLocalePanel, setShowLocalePanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (profile.name || "U")
    .split(/[\s@]/)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  useEffect(() => {
    if (!user) return;
    setAvatarUrl(user.user_metadata?.avatar_url || "");
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const metaName = String(meta?.display_name || meta?.full_name || meta?.name || "");
    settingsRepo.fetchProfile(user.id).then((data) => {
      if (data) {
        const resolvedName = data.name || metaName || "";
        setProfile({ name: resolvedName, email: data.email || user.email || "", country: data.country || "FR", locale: (data.locale || "fr") as Locale });
      } else if (metaName) {
        setProfile(p => ({ ...p, name: metaName, email: user.email || "" }));
      }
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(user.id, file);
      setAvatarUrl(publicUrl);
      await updateAvatarOnly(user.id, publicUrl);
      invalidateOrbitProfileCache(user.id);
      toast({ title: t("page.settings.profile_updated") || "Photo updated" });
    } catch (err: any) {
      console.error("[SettingsAccount] avatar upload:", err);
      toast({ title: `Upload failed: ${err.message || "Unknown error"}`, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await settingsRepo.updateProfile(user.id, { name: profile.name, country: profile.country, locale: profile.locale });
      await saveProfile(user.id, { displayName: profile.name, avatarUrl });
      invalidateOrbitProfileCache(user.id);
      ensureOrbitProfile({ userId: user.id, displayName: profile.name }).catch(() => {});
      toast({ title: t("page.settings.profile_updated") || "Profile updated" });
    } catch (err: any) {
      console.error("[SettingsAccount] save:", err.message);
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLocaleChange = async (code: Locale) => {
    setProfile(p => ({ ...p, locale: code }));
    await setLocale(code);
    setShowLocalePanel(false);
    setLocaleSearch("");
  };

  const filteredLocales = localeSearch.trim()
    ? availableLocales.filter(l => {
        const q = localeSearch.toLowerCase();
        const meta = LOCALE_METADATA[l.value];
        return l.label.toLowerCase().includes(q) || l.value.includes(q) || (meta?.english ?? "").toLowerCase().includes(q);
      })
    : availableLocales;

  const selectedLocale = availableLocales.find(l => l.value === profile.locale);
  const selectedMeta = LOCALE_METADATA[profile.locale];

  return (
    <SubPageShell title={t("page.settings.profile") || "Account"} onBack={() => navigate("/settings")}>
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="relative">
          <Avatar className="w-28 h-28" style={{ border: "3px solid hsl(var(--accent) / 0.3)" }}>
            <AvatarImage src={avatarUrl || undefined} alt="Profile" />
            <AvatarFallback style={{ fontSize: 24, fontWeight: 700, background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>{initials}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: "hsl(var(--accent))", color: "#fff",
              border: "3px solid hsl(var(--card))",
              cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
            }}
          >
            {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <p className="text-sm font-semibold text-foreground">{profile.name || "User"}</p>
      </div>

      {user?.id && (
        <ProfileQrCard
          userId={user.id}
          displayName={profile.name || "User"}
          avatarUrl={avatarUrl || undefined}
        />
      )}

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4 mt-4">
          <Field label={t("page.settings.full_name") || "Full name"}>
            <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className={CSS.formInput} />
          </Field>
          <Field label={t("page.settings.id") || "ID"}>
            <input type="text" value={`EL-${(user?.id || "").replace(/-/g, "").substring(0, 8).toUpperCase()}`} disabled className={`${CSS.formInput} bg-muted text-muted-foreground font-mono`} />
          </Field>
          <Field label={t("page.settings.country") || "Country"}>
            <CountrySelect value={profile.country} onChange={(code) => setProfile(p => ({ ...p, country: code }))} />
          </Field>

          <Field label={t("page.settings.language") || "Language"}>
            <button
              onClick={() => setShowLocalePanel(v => !v)}
              className={`${CSS.formInput} flex items-center justify-between w-full text-left`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedMeta?.flag ?? "🌐"}</span>
                <span className="text-sm">
                  {selectedLocale ? `${selectedLocale.label}` : profile.locale}
                  {selectedMeta?.english && selectedMeta.english !== selectedLocale?.label
                    ? ` (${selectedMeta.english})`
                    : ""}
                </span>
              </div>
              <Globe className="w-4 h-4 text-muted-foreground" />
            </button>
            {showLocalePanel && (
              <div className="mt-2 rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
                <div className="p-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                  <input
                    type="text"
                    value={localeSearch}
                    onChange={e => setLocaleSearch(e.target.value)}
                    placeholder="Search language…"
                    className={`${CSS.formInput} text-sm w-full`}
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {filteredLocales.map(locale => {
                    const meta = LOCALE_METADATA[locale.value];
                    return (
                      <button
                        key={locale.value}
                        onClick={() => handleLocaleChange(locale.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors ${locale.value === profile.locale ? "bg-primary/5 text-primary font-medium" : ""}`}
                      >
                        <span className="text-base w-6 shrink-0">{meta?.flag ?? "🌐"}</span>
                        <span className="flex-1 text-left">{locale.label}</span>
                        {meta?.english && meta.english !== locale.label && (
                          <span className="text-xs text-muted-foreground shrink-0">{meta.english}</span>
                        )}
                      </button>
                    );
                  })}
                  {filteredLocales.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No languages found</p>
                  )}
                </div>
              </div>
            )}
          </Field>

          <button onClick={save} disabled={saving} className="btn-primary w-full">
            {saving ? (t("page.settings.saving") || "Saving…") : (t("page.settings.save_profile") || "Save")}
          </button>
      </div>
    </SubPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
