import { useState, useEffect, useMemo } from "react";
import { Bell, Mail, Smartphone, Volume2, Vibrate, BellRing, MessageCircle, CalendarCheck, CreditCard, FileText, Wrench, SendHorizonal, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { getNotifAlertPrefs, setNotifAlertPrefs, requestNotificationPermission, type NotifAlertPrefs, type NotifTypeAlerts } from "@/lib/notif-alert-prefs";

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

const TYPE_ALERT_KEYS: (keyof NotifTypeAlerts)[] = ["messages", "bookings", "payments", "documents", "maintenance"];
const TYPE_I18N_MAP: Record<keyof NotifTypeAlerts, string> = {
  messages: "notif.type_messages",
  bookings: "notif.type_bookings",
  payments: "notif.type_payments",
  documents: "notif.type_documents",
  maintenance: "notif.type_maintenance",
};
const TYPE_EMOJI: Record<keyof NotifTypeAlerts, string> = {
  messages: "💬",
  bookings: "📅",
  payments: "💰",
  documents: "📄",
  maintenance: "🔧",
};

/* ─── Status Summary ─── */
function StatusSummary({ alertPrefs, browserPermission, urgentOnly, t }: {
  alertPrefs: NotifAlertPrefs;
  browserPermission: NotificationPermission | "unsupported";
  urgentOnly: boolean;
  t: (k: string) => string;
}) {
  const enabledTypes = TYPE_ALERT_KEYS.filter((k) => alertPrefs.typeAlerts[k]).length;

  const items: { label: string; status: "on" | "off" | "blocked"; icon: typeof Bell }[] = [
    {
      label: t("notif.status_browser") || "Browser",
      status: browserPermission === "granted" && alertPrefs.browserNotifications ? "on" : browserPermission === "denied" ? "blocked" : "off",
      icon: Bell,
    },
    {
      label: t("notif.status_sound") || "Sound",
      status: alertPrefs.sound ? "on" : "off",
      icon: Volume2,
    },
    {
      label: t("notif.status_vibration") || "Vibration",
      status: alertPrefs.vibration ? "on" : "off",
      icon: Vibrate,
    },
  ];

  return (
    <div className="ui-card">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 className="h-5 w-5 text-accent" />
        <h2 className="font-semibold text-foreground">{t("notif.status_summary") || "Status Summary"}</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, status, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/20 border border-border/30">
            <Icon className={`h-4 w-4 ${status === "on" ? "text-success" : status === "blocked" ? "text-destructive" : "text-muted-foreground/50"}`} />
            <span className="text-xs font-medium text-foreground">{label}</span>
            <Badge
              variant="outline"
              className={`text-[10px] h-5 font-semibold ${
                status === "on"
                  ? "bg-success/10 text-success border-success/30"
                  : status === "blocked"
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-muted/40 text-muted-foreground border-border/40"
              }`}
            >
              {status === "on" ? `✓ ${t("notif.status_on") || "On"}` : status === "blocked" ? `✕ ${t("notif.status_blocked") || "Blocked"}` : `— ${t("notif.status_off") || "Off"}`}
            </Badge>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span>📋 {enabledTypes}/{TYPE_ALERT_KEYS.length} {t("notif.types_enabled") || "types enabled of"} 5</span>
        {urgentOnly && (
          <span className="flex items-center gap-1 text-amber-500">
            <ShieldAlert className="h-3 w-3" /> {t("notif.status_email_urgent") || "Urgent mode"}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [alertPrefs, setAlertPrefsState] = useState<NotifAlertPrefs>(getNotifAlertPrefs());
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );

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

  const toggleAlert = (key: keyof NotifAlertPrefs) => {
    if (key === "typeAlerts") return;
    const next = setNotifAlertPrefs({ [key]: !alertPrefs[key] });
    setAlertPrefsState(next);
  };

  const toggleTypeAlert = (key: keyof NotifTypeAlerts) => {
    const next = setNotifAlertPrefs({
      typeAlerts: { ...alertPrefs.typeAlerts, [key]: !alertPrefs.typeAlerts[key] },
    });
    setAlertPrefsState(next);
  };

  const handleEnableBrowser = async () => {
    const result = await requestNotificationPermission();
    if (result) setBrowserPermission(result);
    if (result === "granted") {
      const next = setNotifAlertPrefs({ browserNotifications: true });
      setAlertPrefsState(next);
      toast({ title: t("notif.browser_enabled") || "Browser notifications enabled" });
    } else if (result === "denied") {
      toast({ title: t("notif.browser_blocked") || "Notifications blocked", description: "Please enable them in your browser settings.", variant: "destructive" });
    }
  };

  const handleSendTest = async () => {
    if (!user) return;
    setSendingTest(true);
    try {
      await supabase.from("notifications").insert({
        user_id: user.id,
        org_id: null as any,
        type: "info",
        title: "🔔 Test notification",
        message: t("notif.test_desc") || "This is a test notification to verify your alert settings are working correctly.",
        link: "/settings",
        metadata_json: {
          target_type: "message",
          target_id: "test-" + Date.now(),
          target_url: "/settings",
          module: "long_term",
          country_code: "",
        },
      });
      toast({ title: t("notif.test_sent") || "Test notification sent!" });
    } catch {
      toast({ title: "Error", description: "Could not send test notification", variant: "destructive" });
    }
    setSendingTest(false);
  };

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
    <div className="space-y-6">
      {/* Status summary */}
      <StatusSummary
        alertPrefs={alertPrefs}
        browserPermission={browserPermission}
        urgentOnly={prefs.email_urgent_only}
        t={t}
      />

      {/* Alert preferences (local) */}
      <div className="ui-card">
        <div className="flex items-center gap-3 mb-5">
          <BellRing className="h-5 w-5 text-accent" />
          <h2 className="font-semibold text-foreground">{t("notif.alert_settings") || "Alert Settings"}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("notif.alert_settings_desc") || "Control how you receive real-time alerts on this device."}
        </p>

        {/* Global toggles */}
        <div className="space-y-3">
          {/* Browser notifications */}
          <div className="flex items-center justify-between py-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-foreground">{t("notif.browser_notifications") || "Browser notifications"}</span>
                <p className="text-xs text-muted-foreground">
                   {browserPermission === "granted"
                    ? t("notif.browser_enabled") || "Enabled — you'll see desktop alerts"
                    : browserPermission === "denied"
                    ? t("notif.browser_blocked") || "Blocked in browser settings"
                    : browserPermission === "unsupported"
                    ? t("notif.browser_unsupported") || "Not supported in this browser"
                    : t("notif.browser_not_enabled") || "Not yet enabled"}
                </p>
              </div>
            </div>
            {browserPermission === "granted" ? (
              <Switch checked={alertPrefs.browserNotifications} onCheckedChange={() => toggleAlert("browserNotifications")} />
            ) : browserPermission !== "denied" && browserPermission !== "unsupported" ? (
              <Button size="sm" variant="outline" onClick={handleEnableBrowser} className="text-xs">
                {t("notif.enable") || "Enable"}
              </Button>
            ) : null}
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between py-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{t("notif.sound") || "Notification sound"}</span>
            </div>
            <Switch checked={alertPrefs.sound} onCheckedChange={() => toggleAlert("sound")} />
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between py-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              <Vibrate className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{t("notif.vibration") || "Vibration"}</span>
            </div>
            <Switch checked={alertPrefs.vibration} onCheckedChange={() => toggleAlert("vibration")} />
          </div>
        </div>

        {/* Per-type alert toggles */}
        <div className="mt-5 pt-4 border-t border-border/30">
          <h3 className="text-sm font-medium text-foreground mb-3">
            {t("notif.per_type_alerts") || "Alert by notification type"}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {t("notif.per_type_alerts_desc") || "Disable sound, vibration, and browser alerts for specific categories."}
          </p>
          <div className="space-y-1">
            {TYPE_ALERT_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                <span className="text-sm text-foreground">{TYPE_EMOJI[key]} {t(TYPE_I18N_MAP[key]) || key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <Switch
                  checked={alertPrefs.typeAlerts[key]}
                  onCheckedChange={() => toggleTypeAlert(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Test notification button */}
        <div className="mt-5 pt-4 border-t border-border/30">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={sendingTest}
            className="w-full sm:w-auto gap-2"
          >
            <SendHorizonal className="h-4 w-4" />
            {sendingTest ? (t("notif.sending") || "Sending…") : t("notif.send_test") || "Send test notification"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {t("notif.test_desc") || "Sends a real notification to verify your sound, vibration, and browser alert settings."}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>{t("notif.smart_alerts_hint") || "Alerts are automatically silenced when you're viewing related content or the notification panel is open."}</span>
        </div>
      </div>

      {/* Channel preferences (server-side) */}
      <div className="ui-card">
        <div className="flex items-center gap-3 mb-5">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{t("notif.channel_prefs") || "Notification Channels"}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("notif.channel_prefs_desc") || "Control which notifications you receive by email and in-app."}
        </p>

        <div className="mb-2">
          <div className="flex justify-end gap-6 text-xs text-muted-foreground mb-1 pr-1">
            <span className="w-16 text-center">{t("notif.col_email") || "Email"}</span>
            <span className="w-16 text-center">{t("notif.col_inapp") || "In-app"}</span>
          </div>
          <Row label={`💬 ${t("notif.type_messages") || "Messages"}`} emailKey="email_messages" appKey="in_app_messages" />
          <Row label={`💰 ${t("notif.type_payments") || "Payments"}`} emailKey="email_payments" appKey="in_app_payments" />
          <Row label={`📄 ${t("notif.type_documents") || "Documents"}`} emailKey="email_documents" appKey="in_app_documents" />
          <Row label={`🔧 ${t("notif.type_maintenance") || "Maintenance"}`} emailKey="email_maintenance" appKey="in_app_maintenance" />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border/30 mt-2">
          <div>
            <span className="text-sm text-foreground">🚨 {t("notif.urgent_only") || "Urgent only mode"}</span>
            <p className="text-xs text-muted-foreground">{t("notif.urgent_only_desc") || "Only receive emails for urgent items (late payments, deadlines)"}</p>
          </div>
          <Switch checked={prefs.email_urgent_only} onCheckedChange={() => toggle("email_urgent_only")} />
        </div>

        <Button onClick={save} disabled={saving} className="mt-4 w-full sm:w-auto">
          {saving ? (t("notif.saving") || "Saving…") : t("page.settings.save") || "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
