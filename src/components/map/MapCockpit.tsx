/**
 * MapCockpit — Mini observability panel for map engine.
 * Shows active layers, animations, density, visible entities, realtime rate.
 */
import { memo, useState } from "react";
import { Layers, Activity, Eye, Gauge, ChevronDown, ChevronUp } from "lucide-react";
import type { MapAdaptiveState } from "@/hooks/map/useMapAdaptive";

interface Props {
  adaptive: MapAdaptiveState;
  presetLabel: string;
}

export default memo(function MapCockpit({ adaptive, presetLabel }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-border/30 bg-card/80 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-card/95"
        title="Map cockpit"
      >
        <Gauge className="h-3 w-3" />
        <span>{adaptive.visibleCount}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="w-52 rounded-xl border border-border/30 bg-card/90 p-3 shadow-lg backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground">Map Engine</span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1.5 text-[10px] text-muted-foreground">
        <Row icon={<Eye className="h-3 w-3" />} label="Preset" value={presetLabel} />
        <Row icon={<Layers className="h-3 w-3" />} label="Visible" value={String(adaptive.visibleCount)} />
        <Row icon={<Activity className="h-3 w-3" />} label="Density" value={adaptive.density} />
        <Row icon={<Gauge className="h-3 w-3" />} label="Zoom" value={adaptive.zoom.toFixed(1)} />
        <Row
          icon={<Activity className="h-3 w-3" />}
          label="RT rate"
          value={`${adaptive.realtimeRate}/s`}
        />
        <Row
          icon={<Activity className="h-3 w-3" />}
          label="Anims"
          value={adaptive.animationsActive.length > 0 ? adaptive.animationsActive.join(", ") : "none"}
        />
        {adaptive.animationsPaused.length > 0 && (
          <Row
            icon={<Activity className="h-3 w-3 text-yellow-500" />}
            label="Paused"
            value={adaptive.animationsPaused.join(", ")}
          />
        )}
        {adaptive.isMobile && (
          <div className="mt-1 rounded bg-primary/10 px-1.5 py-0.5 text-center text-[9px] font-medium text-primary">
            Mobile mode
          </div>
        )}
      </div>
    </div>
  );
});

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
