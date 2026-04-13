import { useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { getNotifAlertPrefs, setNotifAlertPrefs, requestNotificationPermission, type NotifAlertPrefs } from "@/lib/notif-alert-prefs";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouNotificationsPage({ onBack }: Props) {
  const { t } = useI18n();
  const [alertPrefs, setAlertPrefsState] = useState<NotifAlertPrefs>(getNotifAlertPrefs());

  const toggleAlertPref = (key: keyof NotifAlertPrefs) => {
    if (key === "typeAlerts") return;
    const next = setNotifAlertPrefs({ [key]: !alertPrefs[key as keyof NotifAlertPrefs] });
    setAlertPrefsState(next);
    if (key === "vibration" && !alertPrefs.vibration) haptic("light");
    if (key === "browserNotifications" && !alertPrefs.browserNotifications) requestNotificationPermission();
  };

  const toggleTypeAlert = (type: keyof typeof alertPrefs.typeAlerts) => {
    const next = setNotifAlertPrefs({ typeAlerts: { ...alertPrefs.typeAlerts, [type]: !alertPrefs.typeAlerts[type] } });
    setAlertPrefsState(next);
  };

  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 min-h-[44px]">
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        {desc && <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold break-words" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.notif_title")}</h2>
      </div>

      <div className="space-y-1 mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.message_notif")}</p>
        <Row label={t("orbit.you.show_notif")} desc={t("orbit.you.show_notif_desc")}><Switch checked={alertPrefs.typeAlerts.messages} onCheckedChange={() => toggleTypeAlert("messages")} /></Row>
        <Row label={t("orbit.you.sound")} desc={t("orbit.you.sound_desc")}><Switch checked={alertPrefs.sound} onCheckedChange={() => toggleAlertPref("sound")} /></Row>
        <Row label={t("orbit.you.vibration")} desc={t("orbit.you.vibration_notif_desc")}><Switch checked={alertPrefs.vibration} onCheckedChange={() => toggleAlertPref("vibration")} /></Row>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.group_notif")}</p>
        <Row label={t("orbit.you.show_notif")} desc={t("orbit.you.show_group_notif_desc")}><Switch checked={alertPrefs.typeAlerts.bookings} onCheckedChange={() => toggleTypeAlert("bookings")} /></Row>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.call_notif")}</p>
        <Row label={t("orbit.you.ring_for_calls")} desc={t("orbit.you.ring_for_calls_desc")}><Switch checked={alertPrefs.browserNotifications} onCheckedChange={() => toggleAlertPref("browserNotifications")} /></Row>

        <Separator className="my-3" />
        <button onClick={() => {
          const next = setNotifAlertPrefs({
            browserNotifications: true, sound: true, vibration: true,
            typeAlerts: { messages: true, bookings: true, payments: true, documents: true, maintenance: true },
          });
          setAlertPrefsState(next);
          toast.success(t("orbit.you.notif_reset_done"));
        }} className="w-full text-left px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors min-h-[44px]">
          <p className="text-sm font-medium text-destructive">{t("orbit.you.reset_notif")}</p>
        </button>
      </div>
    </div>
  );
}
