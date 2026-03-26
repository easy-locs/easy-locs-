/**
 * SettingsAccount — Standalone account settings page
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import SignaturePad from "@/components/ui/SignaturePad";
import CountrySelect from "@/components/ui/CountrySelect";

export default function SettingsAccount() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [profile, setProfile] = useState({ name: "", email: "", country: "FR", locale: "fr", signature_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, email, country, locale, signature_url").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile({ name: data.name || "", email: data.email || "", country: data.country || "FR", locale: data.locale || "fr", signature_url: (data as any)?.signature_url || "" });
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ name: profile.name, country: profile.country, locale: profile.locale, signature_url: profile.signature_url } as any).eq("id", user.id);
    toast({ title: t("page.settings.profile_updated") || "Profile updated" });
    setSaving(false);
  };

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold">{t("page.settings.profile") || "Account"}</h1>
      </header>
      <div className="flex-1 px-4 pb-24 mt-2">
        <div className="rounded-2xl border p-4 space-y-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <Field label={t("page.settings.full_name") || "Full name"}>
            <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="form-input" />
          </Field>
          <Field label={t("page.settings.email") || "Email"}>
            <input type="email" value={profile.email} disabled className="form-input bg-muted text-muted-foreground" />
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
      </div>
    </div>
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
