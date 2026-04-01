/**
 * MapControls — Premium vertical control stack (Uber/Apple style).
 * Compact 44x44 buttons with glass effect.
 */
import { LocateFixed, Plus, Minus, Layers, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import { useUnifiedMapStore } from "@/stores/mapStore";

function ControlButton({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-[14px] border shadow-lg backdrop-blur-xl transition-all active:scale-[0.93]",
        active
          ? "border-primary/25 bg-primary/15 text-primary"
          : "border-white/[0.06] bg-[rgba(12,18,32,0.82)] text-white/60 hover:text-white/80"
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

export default function MapControls({
  onRecenter,
  onZoomIn,
  onZoomOut,
  className,
}: {
  onRecenter?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  className?: string;
}) {
  const radarOverlay = useWeatherDisplayStore(s => s.radarOverlay);
  const setRadarOverlay = useWeatherDisplayStore(s => s.setRadarOverlay);
  const showHeatmap = useUnifiedMapStore(s => s.showHeatmap);
  const toggleHeatmap = useUnifiedMapStore(s => s.toggleHeatmap);

  const toggleRadar = () => {
    const next = radarOverlay === "off" ? "full" : "off";
    setRadarOverlay(next);
  };

  return (
    <div className={cn("pointer-events-auto flex flex-col gap-2.5", className)}>
      {onRecenter && (
        <ControlButton icon={LocateFixed} onClick={onRecenter} label="Recenter" />
      )}
      {onZoomIn && (
        <ControlButton icon={Plus} onClick={onZoomIn} label="Zoom in" />
      )}
      {onZoomOut && (
        <ControlButton icon={Minus} onClick={onZoomOut} label="Zoom out" />
      )}
      <ControlButton
        icon={CloudRain}
        active={radarOverlay !== "off"}
        onClick={toggleRadar}
        label="Toggle radar"
      />
      <ControlButton
        icon={Layers}
        active={showHeatmap}
        onClick={toggleHeatmap}
        label="Toggle layers"
      />
    </div>
  );
}
