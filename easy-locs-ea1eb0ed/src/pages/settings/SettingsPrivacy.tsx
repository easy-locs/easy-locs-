import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Download, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useUiEngine } from "@/hooks/useUiEngine";
import * as settingsRepo from "@/repositories/settings.repository";

type Visibility = "public" | "contacts" | "private";

export default function SettingsPrivacy() {
  useUiEngine("settings-privacy");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [visibility, setVisibility] = useState<Visibility>("contacts");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    settingsRepo.fetchProfile(user.id).then(p => {
      if (p && (p as any).profile_visibility) setVisibility((p as any).profile_visibility);
    });
  }, [user]);

  const saveVisibility = async (v: Visibility) => {
    setVisibility(v);
    if (!user) return;
    setSaving(true);
    await settingsRepo.updateProfileField(user.id, "profile_visibility", v).catch(() => {});
    setSaving(false);
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const data = await settingsRepo.exportUserData(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `easylocs-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("privacy.export_success") || "Data exported successfully" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
    setExporting(false);
  };

  const requestDeletion = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await settingsRepo.requestAccountDeletion(user.id, user.email || "");
      toast({ title: t("privacy.deletion_requested") || "Account deletion request submitted. You will receive a confirmation email within 48 hours." });
      setDeleteConfirm(false);
    } catch {
      toast({ title: "Request failed. Please try again later.", variant: "destructive" });
    }
    setDeleting(false);
  };

  const VISIBILITY_OPTIONS: { value: Visibility; label: string; description: string; icon: typeof Eye }[] = [
    { value: "public", label: "Public", description: "Anyone can see your profile", icon: Eye },
    { value: "contacts", label: "Contacts only", description: "Only people you know", icon: Eye },
    { value: "private", label: "Private", description: "Only you can see your profile", icon: Shield },
  ];

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{t("settings.privacy") || "Privacy & GDPR"}</h1>
        </div>
      </header>

      <div className="flex-1 px-4 pb-24 mt-2 space-y-4 overflow-y-auto">
        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <h2 className="text-sm font-bold mb-1">{t("privacy.profile_visibility") || "Profile Visibility"}</h2>
          <p className="text-xs text-muted-foreground mb-3">Control who can see your profile information.</p>
          <div className="space-y-2">
            {VISIBILITY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => saveVisibility(opt.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${visibility === opt.value ? "border-primary bg-primary/5" : "border-border"}`}
                  disabled={saving}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${visibility === opt.value ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  {visibility === opt.value && <div className="ml-auto w-4 h-4 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <h2 className="text-sm font-bold mb-1">{t("privacy.data_portability") || "Data Portability (GDPR Art. 20)"}</h2>
          <p className="text-xs text-muted-foreground mb-3">Download all your personal data as a JSON file. Includes your profile, transactions, bookings, and preferences.</p>
          <button onClick={exportData} disabled={exporting} className="btn-primary w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            {exporting ? "Exporting…" : (t("privacy.export_data") || "Export my data")}
          </button>
        </div>

        <div className="rounded-2xl border p-4 border-destructive/30" style={{ background: "hsl(var(--card))" }}>
          <h2 className="text-sm font-bold text-destructive mb-1">{t("privacy.right_to_erasure") || "Right to Erasure (GDPR Art. 17)"}</h2>
          <p className="text-xs text-muted-foreground mb-3">Request permanent deletion of your account and all associated data. This action cannot be undone.</p>

          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive text-destructive py-2.5 text-sm font-medium active:opacity-80">
              <Trash2 className="w-4 h-4" />
              {t("privacy.request_deletion") || "Request account deletion"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">Are you sure? This will permanently delete your account and all data within 30 days. You will receive a confirmation email.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(false)} className="flex-1 rounded-xl border py-2 text-sm" style={{ borderColor: "hsl(var(--border))" }}>Cancel</button>
                <button onClick={requestDeletion} disabled={deleting} className="flex-1 rounded-xl bg-destructive text-white py-2 text-sm font-medium">
                  {deleting ? "Sending…" : "Confirm deletion"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
