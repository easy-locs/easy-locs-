import { AppPageShell } from "@/components/layout/AppPageShell";
import { GeoBootstrap } from "@/components/map/GeoBootstrap";
import { MapDashboard } from "@/components/map/MapDashboard";
import { MapMarkerList } from "@/components/map/MapMarkerList";
import { MapboxCanvas } from "@/components/map/MapboxCanvas";
import { MapSearchPanel } from "@/components/map/MapSearchPanel";
import { RadarMap } from "@/components/map/RadarMap";
import { useLocationStore } from "@/stores/locationStore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { RefreshCw } from "lucide-react";

export default function MapPage() {
  const permissionState = useLocationStore((s) => s.permissionState);
  const { requestLocation } = useGeolocation();

  return (
    <AppPageShell title="Map">
      <GeoBootstrap />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <MapboxCanvas />
          {permissionState === "denied" && (
            <p className="text-xs text-destructive text-center px-2">
              Location denied — enable location in Safari / browser settings
            </p>
          )}
          <button
            onClick={() => requestLocation()}
            className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-[0.95]"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh location
          </button>
        </div>
        <div className="space-y-4">
          <MapSearchPanel />
          <RadarMap />
          <MapDashboard />
          <MapMarkerList />
        </div>
      </div>
    </AppPageShell>
  );
}
