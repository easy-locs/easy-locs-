/**
 * YouChatDefaultsPage — Orbit chat defaults sub-page.
 */
import { MessageSquare, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";

interface Props { onBack: () => void; }

export default function YouChatDefaultsPage({ onBack }: Props) {
  const orbitSettings = useOrbitSettingsStore();
  const { settings: privacy, update: updatePrivacy } = usePrivacySettings();

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
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Chat Defaults</h2>
      </div>

      <div className="space-y-1 mt-4">
        <Row label="Enter to Send" desc="Press Enter to send messages">
          <Switch checked={orbitSettings.enterToSend} onCheckedChange={orbitSettings.setEnterToSend} />
        </Row>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Disappearing Messages</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Off", val: null },
            { label: "24h", val: 86400 },
            { label: "7d", val: 604800 },
            { label: "30d", val: 2592000 },
          ].map(opt => (
            <button key={opt.label} onClick={() => orbitSettings.setDefaultDisappearingTimer(opt.val)}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${orbitSettings.defaultDisappearingTimer === opt.val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">New messages will auto-delete after the selected period</p>
      </div>
    </div>
  );
}
