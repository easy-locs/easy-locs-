import { ImageIcon, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouMediaPage({ onBack }: Props) {
  const { t } = useI18n();
  const autoDownloadMedia = useOrbitSettingsStore(s => s.autoDownloadMedia);
  const setAutoDownloadMedia = useOrbitSettingsStore(s => s.setAutoDownloadMedia);
  const mediaQuality = useOrbitSettingsStore(s => s.mediaQuality);
  const setMediaQuality = useOrbitSettingsStore(s => s.setMediaQuality);

  const qualities: { v: "auto" | "low" | "high"; key: string }[] = [
    { v: "auto", key: "orbit.you.quality_auto" },
    { v: "low", key: "orbit.you.quality_low" },
    { v: "high", key: "orbit.you.quality_high" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <ImageIcon className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold break-words" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.media_title")}</h2>
      </div>
      <div className="space-y-1 mt-4">
        <div className="flex items-center justify-between gap-3 py-2.5 min-h-[44px]">
          <div className="min-w-0 flex-1">
            <p className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.auto_download")}</p>
            <p className="text-[0.6875rem] mt-0.5" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{t("orbit.you.auto_download_desc")}</p>
          </div>
          <Switch checked={autoDownloadMedia} onCheckedChange={setAutoDownloadMedia} />
        </div>
        <Separator className="my-3" />
        <p className="text-[0.625rem] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.quality")}</p>
        <div className="grid grid-cols-3 gap-2">
          {qualities.map(({ v, key }) => (
            <button key={v} onClick={() => setMediaQuality(v)}
              className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${mediaQuality === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {t(key)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
