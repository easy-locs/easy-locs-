import { Eye, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouPrivacyPage({ onBack }: Props) {
  const { t } = useI18n();
  const { settings: privacy, update: updatePrivacy } = usePrivacySettings();

  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 min-h-[44px]">
      <div className="min-w-0 flex-1">
        <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        {desc && <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const displayNameOptions = [
    { value: "real", labelKey: "orbit.you.dn_real", descKey: "orbit.you.dn_real_desc" },
    { value: "username", labelKey: "orbit.you.dn_username", descKey: "orbit.you.dn_username_desc" },
    { value: "custom", labelKey: "orbit.you.dn_custom", descKey: "orbit.you.dn_custom_desc" },
    { value: "anonymous", labelKey: "orbit.you.dn_anonymous", descKey: "orbit.you.dn_anonymous_desc" },
    { value: "hidden", labelKey: "orbit.you.dn_hidden", descKey: "orbit.you.dn_hidden_desc" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <Eye className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold break-words" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.privacy_title")}</h2>
      </div>

      <div className="mt-4 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.display_name_mode")}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {displayNameOptions.map(opt => (
            <button key={opt.value} onClick={() => { updatePrivacy({ displayNameMode: opt.value as any }); haptic("selection"); }}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-left transition-colors min-h-[44px]"
              style={{
                background: privacy.displayNameMode === opt.value ? "hsl(var(--primary) / 0.08)" : "transparent",
                border: `1px solid ${privacy.displayNameMode === opt.value ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border) / 0.1)"}`,
              }}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${privacy.displayNameMode === opt.value ? "border-primary" : "border-muted-foreground/30"}`}>
                {privacy.displayNameMode === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>{t(opt.labelKey)}</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t(opt.descKey)}</p>
              </div>
            </button>
          ))}
        </div>
        {privacy.displayNameMode === "custom" && (
          <div className="mt-2">
            <Input value={privacy.customDisplayName} onChange={e => updatePrivacy({ customDisplayName: e.target.value })} placeholder={t("orbit.you.custom_name_placeholder")} className="bg-muted/30 text-sm" />
          </div>
        )}
      </div>

      <Separator className="my-3" />
      <div className="space-y-1">
        <Row label={t("orbit.you.last_seen")} desc={t("orbit.you.last_seen_desc")}><Switch checked={privacy.lastSeen} onCheckedChange={(v) => updatePrivacy({ lastSeen: v })} /></Row>
        <Row label={t("orbit.you.online_status")} desc={t("orbit.you.online_status_desc")}><Switch checked={privacy.onlineStatus} onCheckedChange={(v) => updatePrivacy({ onlineStatus: v })} /></Row>
        <Row label={t("orbit.you.profile_photo")} desc={t("orbit.you.profile_photo_desc")}><Switch checked={privacy.profilePhoto} onCheckedChange={(v) => updatePrivacy({ profilePhoto: v })} /></Row>
        <Row label={t("orbit.you.read_receipts")} desc={t("orbit.you.read_receipts_desc")}><Switch checked={privacy.readReceipts} onCheckedChange={(v) => updatePrivacy({ readReceipts: v })} /></Row>
        <Row label={t("orbit.you.typing_indicators")} desc={t("orbit.you.typing_indicators_desc")}><Switch checked={privacy.typingIndicators} onCheckedChange={(v) => updatePrivacy({ typingIndicators: v })} /></Row>
        <Row label={t("orbit.you.link_previews")} desc={t("orbit.you.link_previews_desc")}><Switch checked={privacy.linkPreviews} onCheckedChange={(v) => updatePrivacy({ linkPreviews: v })} /></Row>
      </div>
      <Separator className="my-4" />
      <p className="text-[10px] text-center" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>{t("orbit.you.changes_apply")}</p>
    </div>
  );
}
