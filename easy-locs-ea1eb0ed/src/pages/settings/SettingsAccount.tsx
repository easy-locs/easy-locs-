/**
 * SettingsAccount — Standalone account settings page
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import * as settingsRepo from "@/repositories/settings.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { invalidateOrbitProfileCache, ensureOrbitProfile } from "@/lib/orbit/ensureOrbitProfile";
import SignaturePad from "@/components/ui/SignaturePad";
import CountrySelect from "@/components/ui/CountrySelect";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function SettingsAccount() {
  useUiEngine("settings-account");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [profile, setProfile] = useState({ name: "", email: "", country: "FR", locale: "fr", signature_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    settingsRepo.fetchProfile(user.id).then((data) => {
      if (data) setProfile({ name: data.name || "", email: data.email || "", country: data.country || "FR", locale: data.locale || "fr", signature_url: (data as any)?.signature_url || "" });
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await settingsRepo.updateProfile(user.id, { name: profile.name, country: profile.country, locale: profile.locale, signature_url: profile.signature_url });
    invalidateOrbitProfileCache(user.id);
    ensureOrbitProfile({ userId: user.id, displayName: profile.name }).catch(() => {});
    toast({ title: t("page.settings.profile_updated") || "Profile updated" });
    setSaving(false);
  };

  return (
    <SubPageShell title={t("page.settings.profile") || "Account"} onBack={() => navigate("/settings")}>
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <Field label={t("page.settings.full_name") || "Full name"}>
            <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="form-input" />
          </Field>
          <Field label={t("page.settings.id") || "ID"}>
            <input type="text" value={`EL-${(user?.id || "").replace(/-/g, "").substring(0, 8).toUpperCase()}`} disabled className="form-input bg-muted text-muted-foreground font-mono" />
          </Field>
          <Field label={t("page.settings.country") || "Country"}>
            <CountrySelect value={profile.country} onChange={(code) => setProfile(p => ({ ...p, country: code }))} />
          </Field>
          <Field label={t("page.settings.signature") || "Signature"}>
            <SignaturePad label={t("page.settings.saved_signature") || "Saved signature"} value={profile.signature_url} onChange={(v) => setProfile(p => ({ ...p, signature_url: v }))} />
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
