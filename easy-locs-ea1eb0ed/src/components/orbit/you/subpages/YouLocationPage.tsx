import { useCallback } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouLocationPage({ onBack }: Props) {
  const { t } = useI18n();
  const defaultLiveLocationDuration = useOrbitSettingsStore(s => s.defaultLiveLocationDuration);
  const setDuration = useCallback((mins: number) => useOrbitSettingsStore.getState().setDefaultLiveLocationDuration(mins), []);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold break-words" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.location_title")}</h2>
      </div>
      <div className="space-y-1 mt-4">
        <p className="text-[0.625rem] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.default_duration")}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 responsive-grid-4-to-3">
          {[15, 30, 60, 120].map(mins => (
            <button key={mins} onClick={() => setDuration(mins)}
              className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${defaultLiveLocationDuration === mins ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
            </button>
          ))}
        </div>
        <p className="text-[0.625rem] mt-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.location_hint")}</p>
      </div>
    </div>
  );
}
