import { useCallback } from "react";
import { Wallpaper, ChevronRight } from "lucide-react";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouBackgroundPage({ onBack }: Props) {
  const { t } = useI18n();
  const chatBackground = useOrbitSettingsStore(s => s.chatBackground);
  const setChatBackground = useCallback((v: string) => useOrbitSettingsStore.getState().setChatBackground(v), []);
  const presets: { value: string; labelKey: string }[] = [
    { value: "default", labelKey: "orbit.you.bg_default" },
    { value: "dark-glass", labelKey: "orbit.you.bg_dark_glass" },
    { value: "midnight", labelKey: "orbit.you.bg_midnight" },
    { value: "ocean", labelKey: "orbit.you.bg_ocean" },
    { value: "forest", labelKey: "orbit.you.bg_forest" },
    { value: "sunset", labelKey: "orbit.you.bg_sunset" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <Wallpaper className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold break-words" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.bg_title")}</h2>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-3 gap-2">
          {presets.map(preset => (
            <button key={preset.value} onClick={() => setChatBackground(preset.value)}
              className={`py-3 px-2 rounded-xl text-xs font-medium transition-colors min-h-[48px] ${chatBackground === preset.value ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {t(preset.labelKey)}
            </button>
          ))}
        </div>
        <p className="text-[0.625rem] mt-3" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.bg_hint")}</p>
      </div>
    </div>
  );
}
