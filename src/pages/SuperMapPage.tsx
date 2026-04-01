/**
 * SuperMapPage — Full-screen premium intelligent map experience.
 * Glass search bar, weather HUD, smart bottom sheet, brand markers.
 */
import { useEffect } from "react";
import SuperMap from "@/components/map/SuperMap";
import SmartSearchBar from "@/components/map/SmartSearchBar";
import SmartBottomSheet from "@/components/map/SmartBottomSheet";
import WeatherHUD from "@/components/map/WeatherHUD";
import { useSuperMapStore } from "@/stores/superMapStore";
import { useSmartMapStore } from "@/stores/smartMapStore";
import { useLocationStore } from "@/stores/locationStore";
import { useQuery } from "@tanstack/react-query";
import { getMapMerchantPins } from "@/lib/map/mapEngine";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

export default function SuperMapPage() {
  const setEntities = useSuperMapStore((s) => s.setEntities);
  const setUserLocation = useSuperMapStore((s) => s.setUserLocation);
  const setMobilityPoints = useSuperMapStore((s) => s.setMobilityPoints);
  const currentLocation = useLocationStore((s) => s.currentLocation);

  // Smart map store
  const setSmartUserLocation = useSmartMapStore((s) => s.setUserLocation);
  const setSmartViewport = useSmartMapStore((s) => s.setViewport);
  const searchResults = useSmartMapStore((s) => s.search.results);
  const selectedResultId = useSmartMapStore((s) => s.selectedResultId);
  const selectResult = useSmartMapStore((s) => s.selectResult);

  // Weather
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

  // Sync user location to both stores
  useEffect(() => {
    if (currentLocation?.lat && currentLocation?.lng) {
      setUserLocation(currentLocation.lat, currentLocation.lng);
      setSmartUserLocation(currentLocation.lat, currentLocation.lng);
      setSmartViewport({ centerLat: currentLocation.lat, centerLng: currentLocation.lng });
    }
  }, [currentLocation, setUserLocation, setSmartUserLocation, setSmartViewport]);

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
    if (!selectedResultId) return;
    const result = searchResults.find(r => r.id === selectedResultId);
    if (!result) return;
    const store = useSuperMapStore.getState();
    store.setCenter(result.lat, result.lng);
    store.setZoom(16);
  }, [selectedResultId, searchResults]);

  return (
    <div className="fixed inset-0 z-0 bg-background">
      {/* Map canvas */}
      <SuperMap
        className="w-full h-full"
        showModeBar={false}
        onSelectEntity={(entity) => {
          selectResult(entity.id);
        }}
        onZoneClick={() => {
          selectResult(null);
        }}
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

      {/* BOTTOM: Smart sheet */}
      <SmartBottomSheet />

      {/* Mode bar at bottom-right, above sheet */}
      <div className="absolute bottom-3 right-3 z-30 pointer-events-auto">
        <SuperMapModeBarInline />
      </div>
    </div>
  );
}

// Inline mode bar for layer controls
import MapControls from "@/components/map/MapControls";

function SuperMapModeBarInline() {
  return (
    <div className="flex flex-col gap-2">
      <MapControls />
    </div>
  );
}
