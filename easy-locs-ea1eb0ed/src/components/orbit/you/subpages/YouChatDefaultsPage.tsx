import { useCallback } from "react";
import { MessageSquare, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouChatDefaultsPage({ onBack }: Props) {
  const { t } = useI18n();
  const enterToSend = useOrbitSettingsStore(s => s.enterToSend);
  const defaultDisappearingTimer = useOrbitSettingsStore(s => s.defaultDisappearingTimer);
  const setEnterToSend = useCallback((v: boolean) => useOrbitSettingsStore.getState().setEnterToSend(v), []);
  const setDefaultDisappearingTimer = useCallback((v: number | null) => useOrbitSettingsStore.getState().setDefaultDisappearingTimer(v), []);
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

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.chat_title")}</h2>
      </div>

      <div className="space-y-1 mt-4">
        <Row label={t("orbit.you.enter_to_send")} desc={t("orbit.you.enter_to_send_desc")}>
          <Switch checked={enterToSend} onCheckedChange={setEnterToSend} />
        </Row>

        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.disappearing_title")}</p>
        <div className="grid grid-cols-4 gap-2 responsive-grid-4-to-3">
          {[
            { label: t("orbit.you.disappearing_off"), val: null },
            { label: "24h", val: 86400 },
            { label: "7d", val: 604800 },
            { label: "30d", val: 2592000 },
          ].map(opt => (
            <button key={opt.label} onClick={() => setDefaultDisappearingTimer(opt.val)}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${defaultDisappearingTimer === opt.val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.disappearing_hint")}</p>
      </div>
    </div>
  );
}
