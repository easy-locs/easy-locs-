/**
 * YouLocationPage — Orbit live location defaults sub-page.
 */
import { MapPin, ChevronRight } from "lucide-react";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";

interface Props { onBack: () => void; }

export default function YouLocationPage({ onBack }: Props) {
  const orbitSettings = useOrbitSettingsStore();

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </button>
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Live Location</h2>
      </div>
      <div className="space-y-1 mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Default Duration</p>
        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 60, 120].map(mins => (
            <button key={mins} onClick={() => orbitSettings.setDefaultLiveLocationDuration(mins)}
              className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${orbitSettings.defaultLiveLocationDuration === mins ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Duration used when starting live location sharing</p>
      </div>
    </div>
  );
}
