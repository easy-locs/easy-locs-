import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, Download, Trash2, AlertTriangle, Cookie, Megaphone, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useUiEngine } from "@/hooks/useUiEngine";
import * as settingsRepo from "@/repositories/settings.repository";
import { getConsent, setConsent, revokeConsent, type CookieConsent } from "@/lib/consent/cookie-consent";
import { db } from "@/services/db";

type Visibility = "public" | "contacts" | "private";
const GOLD = "hsl(38 65% 56%)";

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
  const [cookieConsent, setCookieConsent] = useState<CookieConsent | null>(getConsent());

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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
      const { data: { session } } = await db.auth.getSession();
      const token = session?.access_token;

      if (supabaseUrl && token) {
        const res = await fetch(`${supabaseUrl}/functions/v1/gdpr-export`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `easylocs-gdpr-export-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: t("privacy.export_success") || "Data exported successfully (GDPR Art. 20)" });
        } else {
          throw new Error("Export failed");
        }
      } else {
        const data = await settingsRepo.exportUserData(user.id);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `easylocs-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: t("privacy.export_success") || "Data exported successfully" });
      }
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
    setExporting(false);
  };

  const requestDeletion = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
      const { data: { session } } = await db.auth.getSession();
      const token = session?.access_token;

      if (supabaseUrl && token) {
        const res = await fetch(`${supabaseUrl}/functions/v1/gdpr-delete-account`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmation: "DELETE_MY_ACCOUNT" }),
        });
        if (res.ok) {
          const result = await res.json();
          toast({ title: `Account deletion scheduled for ${new Date(result.scheduled_for).toLocaleDateString()}. Check your email.` });
        } else {
          throw new Error("Deletion request failed");
        }
      } else {
        await settingsRepo.requestAccountDeletion(user.id, user.email || "");
        toast({ title: t("privacy.deletion_requested") || "Account deletion request submitted. You will receive a confirmation email within 48 hours." });
      }
      setDeleteConfirm(false);
    } catch {
      toast({ title: "Request failed. Please try again later.", variant: "destructive" });
    }
    setDeleting(false);
  };

  const updateCookieConsent = (analytics: boolean, marketing: boolean) => {
    setConsent(analytics, marketing);
    setCookieConsent(getConsent());
    toast({ title: "Cookie preferences updated" });
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
          <div className="flex items-center gap-2 mb-1">
            <Cookie className="w-4 h-4" style={{ color: GOLD }} />
            <h2 className="text-sm font-bold">Cookie Preferences</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Manage your cookie consent. Essential cookies are always active.</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-xs font-medium">Essential</span>
              <span className="text-xs text-muted-foreground">Always on</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-xs font-medium">Analytics</span>
              <button
                onClick={() => updateCookieConsent(!cookieConsent?.analytics, cookieConsent?.marketing ?? false)}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: "none",
                  background: cookieConsent?.analytics ? GOLD : "hsl(var(--border))",
                  position: "relative", cursor: "pointer",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, left: cookieConsent?.analytics ? 20 : 2,
                  width: 18, height: 18, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "hsl(var(--muted))" }}>
              <span className="text-xs font-medium">Marketing</span>
              <button
                onClick={() => updateCookieConsent(cookieConsent?.analytics ?? false, !cookieConsent?.marketing)}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: "none",
                  background: cookieConsent?.marketing ? GOLD : "hsl(var(--border))",
                  position: "relative", cursor: "pointer",
                }}
              >
                <span style={{
                  position: "absolute", top: 2, left: cookieConsent?.marketing ? 20 : 2,
                  width: 18, height: 18, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/settings/marketing")}
          className="w-full rounded-2xl border p-4 flex items-center gap-3 text-left"
          style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
            <Megaphone className="w-4 h-4" style={{ color: GOLD }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Marketing Preferences</p>
            <p className="text-xs text-muted-foreground">Manage email, push & SMS opt-in</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="space-y-2">
          <button
            onClick={() => navigate("/terms")}
            className="w-full rounded-2xl border p-3 flex items-center gap-3 text-left"
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Terms & Conditions (CGU)</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
          <button
            onClick={() => navigate("/privacy")}
            className="w-full rounded-2xl border p-3 flex items-center gap-3 text-left"
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
          >
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Privacy Policy</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </div>

        <div className="rounded-2xl border p-4" style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
          <h2 className="text-sm font-bold mb-1">{t("privacy.data_portability") || "Data Portability (GDPR Art. 20)"}</h2>
          <p className="text-xs text-muted-foreground mb-3">Download all your personal data as a JSON file. Includes your profile, transactions, messages metadata, bookings, and preferences.</p>
          <button onClick={exportData} disabled={exporting} className="btn-primary w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            {exporting ? "Exporting…" : (t("privacy.export_data") || "Export my data")}
          </button>
        </div>

        <div className="rounded-2xl border p-4 border-destructive/30" style={{ background: "hsl(var(--card))" }}>
          <h2 className="text-sm font-bold text-destructive mb-1">{t("privacy.right_to_erasure") || "Right to Erasure (GDPR Art. 17)"}</h2>
          <p className="text-xs text-muted-foreground mb-3">Request permanent deletion of your account and all associated data. A 30-day grace period applies during which you can cancel the request.</p>

          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive text-destructive py-2.5 text-sm font-medium active:opacity-80">
              <Trash2 className="w-4 h-4" />
              {t("privacy.request_deletion") || "Request account deletion"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">Are you sure? Your account will be anonymized immediately and permanently deleted after 30 days. You will receive a confirmation email. You can cancel during the grace period by logging in.</p>
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
