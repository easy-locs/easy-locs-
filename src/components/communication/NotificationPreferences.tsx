import { useState, useEffect } from "react";
import { Bell, Mail, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface Prefs {
  email_messages: boolean;
  email_payments: boolean;
  email_documents: boolean;
  email_maintenance: boolean;
  email_urgent_only: boolean;
  in_app_messages: boolean;
  in_app_payments: boolean;
  in_app_documents: boolean;
  in_app_maintenance: boolean;
}

const DEFAULT_PREFS: Prefs = {
  email_messages: true,
  email_payments: true,
  email_documents: true,
  email_maintenance: true,
  email_urgent_only: false,
  in_app_messages: true,
  in_app_payments: true,
  in_app_documents: true,
  in_app_maintenance: true,
};

export default function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            email_messages: data.email_messages ?? true,
            email_payments: data.email_payments ?? true,
            email_documents: data.email_documents ?? true,
            email_maintenance: data.email_maintenance ?? true,
            email_urgent_only: data.email_urgent_only ?? false,
            in_app_messages: data.in_app_messages ?? true,
            in_app_payments: data.in_app_payments ?? true,
            in_app_documents: data.in_app_documents ?? true,
            in_app_maintenance: data.in_app_maintenance ?? true,
          });
        }
        setLoaded(true);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("notification_preferences").upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) {
      toast({ title: t("page.common.error") || "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("page.settings.profile_updated") || "Preferences updated" });
    }
    setSaving(false);
  };

  const toggle = (key: keyof Prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const Row = ({ label, emailKey, appKey }: { label: string; emailKey: keyof Prefs; appKey: keyof Prefs }) => (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <Switch checked={prefs[emailKey]} onCheckedChange={() => toggle(emailKey)} />
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          <Switch checked={prefs[appKey]} onCheckedChange={() => toggle(appKey)} />
        </div>
      </div>
    </div>
  );

  if (!loaded) return null;

  return (
    <div className="ui-card">
      <div className="flex items-center gap-3 mb-5">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">Préférences de notification</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Contrôlez comment vous recevez les notifications par email et dans l'application.
      </p>

      <div className="mb-2">
        <div className="flex justify-end gap-6 text-xs text-muted-foreground mb-1 pr-1">
          <span className="w-16 text-center">Email</span>
          <span className="w-16 text-center">In-app</span>
        </div>
        <Row label="💬 Messages" emailKey="email_messages" appKey="in_app_messages" />
        <Row label="💰 Paiements" emailKey="email_payments" appKey="in_app_payments" />
        <Row label="📄 Documents" emailKey="email_documents" appKey="in_app_documents" />
        <Row label="🔧 Maintenance" emailKey="email_maintenance" appKey="in_app_maintenance" />
      </div>

      <div className="flex items-center justify-between py-3 border-t border-border/30 mt-2">
        <div>
          <span className="text-sm text-foreground">🚨 Mode urgent uniquement</span>
          <p className="text-xs text-muted-foreground">Ne recevoir que les emails urgents (retards, échéances)</p>
        </div>
        <Switch checked={prefs.email_urgent_only} onCheckedChange={() => toggle("email_urgent_only")} />
      </div>

      <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
        <Smartphone className="h-4 w-4 shrink-0" />
        <span>Push notifications will be available soon via the mobile app.</span>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary mt-4">
        {saving ? "Saving..." : "Save preferences"}
      </button>
    </div>
  );
}
