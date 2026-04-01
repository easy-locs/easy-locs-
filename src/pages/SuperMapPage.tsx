/**
 * SuperMapPage — Full-screen premium intelligent map experience.
 * Glass search bar, weather HUD, smart bottom sheet, brand markers.
 * Uses unified mapStore as single source of truth.
 */
import { useEffect } from "react";
import SuperMap from "@/components/map/SuperMap";
import SmartSearchBar from "@/components/map/SmartSearchBar";
import SmartBottomSheet from "@/components/map/SmartBottomSheet";
import WeatherHUD from "@/components/map/WeatherHUD";
import MapControls from "@/components/map/MapControls";
import { useUnifiedMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";
import { useQuery } from "@tanstack/react-query";
import { getMapMerchantPins } from "@/lib/map/mapEngine";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

export default function SuperMapPage() {
  const setEntities = useUnifiedMapStore((s) => s.setEntities);
  const setMobilityPoints = useUnifiedMapStore((s) => s.setMobilityPoints);
  const setCenter = useUnifiedMapStore((s) => s.setCenter);
  const setZoom = useUnifiedMapStore((s) => s.setZoom);
  const setViewport = useUnifiedMapStore((s) => s.setViewport);
  const searchResults = useUnifiedMapStore((s) => s.search.results);
  const selectedEntityId = useUnifiedMapStore((s) => s.selectedEntityId);
  const selectEntity = useUnifiedMapStore((s) => s.selectEntity);

  const currentLocation = useLocationStore((s) => s.currentLocation);

  // Weather — read GPS from locationStore (no duplication)
  const lat = currentLocation?.lat ?? 25.2048;
  const lng = currentLocation?.lng ?? 55.2708;
  const weather = useLiveWeatherStation({ lat, lng });

  // Load merchant pins
  const { data: pins } = useQuery({
    queryKey: ["supermap-pins"],
    queryFn: () => getMapMerchantPins({ limit: 500 }),
    staleTime: 60_000,
  });

  // Convert pins to GeoEntity format
  useEffect(() => {
    if (!pins) return;
    const entities: GeoEntity[] = pins
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        title: p.name,
        type: (["restaurant", "shop", "grocery", "property", "driver", "courier", "hotel", "service"].includes(p.category) ? p.category : "shop") as GeoEntity["type"],
        category: p.subcategory || p.category || "general",
        lat: p.lat!,
        lng: p.lng!,
        rating: p.rating ?? undefined,
        imageUrl: p.coverImage || undefined,
        image_url: p.coverImage || undefined,
        distance: undefined,
      }));
    setEntities(entities);
  }, [pins, setEntities]);

  // Sync user location to viewport (single source — locationStore)
  useEffect(() => {
    if (currentLocation?.lat && currentLocation?.lng) {
      setViewport({ centerLat: currentLocation.lat, centerLng: currentLocation.lng });
    }
  }, [currentLocation, setViewport]);

  // Generate mock nearby drivers
  useEffect(() => {
    const dLat = currentLocation?.lat ?? 25.2048;
    const dLng = currentLocation?.lng ?? 55.2708;
    const drivers = Array.from({ length: 8 }, (_, i) => {
      const angle = (2 * Math.PI * i) / 8 + Math.random() * 0.4;
      const dist = (Math.random() * 0.5 + 0.2) * 2;
      return {
        id: `driver-${i}`,
        lat: dLat + (dist / 111) * Math.cos(angle),
        lng: dLng + (dist / (111 * Math.cos((dLat * Math.PI) / 180))) * Math.sin(angle),
        vehicleType: (i % 3 === 0 ? "courier" : "taxi") as "taxi" | "courier",
        bearing: Math.random() * 360,
        label: i % 3 === 0 ? "Courier" : `Taxi ${i + 1}`,
      };
    });
    setMobilityPoints(drivers);
  }, [currentLocation, setMobilityPoints]);

  // When search result selected, fly to it on map
  useEffect(() => {
    if (!selectedEntityId) return;
    const result = searchResults.find(r => r.id === selectedEntityId);
    if (!result) return;
    setCenter(result.lat, result.lng);
    setZoom(16);
  }, [selectedEntityId, searchResults, setCenter, setZoom]);

  const handleRecenter = () => {
    if (currentLocation?.lat && currentLocation?.lng) {
      setCenter(currentLocation.lat, currentLocation.lng);
      setZoom(14);
      useUnifiedMapStore.getState().setFollowUser();
    }
  };

  return (
    <div className="fixed inset-0 z-0 bg-background">
      {/* Map canvas */}
      <SuperMap
        className="w-full h-full"
        showModeBar={false}
        onSelectEntity={(entity) => selectEntity(entity.id)}
        onZoneClick={() => selectEntity(null)}
      />

      {/* TOP: Weather HUD + Search bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 safe-area-inset-top">
        {/* Weather + Live badge */}
        <div className="pointer-events-auto flex items-center justify-between px-4 pt-3 pb-2">
          <WeatherHUD
            icon={weather.icon}
            label={weather.label}
            shortLabel={weather.shortLabel}
            loading={weather.loading}
            isRaining={weather.isRaining}
          />
        </div>

        {/* Search bar */}
        <div className="pointer-events-auto px-4 pb-2">
          <SmartSearchBar />
        </div>
      </div>

      {/* RIGHT: Quick controls stack */}
      <div className="absolute bottom-28 right-4 z-30 pointer-events-auto">
        <MapControls onRecenter={handleRecenter} />
      </div>

      {/* BOTTOM: Smart sheet */}
      <SmartBottomSheet />
    </div>
  );
}
