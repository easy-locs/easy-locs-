import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { User, Shield, Building2, Upload, Loader2, PenTool, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SignaturePad from "@/components/ui/SignaturePad";
import { useI18n } from "@/lib/i18n";

const Settings = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [profile, setProfile] = useState({ name: "", email: "", country: "FR", locale: "fr", signature_url: "" });
  const [org, setOrg] = useState({ name: "", address: "", postal_code: "", city: "", phone: "", siret: "", email: "", logo_url: "", stamp_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, email, country, locale, signature_url").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile({ name: data.name || "", email: data.email || "", country: data.country || "FR", locale: data.locale || "fr", signature_url: (data as any)?.signature_url || "" });
    });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("orgs").select("name, address, postal_code, city, phone, siret, email, logo_url, stamp_url").eq("id", orgId).single().then(({ data }) => {
      if (data) setOrg({
        name: data.name || "", address: (data as any).address || "", postal_code: (data as any).postal_code || "",
        city: (data as any).city || "", phone: (data as any).phone || "", siret: (data as any).siret || "",
        email: (data as any).email || "", logo_url: (data as any).logo_url || "", stamp_url: (data as any).stamp_url || "",
      });
    });
  }, [orgId]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ name: profile.name, country: profile.country, locale: profile.locale, signature_url: profile.signature_url } as any).eq("id", user.id);
    toast({ title: t("page.settings.profile_updated") });
    setSaving(false);
  };

  const saveOrg = async () => {
    if (!orgId) return;
    setSaving(true);
    await supabase.from("orgs").update({
      name: org.name, address: org.address, postal_code: org.postal_code,
      city: org.city, phone: org.phone, siret: org.siret, email: org.email,
    } as any).eq("id", orgId);
    toast({ title: t("page.settings.org_updated") });
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    const path = `${orgId}/logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("rental-docs").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: t("page.settings.upload_error"), description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("rental-docs").getPublicUrl(path);
      const logoUrl = urlData.publicUrl;
      await supabase.from("orgs").update({ logo_url: logoUrl } as any).eq("id", orgId);
      setOrg(prev => ({ ...prev, logo_url: logoUrl }));
      toast({ title: t("page.settings.logo_updated") });
    }
    setUploading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("page.settings.title")}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t("page.settings.subtitle")}</p>

        {/* Profile */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.profile")}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.full_name")}</label>
              <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.email")}</label>
              <input type="email" value={profile.email} disabled
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.country")}</label>
              <select value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="FR">🇫🇷 France</option>
                <option value="BE">🇧🇪 Belgique</option>
                <option value="ES">🇪🇸 España</option>
                <option value="IT">🇮🇹 Italia</option>
                <option value="DE">🇩🇪 Deutschland</option>
              </select>
            </div>
            <button onClick={saveProfile} disabled={saving}
              className="bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? t("page.settings.saving") : t("page.settings.save_profile")}
            </button>
          </div>
        </div>

        {/* Organization & Document customization */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.org_title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("page.settings.org_desc")}</p>
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.logo")}</label>
              <div className="flex items-center gap-4">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("page.settings.change_logo")}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Company Stamp */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.stamp")}</label>
              <p className="text-xs text-muted-foreground mb-2">{t("page.settings.stamp_desc")}</p>
              <div className="flex items-center gap-4">
                {org.stamp_url ? (
                  <img src={org.stamp_url} alt="Stamp" className="h-16 w-16 object-contain rounded-lg border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80">
                  {uploadingStamp ? <Loader2 className="h-4 w-4 animate-spin" /> : t("page.settings.add_stamp")}
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !orgId) return;
                    setUploadingStamp(true);
                    const path = `${orgId}/stamp-${Date.now()}.${file.name.split(".").pop()}`;
                    const { error } = await supabase.storage.from("rental-docs").upload(path, file, { upsert: true });
                    if (error) {
                      toast({ title: t("page.settings.upload_error"), description: error.message, variant: "destructive" });
                    } else {
                      const { data: urlData } = supabase.storage.from("rental-docs").getPublicUrl(path);
                      const stampUrl = urlData.publicUrl;
                      await supabase.from("orgs").update({ stamp_url: stampUrl } as any).eq("id", orgId);
                      setOrg(prev => ({ ...prev, stamp_url: stampUrl }));
                      toast({ title: t("page.settings.stamp_updated") });
                    }
                    setUploadingStamp(false);
                  }} className="hidden" />
                </label>
                {org.stamp_url && (
                  <button onClick={async () => {
                    if (!orgId) return;
                    await supabase.from("orgs").update({ stamp_url: null } as any).eq("id", orgId);
                    setOrg(prev => ({ ...prev, stamp_url: "" }));
                    toast({ title: t("page.settings.stamp_deleted") });
                  }} className="text-xs text-destructive hover:underline">{t("page.settings.remove_stamp")}</button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.org_name")}</label>
              <input type="text" value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.address")}</label>
                <input type="text" value={org.address} onChange={e => setOrg(o => ({ ...o, address: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.postal_code")}</label>
                  <input type="text" value={org.postal_code} onChange={e => setOrg(o => ({ ...o, postal_code: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.city")}</label>
                  <input type="text" value={org.city} onChange={e => setOrg(o => ({ ...o, city: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.phone")}</label>
                <input type="tel" value={org.phone} onChange={e => setOrg(o => ({ ...o, phone: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.contact_email")}</label>
                <input type="email" value={org.email} onChange={e => setOrg(o => ({ ...o, email: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t("page.settings.siret")}</label>
              <input type="text" value={org.siret} onChange={e => setOrg(o => ({ ...o, siret: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button onClick={saveOrg} disabled={saving}
              className="bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? t("page.settings.saving") : t("page.settings.save_org")}
            </button>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <PenTool className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.signature")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("page.settings.signature_desc")}</p>
          <SignaturePad
            label={t("page.settings.saved_signature")}
            value={profile.signature_url}
            onChange={(v) => setProfile(p => ({ ...p, signature_url: v }))}
          />
          <button onClick={saveProfile} disabled={saving}
            className="mt-4 bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
            {saving ? t("page.settings.saving") : t("page.settings.save_signature")}
          </button>
        </div>

        {/* Data Import */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.import_title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("page.settings.import_desc")}</p>
          <Link to="/dashboard/import"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-medium px-5 py-2 rounded-lg text-sm hover:opacity-90">
            <Upload className="h-4 w-4" /> {t("page.settings.import_cta")}
          </Link>
        </div>

        {/* GDPR */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.gdpr_title")}</h2>
          </div>
          <div className="space-y-4">
            <button className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium text-foreground">{t("page.settings.export_data")}</p>
              <p className="text-xs text-muted-foreground">{t("page.settings.export_desc")}</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg border border-destructive/30 hover:bg-destructive/5 transition-colors">
              <p className="text-sm font-medium text-destructive">{t("page.settings.delete_account")}</p>
              <p className="text-xs text-muted-foreground">{t("page.settings.delete_desc")}</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
