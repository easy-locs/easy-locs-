/**
 * CanonicalMapTestPage — Test page for the new canonical map system.
 * Mounted on /map-lab route. Does NOT replace existing maps.
 */
import { useState, useMemo } from "react";
import CanonicalMap from "@/components/map/CanonicalMap";
import { MapLayerPanel } from "@/components/map/MapLayerPanel";
import { MapLegend } from "@/components/map/MapLegend";
import { MapEntityBottomSheet } from "@/components/map/MapEntityBottomSheet";
import type { MapEntity } from "@/types/map";
import { useQuery } from "@tanstack/react-query";
import { getMapMerchantPins } from "@/lib/map/mapEngine";
import { useLocationStore } from "@/stores/locationStore";
import { Layers, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function CanonicalMapTestPage() {
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const currentLocation = useLocationStore((s) => s.currentLocation);

  const { data: pins } = useQuery({
    queryKey: ["canonical-map-pins"],
    queryFn: () => getMapMerchantPins({ limit: 500 }),
    staleTime: 60_000,
  });

  const entities: MapEntity[] = useMemo(() => {
    if (!pins) return [];
    return pins
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        id: p.id,
        kind: (
          p.category === "food" || p.category === "restaurant" ? "restaurant" :
          p.category === "grocery" ? "grocery" :
          p.category === "hotel" || p.category === "stay" ? "hotel" :
          p.category === "property" ? "property" :
          p.category === "services" || p.category === "service" ? "service" :
          "restaurant"
        ) as MapEntity["kind"],
        title: p.name,
        subtitle: p.subcategory ?? p.area ?? null,
        lat: p.lat!,
        lng: p.lng!,
        rating: p.rating ?? undefined,
        image: p.coverImage ?? undefined,
        slug: p.slug ?? undefined,
        isOpen: p.isOpen ?? true,
      }));
  }, [pins]);

  const userLocation = useMemo(() => {
    if (currentLocation?.lat && currentLocation?.lng) {
      return { lat: currentLocation.lat, lng: currentLocation.lng };
    }
    return null;
  }, [currentLocation]);

  return (
    <div className="fixed inset-0 z-0 bg-background">
      <CanonicalMap
        entities={entities}
        userLocation={userLocation}
        selectedEntityId={selectedEntity?.id ?? null}
        className="w-full h-full"
        onSelectEntity={(e) => setSelectedEntity(e)}
        onZoneClick={() => setSelectedEntity(null)}
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2">
        <Link
          to="/"
          className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/20 bg-card/90 backdrop-blur-md shadow-sm"
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </Link>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/20 bg-card/90 backdrop-blur-md px-3 text-[10px] font-semibold text-foreground shadow-sm"
          >
            <Layers className="h-3.5 w-3.5" />
            Layers
          </button>
        </div>
      </div>

      {/* Layer panel */}
      {showPanel && (
        <div className="absolute top-14 right-3 z-20 w-64 pointer-events-auto">
          <MapLayerPanel />
        </div>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-20 left-3 z-10">
        <MapLegend className="pointer-events-auto" />
      </div>

      {/* Entity bottom sheet */}
      <MapEntityBottomSheet
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
      />
    </div>
  );
}
