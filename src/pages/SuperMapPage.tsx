/**
 * SuperMapPage — Full-screen unified map experience.
 */
import { useEffect } from "react";
import SuperMap from "@/components/map/SuperMap";
import { useSuperMapStore } from "@/stores/superMapStore";
import { useLocationStore } from "@/stores/locationStore";
import { useQuery } from "@tanstack/react-query";
import { getMapMerchantPins } from "@/lib/map/mapEngine";
import type { GeoEntity } from "@/lib/geo/geoEntityAdapter";

export default function SuperMapPage() {
  const setEntities = useSuperMapStore((s) => s.setEntities);
  const setUserLocation = useSuperMapStore((s) => s.setUserLocation);
  const setMobilityPoints = useSuperMapStore((s) => s.setMobilityPoints);
  const currentLocation = useLocationStore((s) => s.currentLocation);

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
        type: p.category || "shop",
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

  // Set user location
  useEffect(() => {
    if (currentLocation?.lat && currentLocation?.lng) {
      setUserLocation(currentLocation.lat, currentLocation.lng);
    }
  }, [currentLocation, setUserLocation]);

  // Generate mock nearby drivers for mobility mode demo
  useEffect(() => {
    const lat = currentLocation?.lat ?? 25.2048;
    const lng = currentLocation?.lng ?? 55.2708;
    const drivers = Array.from({ length: 8 }, (_, i) => {
      const angle = (2 * Math.PI * i) / 8 + Math.random() * 0.4;
      const dist = (Math.random() * 0.5 + 0.2) * 2;
      return {
        id: `driver-${i}`,
        lat: lat + (dist / 111) * Math.cos(angle),
        lng: lng + (dist / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle),
        vehicleType: (i % 3 === 0 ? "courier" : "taxi") as "taxi" | "courier",
        bearing: Math.random() * 360,
        label: i % 3 === 0 ? "Courier" : `Taxi ${i + 1}`,
      };
    });
    setMobilityPoints(drivers);
  }, [currentLocation, setMobilityPoints]);

  return (
    <div className="fixed inset-0 z-0 bg-background">
      <SuperMap
        className="w-full h-full"
        showModeBar
        onSelectEntity={(entity) => {
          console.log("[SuperMap] Selected:", entity.id, entity.name);
        }}
        onZoneClick={(lat, lng) => {
          console.log("[SuperMap] Zone click:", lat, lng);
        }}
      />
    </div>
  );
}
