import { useState } from "react";
import { forwardGeocode } from "@/lib/mapbox/geocoding";
import { useMapStore } from "@/stores/mapStore";

export function MapSearchPanel() {
  const [query, setQuery] = useState("");
  const setViewport = useMapStore((s) => s.setViewport);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Map Search</h3>
      <input
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        placeholder="Search address..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        onClick={async () => {
          const data = await forwardGeocode(query);
          const first = data?.features?.[0];
          if (!first?.center) return;
          setViewport({
            centerLng: first.center[0],
            centerLat: first.center[1],
            zoom: 13,
          });
        }}
      >
        Search
      </button>
    </div>
  );
}
