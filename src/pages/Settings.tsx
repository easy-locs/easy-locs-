import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  User, Shield, Building2, Upload, Loader2,
  FileSpreadsheet, Palette, Globe,
  Wallet, Bell, ChevronRight, MapPin, Store,
} from "lucide-react";
import MFASettings from "@/components/settings/MFASettings";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchProfile, updateProfile, fetchOrg, updateOrg, uploadLogo, exportUserData } from "@/repositories/settings.repository";
import { supabase } from "@/integrations/supabase/client";
import SignaturePad from "@/components/ui/SignaturePad";
import { useI18n } from "@/lib/i18n";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import CountrySelect from "@/components/ui/CountrySelect";
import PaymentProvidersSettings from "@/components/settings/PaymentProvidersSettings";
import NotificationPreferences from "@/components/communication/NotificationPreferences";
import ProSettingsSection from "@/components/settings/ProSettingsSection";
import OrbitSessionManager from "@/components/orbit/OrbitSessionManager";
import AppSecuritySettings from "@/components/security/AppSecuritySettings";
import PinManagement from "@/components/security/PinManagement";
import WalletCurrencySettings from "@/components/settings/WalletCurrencySettings";

/* ────────────────────────────────────────────
   Clean settings categories
   ──────────────────────────────────────────── */
type SettingsGroup = "account" | "orbit" | "wallet" | "addresses" | "notifications" | "security" | "business" | "preferences";

const GROUP_META: { key: SettingsGroup; icon: React.ElementType; label: string; labelFr: string }[] = [
  { key: "account",       icon: User,            label: "Account",       labelFr: "Compte" },
  { key: "orbit",         icon: Globe,           label: "Orbit",         labelFr: "Orbit" },
  { key: "wallet",        icon: Wallet,          label: "Wallet",        labelFr: "Portefeuille" },
  { key: "addresses",     icon: MapPin,          label: "Addresses",     labelFr: "Adresses" },
  { key: "notifications", icon: Bell,            label: "Notifications", labelFr: "Notifications" },
  { key: "security",      icon: Shield,          label: "Security",      labelFr: "Sécurité" },
  { key: "business",      icon: Store,           label: "Business",      labelFr: "Entreprise" },
  { key: "preferences",   icon: Palette,         label: "Preferences",   labelFr: "Préférences" },
];

