import { CloudRain, LocateFixed, Radio, CarFront, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import { useSuperMapStore } from "@/stores/superMapStore";

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
  onRecenter,
  className,
}: {
  onRecenter?: () => void;
  className?: string;
}) {
  // Weather display controls (overlay, not data)
  const radarOverlay = useWeatherDisplayStore(s => s.radarOverlay);
  const setRadarOverlay = useWeatherDisplayStore(s => s.setRadarOverlay);
  const showStations = useWeatherDisplayStore(s => s.showStations);
  const toggleStations = useWeatherDisplayStore(s => s.toggleStations);
  const autoMode = useWeatherDisplayStore(s => s.autoMode);
  const toggleAutoMode = useWeatherDisplayStore(s => s.toggleAutoMode);

  // Map store controls
  const showMobility = useSuperMapStore(s => s.showMobility);
  const toggleMobility = useSuperMapStore(s => s.toggleMobility);
  const showHeatmap = useSuperMapStore(s => s.showHeatmap);
  const toggleHeatmap = useSuperMapStore(s => s.toggleHeatmap);

  const toggleRadar = () => {
    // Cycle: off → minimal → full → off
    const next = radarOverlay === "off" ? "full" : radarOverlay === "full" ? "minimal" : "off";
    setRadarOverlay(next);
  };

  return (
    <div className={cn("pointer-events-auto flex flex-wrap items-center gap-2", className)}>
      <Chip
        active={radarOverlay !== "off"}
        label={radarOverlay === "minimal" ? "Radar ·" : "Radar"}
        icon={CloudRain}
        onClick={toggleRadar}
      />
      <Chip active={showStations} label="Stations" icon={Radio} onClick={toggleStations} />
      <Chip active={showMobility} label="Live" icon={CarFront} onClick={toggleMobility} />
      <Chip active={showHeatmap} label="Zones" icon={Sparkles} onClick={toggleHeatmap} />
      <Chip active={autoMode} label="Auto" icon={Zap} onClick={toggleAutoMode} />
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
