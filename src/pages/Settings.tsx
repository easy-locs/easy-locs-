import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { User, Shield, Building2, Upload, Loader2, PenTool, FileSpreadsheet, CreditCard, Palette, Globe, Eye, EyeOff, Cog, Smartphone, Wallet } from "lucide-react";
import MFASettings from "@/components/settings/MFASettings";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SignaturePad from "@/components/ui/SignaturePad";
import { useI18n } from "@/lib/i18n";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import CountrySelect from "@/components/ui/CountrySelect";
import PaymentProvidersSettings from "@/components/settings/PaymentProvidersSettings";
import NotificationPreferences from "@/components/communication/NotificationPreferences";
import ProSettingsSection from "@/components/settings/ProSettingsSection";
import OrbitSessionManager from "@/components/orbit/OrbitSessionManager";
import AppSecuritySettings from "@/components/security/AppSecuritySettings";
import WalletCurrencySettings from "@/components/settings/WalletCurrencySettings";

const Settings = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [profile, setProfile] = useState({ name: "", email: "", country: "FR", locale: "fr", signature_url: "" });
  const [org, setOrg] = useState({ name: "", address: "", postal_code: "", city: "", phone: "", siret: "", email: "", logo_url: "", stamp_url: "", brand_name: "", brand_primary_color: "", brand_accent_color: "" });
  const [saving, setSaving] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [showcaseEnabled, setShowcaseEnabled] = useState(true);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [landlordProfileId, setLandlordProfileId] = useState<string | null>(null);
  const [landlordSlug, setLandlordSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, email, country, locale, signature_url").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile({ name: data.name || "", email: data.email || "", country: data.country || "FR", locale: data.locale || "fr", signature_url: (data as any)?.signature_url || "" });
    });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("orgs").select("name, address, postal_code, city, phone, siret, email, logo_url, stamp_url, brand_name, brand_primary_color, brand_accent_color").eq("id", orgId).single().then(({ data }) => {
      if (data) setOrg({
        name: data.name || "", address: (data as any).address || "", postal_code: (data as any).postal_code || "",
        city: (data as any).city || "", phone: (data as any).phone || "", siret: (data as any).siret || "",
        email: (data as any).email || "", logo_url: (data as any).logo_url || "", stamp_url: (data as any).stamp_url || "",
        brand_name: (data as any).brand_name || "", brand_primary_color: (data as any).brand_primary_color || "",
        brand_accent_color: (data as any).brand_accent_color || "",
      });
    });
    // Load showcase setting
    supabase.from("landlord_profiles").select("id, slug, showcase_enabled").eq("org_id", orgId).limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setLandlordProfileId(data.id);
        setLandlordSlug((data as any).slug || null);
        setShowcaseEnabled((data as any).showcase_enabled !== false);
      }
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
      const { data: signedData } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
      const logoUrl = signedData?.signedUrl || path;
      await supabase.from("orgs").update({ logo_url: logoUrl } as any).eq("id", orgId);
      setOrg(prev => ({ ...prev, logo_url: logoUrl }));
      toast({ title: t("page.settings.logo_updated") });
    }
    setUploading(false);
  };

  // Deep-link: scroll to section from ?section= param
  useEffect(() => {
    const section = searchParams.get("section");
    if (section && sectionRefs.current[section]) {
      setTimeout(() => {
        sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [searchParams]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="page-header">
          <h1>{t("page.settings.title")}</h1>
          <p>{t("page.settings.subtitle")}</p>
        </div>

        {/* Profile */}
        <div className="ui-card">
          <div className="flex items-center gap-3 mb-5">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.profile")}</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="form-label">{t("page.settings.full_name")}</label>
              <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">{t("page.settings.email")}</label>
              <input type="email" value={profile.email} disabled
                className="form-input bg-muted text-muted-foreground" />
            </div>
            <div>
              <label className="form-label">{t("page.settings.country")}</label>
              <CountrySelect value={profile.country} onChange={(code) => setProfile(p => ({ ...p, country: code }))} />
            </div>
            <button onClick={saveProfile} disabled={saving} className="btn-primary">
              {saving ? t("page.settings.saving") : t("page.settings.save_profile")}
            </button>
          </div>
        </div>

        {/* Organization & Document customization */}
        <div className="ui-card">
          <div className="flex items-center gap-3 mb-5">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.org_title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("page.settings.org_desc")}</p>
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="form-label">{t("page.settings.logo")}</label>
              <div className="flex items-center gap-4">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <label className="btn-secondary btn-sm cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("page.settings.change_logo")}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Company Stamp */}
            <div>
              <label className="form-label">{t("page.settings.stamp")}</label>
              <p className="text-xs text-muted-foreground mb-2">{t("page.settings.stamp_desc")}</p>
              <div className="flex items-center gap-4">
                {org.stamp_url ? (
                  <img src={org.stamp_url} alt="Stamp" className="h-16 w-16 object-contain rounded-lg border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <label className="btn-secondary btn-sm cursor-pointer">
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
                      const { data: signedData } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
                      const stampUrl = signedData?.signedUrl || path;
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
              <label className="form-label">{t("page.settings.org_name")}</label>
              <input type="text" value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))}
                className="form-input" />
            </div>
            <div>
              <label className="form-label">{t("page.settings.address")}</label>
              <AddressAutocomplete
                value={org.address}
                onChange={(val) => setOrg(o => ({ ...o, address: val }))}
                onSelect={(result: AddressResult) => setOrg(o => ({
                  ...o,
                  address: result.label || "",
                  postal_code: result.postcode || o.postal_code,
                  city: result.city || o.city,
                }))}
              />
            </div>
            <div className="form-grid">
              <div>
                <label className="form-label">{t("page.settings.postal_code")}</label>
                <input type="text" value={org.postal_code} onChange={e => setOrg(o => ({ ...o, postal_code: e.target.value }))}
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">{t("page.settings.city")}</label>
                <input type="text" value={org.city} onChange={e => setOrg(o => ({ ...o, city: e.target.value }))}
                  className="form-input" />
              </div>
            </div>
            <div className="form-grid">
              <div>
                <label className="form-label">{t("page.settings.phone")}</label>
                <input type="tel" value={org.phone} onChange={e => setOrg(o => ({ ...o, phone: e.target.value }))}
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">{t("page.settings.contact_email")}</label>
                <input type="email" value={org.email} onChange={e => setOrg(o => ({ ...o, email: e.target.value }))}
                  className="form-input" />
              </div>
            </div>
            <div>
              <label className="form-label">{t("page.settings.siret")}</label>
              <input type="text" value={org.siret} onChange={e => setOrg(o => ({ ...o, siret: e.target.value }))}
                className="form-input" />
            </div>
            <button onClick={saveOrg} disabled={saving} className="btn-primary">
              {saving ? t("page.settings.saving") : t("page.settings.save_org")}
            </button>
          </div>
        </div>

        {/* Public Showcase */}
        {landlordProfileId && (
          <div className="ui-card">
            <div className="flex items-center gap-3 mb-5">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">{t("page.settings.showcase_title") || "Public Showcase"}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t("page.settings.showcase_desc") || "Control whether your agency showcase page is publicly visible. Individual listing visibility settings remain independent."}
            </p>
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                {showcaseEnabled ? (
                  <Eye className="h-5 w-5 text-success" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium text-sm text-foreground">
                    {showcaseEnabled ? (t("page.settings.showcase_on") || "Showcase Enabled") : (t("page.settings.showcase_off") || "Showcase Disabled")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {showcaseEnabled && landlordSlug
                      ? `${t("page.settings.visible_at") || "Visible at"} /agency/${landlordSlug}`
                      : (t("page.settings.showcase_hidden") || "Your showcase page is not publicly accessible")}
                  </div>
                </div>
              </div>
              <button
                disabled={savingShowcase}
                onClick={async () => {
                  if (!landlordProfileId) return;
                  setSavingShowcase(true);
                  const newVal = !showcaseEnabled;
                  await supabase.from("landlord_profiles").update({ showcase_enabled: newVal } as any).eq("id", landlordProfileId);
                  setShowcaseEnabled(newVal);
                  toast({ title: newVal ? (t("page.settings.showcase_on") || "Showcase enabled") : (t("page.settings.showcase_off") || "Showcase disabled") });
                  setSavingShowcase(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showcaseEnabled
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-success/10 text-success hover:bg-success/20"
                }`}
              >
                {savingShowcase ? "…" : showcaseEnabled ? (t("page.common.disable") || "Disable") : (t("page.common.enable") || "Enable")}
              </button>
            </div>
          </div>
        )}

        {/* Payment Providers */}
        <PaymentProvidersSettings />

        {/* Notification Preferences */}
        <div ref={el => { sectionRefs.current["notifications"] = el; }}>
          <NotificationPreferences />
        </div>

        {/* MFA / 2FA */}
        <div ref={el => { sectionRefs.current["security"] = el; }}>
          <MFASettings />
        </div>

        {/* Active Sessions / Devices */}
        <div ref={el => { sectionRefs.current["sessions"] = el; }} className="ui-card">
          <div className="flex items-center gap-3 mb-5">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.sessions_title") || "Active Sessions"}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("page.settings.sessions_desc") || "Manage your connected devices and revoke access to other sessions."}</p>
          {user && (
            <OrbitSessionManager userId={user.id} />
          )}
        </div>

        {/* App Security — PIN, Ghost, Panic */}
        <div className="ui-card">
          <AppSecuritySettings />
        </div>

        {/* Pro Settings — Signal/WhatsApp style */}
        <ProSettingsSection />

        <div className="ui-card">
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
          <button onClick={saveProfile} disabled={saving} className="btn-primary mt-4">
            {saving ? t("page.settings.saving") : t("page.settings.save_signature")}
          </button>
        </div>

        {/* Data Import */}
        <div ref={el => { sectionRefs.current["data"] = el; }} className="ui-card">
          <div className="flex items-center gap-3 mb-5">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.import_title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("page.settings.import_desc")}</p>
          <Link to="/dashboard/import" className="btn-primary inline-flex">
            <Upload className="h-4 w-4" /> {t("page.settings.import_cta")}
          </Link>
        </div>

        {/* White-label Branding */}
        <div ref={el => { sectionRefs.current["branding"] = el; }} className="ui-card">
          <div className="flex items-center gap-3 mb-5">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.branding_title") || "White-label / Branding"}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("page.settings.branding_desc") || "Customize the look of your documents and tenant portal with your brand."}</p>
          <div className="space-y-4">
            <div>
              <label className="form-label">{t("page.settings.brand_name") || "Brand Name"}</label>
              <input type="text" value={org.brand_name} onChange={e => setOrg(o => ({ ...o, brand_name: e.target.value }))} placeholder={t("page.settings.brand_name_placeholder") || "e.g. My Agency"}
                className="form-input" />
            </div>
            <div className="form-grid">
              <div>
                <label className="form-label">{t("page.settings.primary_color") || "Primary Color"}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={org.brand_primary_color || "#1a1a2e"} onChange={e => setOrg(o => ({ ...o, brand_primary_color: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0" />
                  <input type="text" value={org.brand_primary_color} onChange={e => setOrg(o => ({ ...o, brand_primary_color: e.target.value }))} placeholder="#1a1a2e"
                    className="form-input font-mono" />
                </div>
              </div>
              <div>
                <label className="form-label">{t("page.settings.accent_color") || "Accent Color"}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={org.brand_accent_color || "#c9a227"} onChange={e => setOrg(o => ({ ...o, brand_accent_color: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0" />
                  <input type="text" value={org.brand_accent_color} onChange={e => setOrg(o => ({ ...o, brand_accent_color: e.target.value }))} placeholder="#c9a227"
                    className="form-input font-mono" />
                </div>
              </div>
            </div>
            {(org.brand_name || org.brand_primary_color) && (
              <div className="p-4 rounded-xl border border-border" style={{ backgroundColor: org.brand_primary_color || undefined }}>
                <p className="text-sm font-bold" style={{ color: org.brand_accent_color || "#c9a227" }}>{org.brand_name || org.name}</p>
                <p className="text-xs mt-1" style={{ color: (org.brand_primary_color ? "#ffffff" : undefined) }}>{t("page.settings.branding_preview") || "Branding preview on your documents"}</p>
              </div>
            )}
            <button onClick={async () => {
              if (!orgId) return;
              setSavingBrand(true);
              await supabase.from("orgs").update({
                brand_name: org.brand_name || null,
                brand_primary_color: org.brand_primary_color || null,
                brand_accent_color: org.brand_accent_color || null,
              } as any).eq("id", orgId);
              toast({ title: t("page.settings.branding_updated") || "Branding updated" });
              setSavingBrand(false);
            }} disabled={savingBrand} className="btn-primary">
              {savingBrand ? t("page.settings.saving") : t("page.settings.save_branding") || "Save Branding"}
            </button>
          </div>
        </div>

        {/* Reviews Settings */}
        <div className="ui-card">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">{t("page.settings.reviews_title") || "Reviews & Ratings"}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t("page.settings.reviews_desc") || "Control whether customers can leave reviews on your marketplace services and listings. Reviews can be enabled per-provider in the Marketplace settings."}
            </p>
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              {t("page.settings.reviews_hint") || "Go to Marketplace → Provider Profile to enable or disable reviews for your services."}
            </div>
        </div>

        {/* GDPR */}
        <div ref={el => { sectionRefs.current["privacy"] = el; }} className="ui-card">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("page.settings.gdpr_title")}</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium text-foreground">{t("page.settings.export_data")}</p>
              <p className="text-xs text-muted-foreground">{t("page.settings.export_desc")}</p>
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl border border-destructive/30 hover:bg-destructive/5 transition-colors">
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
