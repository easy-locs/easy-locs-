import { AppPageShell } from "@/components/layout/AppPageShell";
import { MapDashboard } from "@/components/map/MapDashboard";
import { MapMarkerList } from "@/components/map/MapMarkerList";

export default function MapPage() {
  return (
    <AppPageShell title="Map">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MapDashboard />
        <MapMarkerList />
      </div>
    </AppPageShell>
  );
}
