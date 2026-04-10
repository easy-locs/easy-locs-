/**
 * SettingsBusiness — Standalone business/org settings page
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as settingsRepo from "@/repositories/settings.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import AddressAutocomplete, { type AddressResult } from "@/components/ui/AddressAutocomplete";
import ProSettingsSection from "@/components/settings/ProSettingsSection";

export default function SettingsBusiness() {
  const navigate = useNavigate();
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [org, setOrg] = useState({ name: "", address: "", postal_code: "", city: "", phone: "", siret: "", email: "", logo_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    settingsRepo.fetchOrg(orgId).then((data) => {
      if (data) setOrg({
        name: data.name || "", address: (data as any).address || "", postal_code: (data as any).postal_code || "",
        city: (data as any).city || "", phone: (data as any).phone || "", siret: (data as any).siret || "",
        email: (data as any).email || "", logo_url: (data as any).logo_url || "",
      });
    });
  }, [orgId]);

  const saveOrg = async () => {
    if (!orgId) return;
    setSaving(true);
    await settingsRepo.updateOrg(orgId, {
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
      const logoUrl = await settingsRepo.uploadLogo(orgId, file);
      await settingsRepo.updateOrg(orgId, { logo_url: logoUrl });
      setOrg(prev => ({ ...prev, logo_url: logoUrl }));
      toast({ title: "Logo updated" });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold">{t("page.settings.org_title") || "Business"}</h1>
      </header>
      <div className="flex-1 px-4 pb-24 mt-2 space-y-3">
        <div className="rounded-2xl border p-4 space-y-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
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
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change"}
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
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <ProSettingsSection />
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
