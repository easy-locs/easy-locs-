/**
 * YouPrivacyPage — Orbit privacy settings sub-page.
 */
import { Eye, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { haptic } from "@/lib/haptics";

interface Props { onBack: () => void; }

export default function YouPrivacyPage({ onBack }: Props) {
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

  const displayNameOptions = [
    { value: "real", label: "Real Name", desc: "Show your full profile name" },
    { value: "username", label: "Username", desc: "Show your Orbit username" },
    { value: "custom", label: "Custom Name", desc: "Set a custom display name" },
    { value: "anonymous", label: "Anonymous", desc: 'Show as "Private contact"' },
    { value: "hidden", label: "Hidden", desc: "Only show avatar, no name" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </button>
        <Eye className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Privacy</h2>
      </div>

      <div className="mt-4 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Display Name</p>
        <div className="grid grid-cols-1 gap-1.5">
          {displayNameOptions.map(opt => (
            <button key={opt.value} onClick={() => { updatePrivacy({ displayNameMode: opt.value as any }); haptic("selection"); }}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-left transition-colors"
              style={{
                background: privacy.displayNameMode === opt.value ? "hsl(var(--primary) / 0.08)" : "transparent",
                border: `1px solid ${privacy.displayNameMode === opt.value ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border) / 0.1)"}`,
              }}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${privacy.displayNameMode === opt.value ? "border-primary" : "border-muted-foreground/30"}`}>
                {privacy.displayNameMode === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        {privacy.displayNameMode === "custom" && (
          <div className="mt-2">
            <Input value={privacy.customDisplayName} onChange={e => updatePrivacy({ customDisplayName: e.target.value })} placeholder="Enter custom name..." className="bg-muted/30 text-sm" />
          </div>
        )}
      </div>

      <Separator className="my-3" />
      <div className="space-y-1">
        <Row label="Last Seen" desc="Show when you were last online"><Switch checked={privacy.lastSeen} onCheckedChange={(v) => updatePrivacy({ lastSeen: v })} /></Row>
        <Row label="Online Status" desc="Show when you're currently online"><Switch checked={privacy.onlineStatus} onCheckedChange={(v) => updatePrivacy({ onlineStatus: v })} /></Row>
        <Row label="Profile Photo" desc="Who can see your profile photo"><Switch checked={privacy.profilePhoto} onCheckedChange={(v) => updatePrivacy({ profilePhoto: v })} /></Row>
        <Row label="Read Receipts" desc="Others see when you've read their messages"><Switch checked={privacy.readReceipts} onCheckedChange={(v) => updatePrivacy({ readReceipts: v })} /></Row>
        <Row label="Typing Indicators" desc="Show when you're typing"><Switch checked={privacy.typingIndicators} onCheckedChange={(v) => updatePrivacy({ typingIndicators: v })} /></Row>
        <Row label="Link Previews" desc="Generate previews for sent links"><Switch checked={privacy.linkPreviews} onCheckedChange={(v) => updatePrivacy({ linkPreviews: v })} /></Row>
      </div>
      <Separator className="my-4" />
      <p className="text-[10px] text-muted-foreground/50 text-center">Changes apply to all conversations</p>
    </div>
  );
}
