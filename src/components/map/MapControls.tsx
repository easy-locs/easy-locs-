import { CloudRain, LocateFixed, Radio, CarFront, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function Chip({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[10px] font-semibold shadow-sm backdrop-blur-md transition-all active:scale-95",
        active ? "border-primary/20 bg-primary text-primary-foreground" : "border-border/25 bg-card/85 text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

export default function MapControls({
  showWeather,
  showStations,
  showMobility,
  showHeatmap,
  onToggleWeather,
  onToggleStations,
  onToggleMobility,
  onToggleHeatmap,
  onRecenter,
  className,
}: {
  showWeather: boolean;
  showStations: boolean;
  showMobility: boolean;
  showHeatmap: boolean;
  onToggleWeather: () => void;
  onToggleStations: () => void;
  onToggleMobility: () => void;
  onToggleHeatmap: () => void;
  onRecenter?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-auto flex flex-wrap items-center gap-2", className)}>
      <Chip active={showWeather} label="Radar" icon={CloudRain} onClick={onToggleWeather} />
      <Chip active={showStations} label="Stations" icon={Radio} onClick={onToggleStations} />
      <Chip active={showMobility} label="Live" icon={CarFront} onClick={onToggleMobility} />
      <Chip active={showHeatmap} label="Zones" icon={Sparkles} onClick={onToggleHeatmap} />
      {onRecenter ? (
        <button
          type="button"
          onClick={onRecenter}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/25 bg-card/85 text-foreground shadow-sm backdrop-blur-md transition-all active:scale-95"
          aria-label="Recenter"
        >
          <LocateFixed className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}