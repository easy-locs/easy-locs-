import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { useUnifiedMapStore } from "@/stores/mapStore";
import { useLocationStore } from "@/stores/locationStore";
import { useWeatherDisplayStore } from "@/stores/weatherDisplayStore";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import { useRainRadar } from "@/hooks/useRainRadar";
import { useWeatherAutoMode } from "@/hooks/map/useWeatherAutoMode";
import {
  ensureLiveStationLayers,
  animateStationPulse,
  STATION_CLUSTER_LAYER,
  STATION_CLUSTER_COUNT_LAYER,
  STATION_PULSE_LAYER,
  STATION_POINT_LAYER,
  STATION_LABEL_LAYER,
} from "@/lib/map/live-stations-engine";
import { LAYERS } from "@/lib/map/superMapLayers";

const RAIN_SOURCE = "supermap-rain-radar";
const RAIN_LAYER = "supermap-rain-radar-layer";

export function useMapWeather(
  mapRef: React.RefObject<maplibregl.Map | null>,
  ready: boolean
) {
  const centerLat = useUnifiedMapStore(s => s.viewport.centerLat);
  const centerLng = useUnifiedMapStore(s => s.viewport.centerLng);
  const showMobility = useUnifiedMapStore(s => s.showMobility);

  const currentLocation = useLocationStore(s => s.currentLocation);
  const userLat = currentLocation?.lat ?? null;
  const userLng = currentLocation?.lng ?? null;

  const radarOverlay = useWeatherDisplayStore(s => s.radarOverlay);
  const effectsLevel = useWeatherDisplayStore(s => s.effectsLevel);
  const showStations = useWeatherDisplayStore(s => s.showStations);

  const weather = useLiveWeatherStation({ lat: userLat ?? centerLat, lng: userLng ?? centerLng });

  const radarEnabled = radarOverlay !== "off" || weather.isRaining;
  const weatherRadar = useRainRadar(radarEnabled);

  useWeatherAutoMode({
    isRaining: weather.isRaining,
    precipitationMm: weather.precipitationMm,
    windKmh: weather.windKmh,
  });

  const pulseFrameRef = useRef(0);
  const pulseRafRef = useRef<number | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!map.getSource(RAIN_SOURCE)) {
      map.addSource(RAIN_SOURCE, {
        type: "raster",
        tiles: [weatherRadar.activeTileUrl ?? "https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/256/2/1_1.png"],
        tileSize: 256,
      });
    }
    if (!map.getLayer(RAIN_LAYER)) {
      map.addLayer({
        id: RAIN_LAYER, type: "raster", source: RAIN_SOURCE,
        paint: { "raster-opacity": 0, "raster-fade-duration": 0, "raster-resampling": "linear" },
      }, LAYERS.ZONE_FILL);
    }
    ensureLiveStationLayers(map, LAYERS.MOBILITY_POINT);

    const pulse = () => {
      if (!mapRef.current) return;
      if (document.visibilityState !== "hidden") {
        pulseFrameRef.current += 1;
        animateStationPulse(mapRef.current, pulseFrameRef.current);
      }
      pulseRafRef.current = requestAnimationFrame(pulse);
    };
    pulseRafRef.current = requestAnimationFrame(pulse);

    return () => {
      if (pulseRafRef.current != null) cancelAnimationFrame(pulseRafRef.current);
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    try {
      const applyFog = effectsLevel !== "off" && weather.isRaining;
      if (applyFog) {
        const intense = effectsLevel === "immersive";
        (map as any).setFog?.({
          color: intense ? "rgba(94, 134, 190, 0.30)" : "rgba(94, 134, 190, 0.15)",
          "high-color": intense ? "rgba(18, 35, 58, 0.25)" : "rgba(18, 35, 58, 0.12)",
          "horizon-blend": intense ? 0.22 : 0.12,
          range: [0.8, 8],
          "space-color": "rgba(10, 16, 28, 0.82)",
          "star-intensity": 0.03,
        });
      } else {
        (map as any).setFog?.({
          color: "rgba(255, 255, 255, 0.02)",
          "high-color": "rgba(255, 255, 255, 0.01)",
          "horizon-blend": 0.08,
          range: [1, 10],
          "space-color": "rgba(10, 12, 20, 0.72)",
          "star-intensity": 0.08,
        });
      }
    } catch {}
  }, [weather.isRaining, effectsLevel, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const visible = radarOverlay !== "off";
    const layer = map.getLayer(RAIN_LAYER);
    const source = map.getSource(RAIN_SOURCE) as (maplibregl.Source & { setTiles?: (tiles: string[]) => void }) | undefined;

    if (layer) {
      map.setLayoutProperty(RAIN_LAYER, "visibility", visible ? "visible" : "none");
      const opacity = radarOverlay === "full"
        ? (weather.isRaining ? 0.72 : 0.42)
        : radarOverlay === "minimal" ? 0.25 : 0;
      map.setPaintProperty(RAIN_LAYER, "raster-opacity", opacity);
      map.setPaintProperty(RAIN_LAYER, "raster-fade-duration", 300);
    }
    if (source?.setTiles && weatherRadar.activeTileUrl) {
      source.setTiles([weatherRadar.activeTileUrl]);
    }
  }, [ready, radarOverlay, weather.isRaining, weatherRadar.activeTileUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const stationVis = showStations ? "visible" : "none";
    [STATION_CLUSTER_LAYER, STATION_CLUSTER_COUNT_LAYER, STATION_PULSE_LAYER, STATION_POINT_LAYER, STATION_LABEL_LAYER].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", stationVis);
    });
    if (map.getLayer(LAYERS.MOBILITY_POINT)) map.setLayoutProperty(LAYERS.MOBILITY_POINT, "visibility", showMobility ? "visible" : "none");
    if (map.getLayer(LAYERS.MOBILITY_LABEL)) map.setLayoutProperty(LAYERS.MOBILITY_LABEL, "visibility", showMobility ? "visible" : "none");
  }, [ready, showMobility, showStations]);

  return { weather, weatherRadar };
}
