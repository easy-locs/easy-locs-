/**
 * MapTabPage — Map tab entry point with minimal geo status bar.
 */
import ExplorerMap from "@/components/map/ExplorerMap";
import { useLocationStore } from "@/stores/locationStore";

function GeoStatusBar() {
  const perm = useLocationStore((s) => s.permissionState);
  const loc = useLocationStore((s) => s.currentLocation);
  const err = useLocationStore((s) => s.error);
  const fallback = useLocationStore((s) => s.isFallback);

  return (
    <div className="absolute bottom-2 left-2 z-[500] rounded-lg bg-background/80 backdrop-blur-sm px-2 py-1 text-[10px] text-muted-foreground leading-tight space-y-0.5 pointer-events-none">
      <div>📍 {perm ?? "unknown"}{fallback ? " (fallback)" : ""}</div>
      {loc && <div>{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</div>}
      {err && <div className="text-destructive">⚠ {err}</div>}
    </div>
  );
}

export default function MapTabPage() {
  return (
    <div className="relative w-full h-full">
      <ExplorerMap />
      <GeoStatusBar />
    </div>
  );
}
