/**
 * YouCallsPage — Orbit call settings sub-page (wired to canonical families).
 */
import { Phone, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useCallSettingsStore } from "@/families/calls/call-settings";
import { useCallPrivacyStore } from "@/families/calls/call-privacy";

interface Props { onBack: () => void; }

export default function YouCallsPage({ onBack }: Props) {
  const callSettings = useCallSettingsStore();
  const callPrivacy = useCallPrivacyStore();

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
        <Phone className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Calls</h2>
      </div>

      <div className="space-y-1 mt-4">
        <Row label="Ringtone" desc="Play ringtone for incoming calls"><Switch checked={callSettings.ringtoneEnabled} onCheckedChange={callSettings.setRingtoneEnabled} /></Row>
        <Row label="Vibration" desc="Vibrate on incoming calls"><Switch checked={callSettings.vibrationOnRing} onCheckedChange={callSettings.setVibrationOnRing} /></Row>
        <Row label="Show Call Duration" desc="Display timer during active calls"><Switch checked={callSettings.showCallDuration} onCheckedChange={callSettings.setShowCallDuration} /></Row>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Default Audio Route</p>
        <div className="grid grid-cols-2 gap-2">
          {(["earpiece", "speaker"] as const).map(v => (
            <button key={v} onClick={() => callSettings.setDefaultAudioOutput(v)}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors capitalize ${callSettings.defaultAudioOutput === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {v}
            </button>
          ))}
        </div>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Incoming Call Privacy</p>
        <Row label="Hidden Incoming Calls" desc="Mask caller identity on incoming calls"><Switch checked={callPrivacy.incomingVisibility === "hidden"} onCheckedChange={(v) => callPrivacy.setIncomingVisibility(v ? "hidden" : "full")} /></Row>
        <Row label="Hide Caller Photo" desc="Don't show caller avatar"><Switch checked={callPrivacy.hideCallerPhoto} onCheckedChange={callPrivacy.setHideCallerPhoto} /></Row>

        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-3 mb-2">Lock Screen</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: "show_full" as const, label: "Full" },
            { v: "show_notification_only" as const, label: "Notif Only" },
            { v: "hide" as const, label: "Hide" },
          ]).map(opt => (
            <button key={opt.v} onClick={() => callPrivacy.setLockScreenPolicy(opt.v)}
              className={`py-2 px-2 rounded-lg text-[11px] font-medium transition-colors ${callPrivacy.lockScreenPolicy === opt.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
