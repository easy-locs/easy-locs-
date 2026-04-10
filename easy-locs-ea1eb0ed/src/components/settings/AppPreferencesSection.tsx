/**
 * AppPreferencesSection — Location, notifications & privacy toggles.
 * Auto-enables location on mount. Persists preferences in localStorage.
 */
import { useState, useEffect, useCallback } from "react";
import { MapPin, Bell, Shield, Navigation, Eye, Radio, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const PREFS_KEY = "easylocs_app_prefs";

export interface AppPreferences {
  autoLocation: boolean;
  locationSharing: boolean;
  nearbyVisible: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showOnlineStatus: boolean;
  autoDeleteMessages: boolean;
  autoDeleteDelay: string; // "off" | "24h" | "7d" | "30d"
}

const DEFAULT_PREFS: AppPreferences = {
  autoLocation: true,
  locationSharing: true,
  nearbyVisible: true,
  pushNotifications: true,
  emailNotifications: true,
  soundEnabled: true,
  vibrationEnabled: true,
  showOnlineStatus: true,
  autoDeleteMessages: false,
  autoDeleteDelay: "off",
};

export function getAppPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS };
}

export function saveAppPreferences(prefs: AppPreferences) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

const AUTO_DELETE_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export default function AppPreferencesSection() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<AppPreferences>(getAppPreferences);
  const [locationStatus, setLocationStatus] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");

  // Check permission status
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        setLocationStatus(result.state as any);
        result.onchange = () => setLocationStatus(result.state as any);
      }).catch(() => {});
    }
  }, []);

  // Auto-enable location on mount if pref is on
  useEffect(() => {
    if (prefs.autoLocation && locationStatus === "prompt") {
      import("@/lib/location/requestLocation").then(({ requestLocation }) => {
        requestLocation().then((pos) => {
          if (pos) {
            setLocationStatus("granted");
            toast.success(t("settings.location_enabled") || "📍 Location enabled");
          } else {
            setLocationStatus("denied");
          }
        });
      });
    }
  }, [prefs.autoLocation, locationStatus]);

  const update = useCallback((key: keyof AppPreferences, value: any) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveAppPreferences(next);
      return next;
    });
  }, []);

  const handleLocationToggle = useCallback((checked: boolean) => {
    update("autoLocation", checked);
    if (checked && locationStatus !== "granted") {
      import("@/lib/location/requestLocation").then(({ requestLocation }) => {
        requestLocation().then((pos) => {
          if (pos) {
            setLocationStatus("granted");
            toast.success(t("settings.location_enabled") || "📍 Location enabled");
          } else {
            setLocationStatus("denied");
            toast.error(t("settings.location_denied") || "Location permission denied");
          }
        });
      });
    }
  }, [locationStatus, update]);

  const handleNotifToggle = useCallback(async (checked: boolean) => {
    update("pushNotifications", checked);
    if (checked && "Notification" in window && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        toast.success(t("settings.notif_enabled") || "🔔 Notifications enabled");
      }
    }
  }, [update]);

  const statusDot = (active: boolean) => (
    <span className={`inline-block h-2 w-2 rounded-full ${active ? "bg-green-500" : "bg-muted-foreground/30"}`} />
  );

  return (
    <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 space-y-5">
      {/* Location */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">
            {t("settings.location") || "Location"}
          </h2>
          {statusDot(locationStatus === "granted")}
        </div>
        <div className="space-y-3">
          <ToggleRow
            icon={<Navigation className="h-4 w-4" />}
            label={t("settings.auto_location") || "Auto-detect location"}
            description={t("settings.auto_location_desc") || "Automatically detect your position on app start"}
            checked={prefs.autoLocation}
            onChange={handleLocationToggle}
          />
          <ToggleRow
            icon={<Radio className="h-4 w-4" />}
            label={t("settings.location_sharing") || "Share my location"}
            description={t("settings.location_sharing_desc") || "Allow nearby discovery to find you"}
            checked={prefs.locationSharing}
            onChange={(v) => update("locationSharing", v)}
          />
          <ToggleRow
            icon={<Eye className="h-4 w-4" />}
            label={t("settings.nearby_visible") || "Visible on nearby"}
            description={t("settings.nearby_visible_desc") || "Appear in nearby results for other users"}
            checked={prefs.nearbyVisible}
            onChange={(v) => update("nearbyVisible", v)}
          />
          <div className="text-xs text-muted-foreground pl-6">
            {locationStatus === "granted" && "✅ " + (t("settings.location_active") || "Location active")}
            {locationStatus === "denied" && "❌ " + (t("settings.location_blocked") || "Location blocked by browser")}
            {locationStatus === "prompt" && "⏳ " + (t("settings.location_pending") || "Waiting for permission")}
          </div>
        </div>
      </div>

      <Separator />

      {/* Notifications */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">
            {t("settings.notifications") || "Notifications"}
          </h2>
          {statusDot(prefs.pushNotifications)}
        </div>
        <div className="space-y-3">
          <ToggleRow
            icon={<Bell className="h-4 w-4" />}
            label={t("settings.push_notif") || "Push notifications"}
            description={t("settings.push_notif_desc") || "Receive instant alerts for messages and bookings"}
            checked={prefs.pushNotifications}
            onChange={handleNotifToggle}
          />
          <ToggleRow
            icon={<Bell className="h-4 w-4" />}
            label={t("settings.email_notif") || "Email notifications"}
            description={t("settings.email_notif_desc") || "Receive email summaries and alerts"}
            checked={prefs.emailNotifications}
            onChange={(v) => update("emailNotifications", v)}
          />
          <ToggleRow
            icon={<Bell className="h-4 w-4" />}
            label={t("settings.sound") || "Sound"}
            description={t("settings.sound_desc") || "Play sound for incoming messages"}
            checked={prefs.soundEnabled}
            onChange={(v) => update("soundEnabled", v)}
          />
          <ToggleRow
            icon={<Bell className="h-4 w-4" />}
            label={t("settings.vibration") || "Vibration"}
            description={t("settings.vibration_desc") || "Vibrate on notifications"}
            checked={prefs.vibrationEnabled}
            onChange={(v) => update("vibrationEnabled", v)}
          />
        </div>
      </div>

      <Separator />

      {/* Privacy */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">
            {t("settings.privacy") || "Privacy"}
          </h2>
        </div>
        <div className="space-y-3">
          <ToggleRow
            icon={<Eye className="h-4 w-4" />}
            label={t("settings.online_status") || "Show online status"}
            description={t("settings.online_status_desc") || "Let others see when you're online"}
            checked={prefs.showOnlineStatus}
            onChange={(v) => update("showOnlineStatus", v)}
          />
          <ToggleRow
            icon={<Clock className="h-4 w-4" />}
            label={t("settings.auto_delete") || "Auto-delete messages"}
            description={t("settings.auto_delete_desc") || "Automatically remove old messages"}
            checked={prefs.autoDeleteMessages}
            onChange={(v) => update("autoDeleteMessages", v)}
          />
          {prefs.autoDeleteMessages && (
            <div className="pl-6 flex gap-2 flex-wrap">
              {AUTO_DELETE_OPTIONS.filter(o => o.value !== "off").map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update("autoDeleteDelay", opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    prefs.autoDeleteDelay === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <Label className="text-sm font-medium text-foreground block">{label}</Label>
          <p className="text-xs text-muted-foreground leading-snug">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0 mt-0.5" />
    </div>
  );
}
