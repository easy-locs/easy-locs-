/**
 * YouNotificationsPage — Orbit notification settings sub-page.
 */
import { useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { getNotifAlertPrefs, setNotifAlertPrefs, requestNotificationPermission, type NotifAlertPrefs } from "@/lib/notif-alert-prefs";

interface Props { onBack: () => void; }

export default function YouNotificationsPage({ onBack }: Props) {
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
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </button>
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Notifications</h2>
      </div>

      <div className="space-y-1 mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Message notifications</p>
        <Row label="Show Notifications" desc="Get notified for new messages"><Switch checked={alertPrefs.typeAlerts.messages} onCheckedChange={() => toggleTypeAlert("messages")} /></Row>
        <Row label="Sound" desc="Play sound for notifications"><Switch checked={alertPrefs.sound} onCheckedChange={() => toggleAlertPref("sound")} /></Row>
        <Row label="Vibration" desc="Vibrate for notifications"><Switch checked={alertPrefs.vibration} onCheckedChange={() => toggleAlertPref("vibration")} /></Row>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Group notifications</p>
        <Row label="Show Notifications" desc="Get notified for group messages"><Switch checked={alertPrefs.typeAlerts.bookings} onCheckedChange={() => toggleTypeAlert("bookings")} /></Row>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Call notifications</p>
        <Row label="Ring for Calls" desc="Receive call notifications"><Switch checked={alertPrefs.browserNotifications} onCheckedChange={() => toggleAlertPref("browserNotifications")} /></Row>

        <Separator className="my-3" />
        <button onClick={() => {
          const next = setNotifAlertPrefs({
            browserNotifications: true, sound: true, vibration: true,
            typeAlerts: { messages: true, bookings: true, payments: true, documents: true, maintenance: true },
          });
          setAlertPrefsState(next);
          toast.success("Notification settings reset");
        }} className="w-full text-left px-3 py-3 rounded-xl hover:bg-destructive/5 transition-colors">
          <p className="text-sm font-medium text-destructive">Reset Notification Settings</p>
        </button>
      </div>
    </div>
  );
}
