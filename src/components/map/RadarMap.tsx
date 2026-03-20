import { useMemo } from "react";
import { useGeoStore } from "@/stores/geoStore";
import { useListingStore } from "@/stores/listingStore";
import { haversine, formatDistance } from "@/lib/radar/radar-engine";
import { MapPin } from "lucide-react";

export function RadarMap() {
  const currentPosition = useGeoStore((s) => s.currentPosition);
  const permission = useGeoStore((s) => s.permission);
  const listings = useListingStore((s) => s.getPublishedListings());

  const hasGeo = currentPosition.lat !== 0 || currentPosition.lng !== 0;

  const nearby = useMemo(() => {
    if (!hasGeo) return [];
    return listings
      .map((listing) => {
        const lat = listing.location?.lat;
        const lng = listing.location?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") return null;

        return {
          id: listing.id,
          title: listing.title,
          distanceKm: haversine(currentPosition.lat, currentPosition.lng, lat, lng),
        };
      })
      .filter(Boolean)
      .filter((x) => x!.distanceKm <= 10)
      .sort((a, b) => a!.distanceKm - b!.distanceKm)
      .slice(0, 20) as { id: string; title: string; distanceKm: number }[];
  }, [hasGeo, currentPosition.lat, currentPosition.lng, listings]);

  if (!hasGeo) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center rounded-lg bg-muted/30 min-h-[120px]">
        <MapPin className="w-6 h-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {permission === "denied"
            ? "Location access denied. Enable in browser settings."
            : "Waiting for location…"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Radar — Nearby</h3>
      {nearby.length === 0 ? (
        <p className="text-xs text-muted-foreground">No listings within 10 km</p>
      ) : (
        <ul className="space-y-1.5">
          {nearby.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
              <span className="text-sm text-foreground truncate">{item.title}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                {formatDistance(item.distanceKm)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
