import { useMapStore } from "@/stores/mapStore";
import { usePropertyDetailStore } from "@/stores/propertyDetailStore";

export function MapMarkerList() {
  const markers = useMapStore((s) => s.markers);
  const selectMarker = useMapStore((s) => s.selectMarker);
  const openListing = usePropertyDetailStore((s) => s.openListing);

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">Map Markers</h3>
      {markers.map((marker) => (
        <div
          key={marker.id}
          className={`rounded-lg border p-3 cursor-pointer transition-colors ${
            marker.selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
          }`}
          onClick={() => {
            selectMarker(marker.id);
            if (marker.listingId) openListing(marker.listingId);
          }}
        >
          <p className="text-sm font-medium text-foreground">{marker.title ?? marker.id}</p>
          <p className="text-xs text-muted-foreground">{marker.subtitle}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {marker.lat}, {marker.lng}
          </p>
        </div>
      ))}
    </div>
  );
}
