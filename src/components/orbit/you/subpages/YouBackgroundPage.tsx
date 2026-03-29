/**
 * YouBackgroundPage — Orbit chat background sub-page.
 */
import { Wallpaper, ChevronRight } from "lucide-react";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";

interface Props { onBack: () => void; }

export default function YouBackgroundPage({ onBack }: Props) {
  const orbitSettings = useOrbitSettingsStore();
  const presets = ["default", "dark-glass", "midnight", "ocean", "forest", "sunset"];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </button>
        <Wallpaper className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Chat Background</h2>
      </div>
      <div className="mt-4">
        <div className="grid grid-cols-3 gap-2">
          {presets.map(preset => (
            <button key={preset} onClick={() => orbitSettings.setChatBackground(preset)}
              className={`py-3 px-2 rounded-xl text-xs font-medium transition-colors capitalize ${orbitSettings.chatBackground === preset ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {preset.replace("-", " ")}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">Applies to all conversation threads</p>
      </div>
    </div>
  );
}
