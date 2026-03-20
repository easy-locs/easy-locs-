import { useMapStore } from "@/stores/mapStore";

export function MapDashboard() {
  const markers = useMapStore((s) => s.markers);
  const selected = useMapStore((s) => s.getSelectedMarker());
  const viewport = useMapStore((s) => s.viewport);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold text-foreground">Map Viewport</h3>
        <p className="text-sm text-muted-foreground">Center: {viewport.centerLat}, {viewport.centerLng}</p>
        <p className="text-sm text-muted-foreground">Zoom: {viewport.zoom}</p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold text-foreground">Selected Marker</h3>
        {selected ? (
          <>
            <p className="text-sm text-foreground">{selected.title}</p>
            <p className="text-xs text-muted-foreground">{selected.subtitle}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No marker selected</p>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold text-foreground">All Markers ({markers.length})</h3>
        <div className="flex flex-col gap-1 mt-2">
          {markers.map((marker) => (
            <div key={marker.id} className="text-sm">
              <p className="text-foreground">{marker.title ?? marker.id}</p>
              <p className="text-xs text-muted-foreground">
                {marker.lat}, {marker.lng}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
