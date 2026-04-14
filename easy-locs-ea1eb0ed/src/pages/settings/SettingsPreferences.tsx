/**
 * SettingsPreferences — Standalone preferences settings page
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Palette, FileSpreadsheet, Shield, Upload, Sun, Moon, Monitor } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { useAuth } from "@/contexts/AuthContext";
import * as settingsRepo from "@/repositories/settings.repository";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useTheme } from "next-themes";

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPreferences() {
  useUiEngine("settings-preferences");
  const navigate = useNavigate();
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [brand, setBrand] = useState({ brand_name: "", brand_primary_color: "", brand_accent_color: "" });
  const [saving, setSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    settingsRepo.fetchOrg(orgId).then((data) => {
      if (data) setBrand({
        brand_name: (data as any).brand_name || "",
        brand_primary_color: (data as any).brand_primary_color || "",
        brand_accent_color: (data as any).brand_accent_color || "",
      });
    });
  }, [orgId]);

  useEffect(() => {
    if (!user) return;
    settingsRepo.fetchProfile(user.id).then(p => {
      if (p && (p as any).theme && ["light", "dark", "system"].includes((p as any).theme)) {
        setTheme((p as any).theme as ThemeOption);
      }
    });
  }, [user, setTheme]);

  const saveBrand = async () => {
    if (!orgId) return;
    setSaving(true);
    await settingsRepo.updateOrgBranding(orgId, {
      brand_name: brand.brand_name || null,
      brand_primary_color: brand.brand_primary_color || null,
      brand_accent_color: brand.brand_accent_color || null,
    });
    toast({ title: t("page.settings.branding_updated") || "Branding updated" });
    setSaving(false);
  };

  const selectTheme = async (value: ThemeOption) => {
    setTheme(value);
    if (!user) return;
    setThemeSaving(true);
    await settingsRepo.updateProfileField(user.id, "theme", value).catch(() => {});
    setThemeSaving(false);
    toast({ title: `Theme set to ${value}` });
  };

  return (
    <SubPageShell title={t("page.settings.preferences") || "Preferences"} onBack={() => navigate("/settings")} contentClassName="space-y-3">
        {/* Theme */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">{t("page.settings.theme") || "Appearance"}</h2>
            {themeSaving && <span className="text-xs text-muted-foreground ml-auto">Saving…</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => selectTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">{t("page.settings.branding_title") || "Branding"}</h2>
          </div>
          <Field label={t("page.settings.brand_name") || "Brand Name"}>
            <input type="text" value={brand.brand_name} onChange={e => setBrand(b => ({ ...b, brand_name: e.target.value }))} className="form-input" placeholder="e.g. My Brand" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("page.settings.primary_color") || "Primary"}>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.brand_primary_color || "#1a1a2e"} onChange={e => setBrand(b => ({ ...b, brand_primary_color: e.target.value }))} className="w-8 h-8 rounded-lg border border-border cursor-pointer shrink-0" />
                <input type="text" value={brand.brand_primary_color} onChange={e => setBrand(b => ({ ...b, brand_primary_color: e.target.value }))} placeholder="#1a1a2e" className="form-input font-mono text-xs" />
              </div>
            </Field>
            <Field label={t("page.settings.accent_color") || "Accent"}>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.brand_accent_color || "#c9a227"} onChange={e => setBrand(b => ({ ...b, brand_accent_color: e.target.value }))} className="w-8 h-8 rounded-lg border border-border cursor-pointer shrink-0" />
                <input type="text" value={brand.brand_accent_color} onChange={e => setBrand(b => ({ ...b, brand_accent_color: e.target.value }))} placeholder="#c9a227" className="form-input font-mono text-xs" />
              </div>
            </Field>
          </div>
          <button onClick={saveBrand} disabled={saving} className="btn-primary w-full">
            {saving ? "Saving…" : (t("page.settings.save_branding") || "Save Branding")}
          </button>
        </div>

        {/* Data Import */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">{t("page.settings.import_title") || "Data & Import"}</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t("page.settings.import_desc") || "Import your data from CSV or other formats"}</p>
          <Link to="/dashboard/import" className="btn-primary inline-flex text-sm gap-1">
            <Upload className="h-4 w-4" /> {t("page.settings.import_cta") || "Import Data"}
          </Link>
        </div>

        {/* Privacy */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">{t("page.settings.gdpr_title") || "Privacy & Data"}</h2>
          </div>
          <div className="space-y-2">
            <button onClick={async () => {
              if (!user) return;
              toast({ title: t("page.settings.export_started") || "Export started…" });
              try {
                const allData = await settingsRepo.exportUserData(user.id);
                const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `easylocs-data-${new Date().toISOString().slice(0, 10)}.json`;
                a.click(); URL.revokeObjectURL(url);
                toast({ title: t("page.settings.export_done") || "Data exported" });
              } catch (err: any) {
                console.error("[Settings]", err.message);
                toast({ title: "Export failed", description: "Something went wrong. Please try again.", variant: "destructive" });
              }
            }} className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
              <p className="text-sm font-medium">{t("page.settings.export_data") || "Export my data"}</p>
              <p className="text-xs text-muted-foreground">{t("page.settings.export_desc") || "Download all your data"}</p>
            </button>
            <button onClick={async () => {
              if (!user) return;
              if (!window.confirm(t("page.settings.delete_confirm") || "Are you sure?")) return;
              if (!window.confirm(t("page.settings.delete_confirm2") || "This is irreversible.")) return;
              try {
                toast({ title: t("page.settings.delete_requested") || "Deletion requested" });
                await settingsRepo.requestAccountDeletion(user.id, user.email || "");
              } catch (err: any) {
                console.error("[Settings]", err.message);
                toast({ title: "Request failed", description: "Something went wrong. Please try again.", variant: "destructive" });
              }
            }} className="w-full text-left px-4 py-3 rounded-xl border border-destructive/30 hover:bg-destructive/5 transition-colors">
              <p className="text-sm font-medium text-destructive">{t("page.settings.delete_account") || "Delete account"}</p>
              <p className="text-xs text-muted-foreground">{t("page.settings.delete_desc") || "Permanently delete your account and data"}</p>
            </button>
          </div>
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
