import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Prefs = {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  order_updates: boolean;
  promo_updates: boolean;
  wallet_updates: boolean;
};

const DEFAULT_PREFS: Prefs = {
  push_enabled: true,
  email_enabled: true,
  sms_enabled: false,
  order_updates: true,
  promo_updates: true,
  wallet_updates: true,
};

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;

    const run = async () => {
      if (!user?.id) return;
      const { data } = await (supabase as any)
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!live) return;
      if (data) {
        setPrefs({
          push_enabled: !!(data as any).push_enabled,
          email_enabled: !!(data as any).email_enabled,
          sms_enabled: !!(data as any).sms_enabled,
          order_updates: !!(data as any).order_updates,
          promo_updates: !!(data as any).promo_updates,
          wallet_updates: !!(data as any).wallet_updates,
        });
      }
    };

    run();
    return () => {
      live = false;
    };
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("user_notification_preferences")
        .upsert(
          {
            user_id: user.id,
            ...prefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      toast.success("Preferences saved");
    } catch (err: any) {
      toast.error(err.message || "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ label, keyName }: { label: string; keyName: keyof Prefs }) => (
    <button
      onClick={() => setPrefs((prev) => ({ ...prev, [keyName]: !prev[keyName] }))}
      className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            prefs[keyName]
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {prefs[keyName] ? "On" : "Off"}
        </span>
      </div>
    </button>
  );

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Notification Preferences</h1>
          <p className="text-xs text-muted-foreground">Control how you get updates</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        <Toggle label="Push Notifications" keyName="push_enabled" />
        <Toggle label="Email Notifications" keyName="email_enabled" />
        <Toggle label="SMS Notifications" keyName="sms_enabled" />
        <Toggle label="Order Updates" keyName="order_updates" />
        <Toggle label="Promo Updates" keyName="promo_updates" />
        <Toggle label="Wallet Updates" keyName="wallet_updates" />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
