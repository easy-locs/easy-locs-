/**
 * MapPage — Full Mapbox-based map page using ExplorerMap as single source of truth.
 */
import { AppPageShell } from "@/components/layout/AppPageShell";
import { GeoBootstrap } from "@/components/map/GeoBootstrap";
import ExplorerMap from "@/components/map/ExplorerMap";

export default function MapPage() {
  return (
    <AppPageShell title="Map">
      <GeoBootstrap />
      <div className="h-[calc(100dvh-120px)]">
        <ExplorerMap />
      </div>
    </AppPageShell>
  );
}