const Settings = () => {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeSection, setActiveSection] = useState<SettingsGroup | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "", country: "FR", locale: "fr", signature_url: "" });
  const [org, setOrg] = useState({ name: "", address: "", postal_code: "", city: "", phone: "", siret: "", email: "", logo_url: "", stamp_url: "", brand_name: "", brand_primary_color: "", brand_accent_color: "" });
  const [saving, setSaving] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then((data) => {
      if (data) setProfile({ name: data.name || "", email: data.email || "", country: data.country || "FR", locale: data.locale || "fr", signature_url: (data as any)?.signature_url || "" });
    });
  }, [user]);

  useEffect(() => {
    if (!orgId) return;
    fetchOrg(orgId).then((data) => {
      if (data) setOrg({
        name: data.name || "", address: (data as any).address || "", postal_code: (data as any).postal_code || "",
        city: (data as any).city || "", phone: (data as any).phone || "", siret: (data as any).siret || "",
        email: (data as any).email || "", logo_url: (data as any).logo_url || "", stamp_url: (data as any).stamp_url || "",
        brand_name: (data as any).brand_name || "", brand_primary_color: (data as any).brand_primary_color || "",
        brand_accent_color: (data as any).brand_accent_color || "",
      });
    });
  }, [orgId]);

  useEffect(() => {
    const section = searchParams.get("section") as SettingsGroup | null;
    if (section) setActiveSection(section);
  }, [searchParams]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await updateProfile(user.id, { name: profile.name, country: profile.country, locale: profile.locale, signature_url: profile.signature_url });
    toast({ title: t("page.settings.profile_updated") || "Profile updated" });
    setSaving(false);
  };

  const saveOrg = async () => {
    if (!orgId) return;
    setSaving(true);
    await updateOrg(orgId, {
      name: org.name, address: org.address, postal_code: org.postal_code,
      city: org.city, phone: org.phone, siret: org.siret, email: org.email,
    });
    toast({ title: t("page.settings.org_updated") || "Organization updated" });
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    try {
      const logoUrl = await uploadLogo(orgId, file);
      setOrg(prev => ({ ...prev, logo_url: logoUrl }));
      toast({ title: t("page.settings.logo_updated") || "Logo updated" });
    } catch (error: any) {
      toast({ title: t("page.settings.upload_error") || "Upload error", description: error.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const scrollToSection = (key: SettingsGroup) => {
    setActiveSection(key);
    setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const renderSection = (key: SettingsGroup) => {
    switch (key) {
      case "account":
        return (
          <SettingsCard ref={el => { sectionRefs.current["account"] = el; }} icon={User} title={t("page.settings.profile") || "Account"}>
            <div className="space-y-4">
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
              <button onClick={saveProfile} disabled={saving} className="btn-primary w-full">
                {saving ? (t("page.settings.saving") || "Saving...") : (t("page.settings.save_profile") || "Save")}
              </button>
            </div>
          </SettingsCard>
        );

      case "orbit":
        return (
          <SettingsCard ref={el => { sectionRefs.current["orbit"] = el; }} icon={Globe} title="Orbit">
            {user && <OrbitSessionManager userId={user.id} />}
          </SettingsCard>
        );

      case "wallet":
        return (
          <div ref={el => { sectionRefs.current["wallet"] = el; }} className="space-y-3">
            <SettingsCard icon={Wallet} title={t("page.settings.wallet_title") || "Wallet & Payouts"}>
              <WalletCurrencySettings />
            </SettingsCard>
            <PaymentProvidersSettings />
          </div>
        );

      case "addresses":
        return (
          <SettingsCard ref={el => { sectionRefs.current["addresses"] = el; }} icon={MapPin} title={t("page.settings.address") || "Addresses"}>
            <p className="text-xs text-muted-foreground mb-3">
              {t("page.settings.address_desc") || "Manage your saved delivery and billing addresses"}
            </p>
            <Link to="/dashboard/settings?section=addresses" className="btn-secondary inline-flex text-sm">
              {t("page.settings.manage_addresses") || "Manage Addresses"}
            </Link>
          </SettingsCard>
        );

      case "notifications":
        return (
          <div ref={el => { sectionRefs.current["notifications"] = el; }}>
            <NotificationPreferences />
          </div>
        );

      case "security":
        return (
          <div ref={el => { sectionRefs.current["security"] = el; }} className="space-y-3">
            <SettingsCard icon={Shield} title={t("page.settings.security") || "Security"}>
              <MFASettings />
            </SettingsCard>
            <SettingsCard icon={Shield} title="PIN">
              <PinManagement />
            </SettingsCard>
            <SettingsCard icon={Shield} title={t("page.settings.app_security") || "App Security"}>
              <AppSecuritySettings />
            </SettingsCard>
          </div>
        );

      case "business":
        return (
          <div ref={el => { sectionRefs.current["business"] = el; }} className="space-y-3">
            <SettingsCard icon={Building2} title={t("page.settings.org_title") || "Organization"}>
              <div className="space-y-4">
                <Field label={t("page.settings.logo") || "Logo"}>
                  <div className="flex items-center gap-4">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt="Logo" className="h-14 w-14 object-contain rounded-xl border border-border" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl border border-dashed border-border flex items-center justify-center">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <label className="btn-secondary btn-sm cursor-pointer text-xs">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : (t("page.settings.change_logo") || "Change")}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </Field>
                <Field label={t("page.settings.org_name") || "Name"}>
                  <input type="text" value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))} className="form-input" />
                </Field>
                <Field label={t("page.settings.address") || "Address"}>
                  <AddressAutocomplete
                    value={org.address}
                    onChange={(val) => setOrg(o => ({ ...o, address: val }))}
                    onSelect={(result: AddressResult) => setOrg(o => ({
                      ...o, address: result.label || "", postal_code: result.postcode || o.postal_code, city: result.city || o.city,
                    }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("page.settings.postal_code") || "Postal code"}>
                    <input type="text" value={org.postal_code} onChange={e => setOrg(o => ({ ...o, postal_code: e.target.value }))} className="form-input" />
                  </Field>
                  <Field label={t("page.settings.city") || "City"}>
                    <input type="text" value={org.city} onChange={e => setOrg(o => ({ ...o, city: e.target.value }))} className="form-input" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("page.settings.phone") || "Phone"}>
                    <input type="tel" value={org.phone} onChange={e => setOrg(o => ({ ...o, phone: e.target.value }))} className="form-input" />
                  </Field>
                  <Field label={t("page.settings.contact_email") || "Email"}>
                    <input type="email" value={org.email} onChange={e => setOrg(o => ({ ...o, email: e.target.value }))} className="form-input" />
                  </Field>
                </div>
                <Field label={t("page.settings.siret") || "Tax ID"}>
                  <input type="text" value={org.siret} onChange={e => setOrg(o => ({ ...o, siret: e.target.value }))} className="form-input" />
                </Field>
                <button onClick={saveOrg} disabled={saving} className="btn-primary w-full">
                  {saving ? (t("page.settings.saving") || "Saving...") : (t("page.settings.save_org") || "Save")}
                </button>
              </div>
            </SettingsCard>
            <ProSettingsSection />
          </div>
        );

      case "preferences":
        return (
          <div ref={el => { sectionRefs.current["preferences"] = el; }} className="space-y-3">
            <SettingsCard icon={Palette} title={t("page.settings.branding_title") || "Branding"}>
              <div className="space-y-4">
                <Field label={t("page.settings.brand_name") || "Brand Name"}>
                  <input type="text" value={org.brand_name} onChange={e => setOrg(o => ({ ...o, brand_name: e.target.value }))} className="form-input" placeholder="e.g. My Brand" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("page.settings.primary_color") || "Primary"}>
                    <div className="flex items-center gap-2">
                      <input type="color" value={org.brand_primary_color || "#1a1a2e"} onChange={e => setOrg(o => ({ ...o, brand_primary_color: e.target.value }))} className="w-8 h-8 rounded-lg border border-border cursor-pointer shrink-0" />
                      <input type="text" value={org.brand_primary_color} onChange={e => setOrg(o => ({ ...o, brand_primary_color: e.target.value }))} placeholder="#1a1a2e" className="form-input font-mono text-xs" />
                    </div>
                  </Field>
                  <Field label={t("page.settings.accent_color") || "Accent"}>
                    <div className="flex items-center gap-2">
                      <input type="color" value={org.brand_accent_color || "#c9a227"} onChange={e => setOrg(o => ({ ...o, brand_accent_color: e.target.value }))} className="w-8 h-8 rounded-lg border border-border cursor-pointer shrink-0" />
                      <input type="text" value={org.brand_accent_color} onChange={e => setOrg(o => ({ ...o, brand_accent_color: e.target.value }))} placeholder="#c9a227" className="form-input font-mono text-xs" />
                    </div>
                  </Field>
                </div>
                <button onClick={async () => {
                  if (!orgId) return;
                  setSavingBrand(true);
                  await supabase.from("orgs").update({ brand_name: org.brand_name || null, brand_primary_color: org.brand_primary_color || null, brand_accent_color: org.brand_accent_color || null } as any).eq("id", orgId);
                  toast({ title: t("page.settings.branding_updated") || "Branding updated" });
                  setSavingBrand(false);
                }} disabled={savingBrand} className="btn-primary w-full">
                  {savingBrand ? (t("page.settings.saving") || "Saving...") : (t("page.settings.save_branding") || "Save Branding")}
                </button>

              </div>
            </SettingsCard>

            {/* Data & Privacy */}
            <SettingsCard icon={FileSpreadsheet} title={t("page.settings.import_title") || "Data & Import"}>
              <p className="text-xs text-muted-foreground mb-3">{t("page.settings.import_desc") || "Import your data from CSV or other formats"}</p>
              <Link to="/dashboard/import" className="btn-primary inline-flex text-sm">
                <Upload className="h-4 w-4" /> {t("page.settings.import_cta") || "Import Data"}
              </Link>
            </SettingsCard>

            <SettingsCard icon={Shield} title={t("page.settings.gdpr_title") || "Privacy & Data"}>
              <div className="space-y-2">
                <button onClick={async () => {
                  if (!user) return;
                  toast({ title: t("page.settings.export_started") || "Export started..." });
                  try {
                    const allData = await exportUserData(user.id);
                    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `easylocs-data-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click(); URL.revokeObjectURL(url);
                    toast({ title: t("page.settings.export_done") || "Data exported" });
                  } catch (err: any) {
                    toast({ title: t("page.settings.export_error") || "Export failed", description: err.message, variant: "destructive" });
                  }
                }} className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                  <p className="text-sm font-medium text-foreground">{t("page.settings.export_data") || "Export my data"}</p>
                  <p className="text-xs text-muted-foreground">{t("page.settings.export_desc") || "Download all your data"}</p>
                </button>
                <button onClick={async () => {
                  if (!user) return;
                  if (!window.confirm(t("page.settings.delete_confirm") || "Are you sure?")) return;
                  if (!window.confirm(t("page.settings.delete_confirm2") || "This is irreversible.")) return;
                  try {
                    toast({ title: t("page.settings.delete_requested") || "Deletion requested" });
                    await supabase.from("audit_logs").insert({
                      user_id: user.id, action: "account_deletion_requested",
                      metadata_json: { email: user.email, requested_at: new Date().toISOString() },
                    });
                  } catch (err: any) {
                    toast({ title: t("page.settings.delete_error") || "Request failed", description: err.message, variant: "destructive" });
                  }
                }} className="w-full text-left px-4 py-3 rounded-xl border border-destructive/30 hover:bg-destructive/5 transition-colors">
                  <p className="text-sm font-medium text-destructive">{t("page.settings.delete_account") || "Delete account"}</p>
                  <p className="text-xs text-muted-foreground">{t("page.settings.delete_desc") || "Permanently delete your account and data"}</p>
                </button>
              </div>
            </SettingsCard>
          </div>
        );

      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-lg font-black text-foreground">{t("page.settings.title") || "Settings"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("page.settings.subtitle") || "Manage your account and preferences"}</p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-4 gap-2">
          {GROUP_META.map(g => {
            const isActive = activeSection === g.key;
            return (
              <button
                key={g.key}
                onClick={() => scrollToSection(g.key)}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all active:scale-95 min-h-[64px] ${
                  isActive ? "bg-primary/10 border-primary/30" : "bg-card border-border/30 hover:bg-muted/50"
                }`}
              >
                <g.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-semibold text-center leading-tight ${isActive ? "text-primary" : "text-muted-foreground"}`}>{g.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sections */}
        {GROUP_META.map(g => (
          <div key={g.key}>{renderSection(g.key)}</div>
        ))}
      </div>
    </DashboardLayout>
  );
};

/* ─── Reusable card wrapper ─── */
const SettingsCard = ({ icon: Icon, title, children, ref: _ref }: {
  icon: React.ElementType; title: string; children: React.ReactNode; ref?: any;
}) => {
  return (
    <div ref={_ref} className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
};

/* ─── Field wrapper ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export default Settings;
