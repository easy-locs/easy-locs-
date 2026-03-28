/**
 * useMapWeather — Weather fog, rain radar tiles, station layers.
 * Extracted from SuperMap. No UI rendering.
 */
import { useEffect, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import { useSuperMapStore } from "@/stores/superMapStore";
import { useLiveWeatherStation } from "@/hooks/useLiveWeatherStation";
import { useRainRadar } from "@/hooks/useRainRadar";
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
  mapRef: React.RefObject<mapboxgl.Map | null>,
  ready: boolean
) {
  const centerLat = useSuperMapStore(s => s.centerLat);
  const centerLng = useSuperMapStore(s => s.centerLng);
  const userLat = useSuperMapStore(s => s.userLat);
  const userLng = useSuperMapStore(s => s.userLng);
  const showWeather = useSuperMapStore(s => s.showWeather);
  const showStations = useSuperMapStore(s => s.showStations);
  const showMobility = useSuperMapStore(s => s.showMobility);

  const weather = useLiveWeatherStation({ lat: userLat ?? centerLat, lng: userLng ?? centerLng });
  const weatherRadar = useRainRadar(showWeather || weather.isRaining);

  const pulseFrameRef = useRef(0);
  const pulseRafRef = useRef<number | null>(null);

  // Setup rain source + layer + stations on first ready
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

    // Station pulse animation
    const pulse = () => {
      if (mapRef.current && document.visibilityState !== "hidden") {
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

  // Fog
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (weather.isRaining) {
      map.setFog({
        color: "rgba(94, 134, 190, 0.22)",
        "high-color": "rgba(18, 35, 58, 0.20)",
        "horizon-blend": 0.18,
        range: [0.8, 8],
        "space-color": "rgba(10, 16, 28, 0.82)",
        "star-intensity": 0.03,
      });
    } else {
      map.setFog({
        color: "rgba(255, 255, 255, 0.02)",
        "high-color": "rgba(255, 255, 255, 0.01)",
        "horizon-blend": 0.08,
        range: [1, 10],
        "space-color": "rgba(10, 12, 20, 0.72)",
        "star-intensity": 0.08,
      });
    }
  }, [weather.isRaining, ready]);

  // Auto-activate weather on rain
  useEffect(() => {
    if (weather.isRaining && !showWeather) {
      useSuperMapStore.getState().toggleWeather();
    }
  }, [weather.isRaining, showWeather]);

  // Rain radar tile cycling
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const visible = showWeather || weather.isRaining;
    const layer = map.getLayer(RAIN_LAYER);
    const source = map.getSource(RAIN_SOURCE) as (mapboxgl.Source & { setTiles?: (tiles: string[]) => void }) | undefined;
    if (layer) {
      map.setLayoutProperty(RAIN_LAYER, "visibility", visible ? "visible" : "none");
      map.setPaintProperty(RAIN_LAYER, "raster-opacity", visible ? (weather.isRaining ? 0.72 : 0.42) : 0);
      map.setPaintProperty(RAIN_LAYER, "raster-fade-duration", 300);
    }
    if (source?.setTiles && weatherRadar.activeTileUrl) {
      source.setTiles([weatherRadar.activeTileUrl]);
    }
  }, [ready, showWeather, weather.isRaining, weatherRadar.activeTileUrl]);

  // Station + mobility visibility
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
