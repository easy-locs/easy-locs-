/**
 * DeliveryHeatmapLayer — Canvas-based heatmap overlay for Leaflet.
 * Uses leaflet.heat for GPU-friendly rendering of delivery density.
 * PASS GO LIVE: Delivery Radar Upgrade.
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";

interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1
}

interface Props {
  map: L.Map | null;
  points: HeatPoint[];
  visible: boolean;
  radius?: number;
  blur?: number;
  maxZoom?: number;
}

export default function DeliveryHeatmapLayer({ map, points, visible, radius = 25, blur = 15, maxZoom = 17 }: Props) {
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Cleanup previous
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!visible || points.length === 0) return;

    const heatData = points.map(p => [p.lat, p.lng, p.intensity] as [number, number, number]);

    const heat = (L as any).heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      gradient: {
        0.0: "rgba(0, 0, 0, 0)",
        0.2: "#06b6d4",
        0.4: "#22c55e",
        0.6: "#f59e0b",
        0.8: "#ef4444",
        1.0: "#dc2626",
      },
      minOpacity: 0.35,
    });

    heat.addTo(map);
    layerRef.current = heat;

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, visible, radius, blur, maxZoom]);

  return null;
}
