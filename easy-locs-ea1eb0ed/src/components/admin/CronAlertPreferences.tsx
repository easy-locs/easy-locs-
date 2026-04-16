import { useState, useEffect, useCallback } from "react";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Settings2, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchCronAlertPrefs,
  upsertCronAlertPrefs,
  type CronAlertPrefs,
} from "@/repositories/admin.repository";
import { toast } from "sonner";

const CronAlertPreferences = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<CronAlertPrefs>({
    in_app_enabled: true,
    email_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadPrefs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchCronAlertPrefs(user.id);
      setPrefs(data);
    } catch {
      // defaults are fine
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await upsertCronAlertPrefs(user.id, prefs);
      setDirty(false);
      toast.success("Cron alert preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof CronAlertPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setDirty(true);
  };

  if (loading) {
    return (
      <AppCard>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </AppCard>
    );
  }

  return (
    <AppCard>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4 text-accent" />
          Cron Failure Alert Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure how you receive alerts when background jobs fail.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-foreground">In-app notifications</span>
                <p className="text-xs text-muted-foreground">
                  Receive real-time alerts in the notification panel
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.in_app_enabled}
              onCheckedChange={() => toggle("in_app_enabled")}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-foreground">Email notifications</span>
                <p className="text-xs text-muted-foreground">
                  Receive email alerts for cron job failures
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.email_enabled}
              onCheckedChange={() => toggle("email_enabled")}
            />
          </div>
        </div>

        {dirty && (
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Save Preferences
              </>
            )}
          </Button>
        )}
      </CardContent>
    </AppCard>
  );
};

export default CronAlertPreferences;
