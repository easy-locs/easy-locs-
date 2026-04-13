import { Phone, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useCallSettingsStore } from "@/families/calls/call-settings";
import { useCallPrivacyStore } from "@/families/calls/call-privacy";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouCallsPage({ onBack }: Props) {
  const { t } = useI18n();
  const ringtoneEnabled = useCallSettingsStore(s => s.ringtoneEnabled);
  const setRingtoneEnabled = useCallSettingsStore(s => s.setRingtoneEnabled);
  const vibrationOnRing = useCallSettingsStore(s => s.vibrationOnRing);
  const setVibrationOnRing = useCallSettingsStore(s => s.setVibrationOnRing);
  const showCallDuration = useCallSettingsStore(s => s.showCallDuration);
  const setShowCallDuration = useCallSettingsStore(s => s.setShowCallDuration);
  const defaultAudioOutput = useCallSettingsStore(s => s.defaultAudioOutput);
  const setDefaultAudioOutput = useCallSettingsStore(s => s.setDefaultAudioOutput);
  const incomingVisibility = useCallPrivacyStore(s => s.incomingVisibility);
  const setIncomingVisibility = useCallPrivacyStore(s => s.setIncomingVisibility);
  const hideCallerPhoto = useCallPrivacyStore(s => s.hideCallerPhoto);
  const setHideCallerPhoto = useCallPrivacyStore(s => s.setHideCallerPhoto);
  const lockScreenPolicy = useCallPrivacyStore(s => s.lockScreenPolicy);
  const setLockScreenPolicy = useCallPrivacyStore(s => s.setLockScreenPolicy);

  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 min-h-[44px]">
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        {desc && <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const audioRoutes: { v: "earpiece" | "speaker"; key: string }[] = [
    { v: "earpiece", key: "orbit.you.earpiece" },
    { v: "speaker", key: "orbit.you.speaker" },
  ];

  const lockOptions: { v: "show_full" | "show_notification_only" | "hide"; key: string }[] = [
    { v: "show_full", key: "orbit.you.lock_full" },
    { v: "show_notification_only", key: "orbit.you.lock_notif" },
    { v: "hide", key: "orbit.you.lock_hide" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <Phone className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold break-words" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.calls_title")}</h2>
      </div>

      <div className="space-y-1 mt-4">
        <Row label={t("orbit.you.ringtone")} desc={t("orbit.you.ringtone_desc")}><Switch checked={ringtoneEnabled} onCheckedChange={setRingtoneEnabled} /></Row>
        <Row label={t("orbit.you.vibration")} desc={t("orbit.you.vibration_desc")}><Switch checked={vibrationOnRing} onCheckedChange={setVibrationOnRing} /></Row>
        <Row label={t("orbit.you.show_call_duration")} desc={t("orbit.you.show_call_duration_desc")}><Switch checked={showCallDuration} onCheckedChange={setShowCallDuration} /></Row>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.default_audio_route")}</p>
        <div className="grid grid-cols-2 gap-2">
          {audioRoutes.map(({ v, key }) => (
            <button key={v} onClick={() => setDefaultAudioOutput(v)}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${defaultAudioOutput === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {t(key)}
            </button>
          ))}
        </div>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.incoming_call_privacy")}</p>
        <Row label={t("orbit.you.hidden_incoming")} desc={t("orbit.you.hidden_incoming_desc")}><Switch checked={incomingVisibility === "hidden"} onCheckedChange={(v) => setIncomingVisibility(v ? "hidden" : "full")} /></Row>
        <Row label={t("orbit.you.hide_caller_photo")} desc={t("orbit.you.hide_caller_photo_desc")}><Switch checked={hideCallerPhoto} onCheckedChange={setHideCallerPhoto} /></Row>

        <p className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.lock_screen")}</p>
        <div className="grid grid-cols-3 gap-2">
          {lockOptions.map(({ v, key }) => (
            <button key={v} onClick={() => setLockScreenPolicy(v)}
              className={`py-2 px-2 rounded-lg text-[11px] font-medium transition-colors min-h-[44px] ${lockScreenPolicy === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {t(key)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
