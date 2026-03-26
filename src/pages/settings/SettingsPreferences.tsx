/**
 * SettingsPreferences — Standalone preferences settings page
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Palette, FileSpreadsheet, Shield, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

export default function SettingsPreferences() {
  const navigate = useNavigate();
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [brand, setBrand] = useState({ brand_name: "", brand_primary_color: "", brand_accent_color: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("orgs").select("brand_name, brand_primary_color, brand_accent_color").eq("id", orgId).single().then(({ data }) => {
      if (data) setBrand({
        brand_name: (data as any).brand_name || "",
        brand_primary_color: (data as any).brand_primary_color || "",
        brand_accent_color: (data as any).brand_accent_color || "",
      });
    });
  }, [orgId]);

  const saveBrand = async () => {
    if (!orgId) return;
    setSaving(true);
    await supabase.from("orgs").update({
      brand_name: brand.brand_name || null,
      brand_primary_color: brand.brand_primary_color || null,
      brand_accent_color: brand.brand_accent_color || null,
    } as any).eq("id", orgId);
    toast({ title: t("page.settings.branding_updated") || "Branding updated" });
    setSaving(false);
  };

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold">{t("page.settings.preferences") || "Preferences"}</h1>
      </header>
      <div className="flex-1 px-4 pb-24 mt-2 space-y-3">
        {/* Branding */}
        <div className="rounded-2xl border p-4 space-y-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
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
        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
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
        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold">{t("page.settings.gdpr_title") || "Privacy & Data"}</h2>
          </div>
          <div className="space-y-2">
            <button onClick={async () => {
              if (!user) return;
              toast({ title: t("page.settings.export_started") || "Export started…" });
              try {
                const tables = ["profiles", "wallet_transactions", "documents", "leases", "tenants", "properties"];
                const allData: Record<string, unknown[]> = {};
                for (const table of tables) {
                  const { data } = await supabase.from(table as any).select("*").or(`user_id.eq.${user.id},owner_user_id.eq.${user.id}`).limit(1000);
                  if (data?.length) allData[table] = data;
                }
                const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `easylocs-data-${new Date().toISOString().slice(0, 10)}.json`;
                a.click(); URL.revokeObjectURL(url);
                toast({ title: t("page.settings.export_done") || "Data exported" });
              } catch (err: any) {
                toast({ title: "Export failed", description: err.message, variant: "destructive" });
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
                await supabase.from("audit_logs").insert({
                  user_id: user.id, action: "account_deletion_requested",
                  metadata_json: { email: user.email, requested_at: new Date().toISOString() },
                });
              } catch (err: any) {
                toast({ title: "Request failed", description: err.message, variant: "destructive" });
              }
            }} className="w-full text-left px-4 py-3 rounded-xl border border-destructive/30 hover:bg-destructive/5 transition-colors">
              <p className="text-sm font-medium text-destructive">{t("page.settings.delete_account") || "Delete account"}</p>
              <p className="text-xs text-muted-foreground">{t("page.settings.delete_desc") || "Permanently delete your account and data"}</p>
            </button>
          </div>
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
