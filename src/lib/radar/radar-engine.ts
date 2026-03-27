/**
 * Radar Engine — Core computation for nearby drivers, distance, ETA
 * + Mapbox weather radar layers, stations, particles, animations.
 */
import mapboxgl from "mapbox-gl";

// ── Re-exports for backward compatibility ──
export { haversineKm, formatETA, formatDistance, proximityBadge } from "@/lib/geo/distance";
import { haversineKm as _hkm } from "@/lib/geo/distance";
export const haversine = _hkm;
export const estimateETA = (distanceKm: number, avgSpeedKmh = 30) =>
  Math.round((distanceKm / avgSpeedKmh) * 60);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Driver {
  id: string;
  lat: number;
  lng: number;
  status: "available" | "busy";
  type: "taxi" | "delivery";
  rating: number;
  name?: string;
  vehicle?: string;
  plate?: string;
  avatar?: string;
}

export interface DriverWithDistance extends Driver {
  distance: number; // km
  eta: number;      // minutes
}

export interface RadarResult {
  nearbyDrivers: DriverWithDistance[];
  nearestDriver: DriverWithDistance | null;
  etaMinutes: number | null;
  availableCount: number;
  totalCount: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBAL STATE (ZUSTAND READY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type RadarState = {
  zoom: number;
  time: number;
  fps: number;
  quality: "low" | "medium" | "high";
};

export const radarState: RadarState = {
  zoom: 10,
  time: Date.now(),
  fps: 60,
  quality: "high",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CANONICAL LAYER ORDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const LAYER_ORDER = [
  "base",
  "terrain",
  "buildings_3d",
  "roads",
  "labels",
  "weather_radar",
  "weather_particles",
  "weather_stations",
  "shops",
  "drivers",
  "orders",
  "users",
  "video_pins",
  "selection",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ZOOM INTERPOLATION (SNAP STYLE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function zoomOpacity(min: number, max: number, z: number) {
  if (z <= min) return 0;
  if (z >= max) return 1;
  return (z - min) / (max - min);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RADAR (RAINVIEWER STYLE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let radarFrames: string[] = [];
let frameIndex = 0;

export async function loadRadarFrames() {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    const data = await res.json();
    const host = typeof data?.host === "string" ? data.host : "https://tilecache.rainviewer.com";
    radarFrames = [
      ...(Array.isArray(data?.radar?.past) ? data.radar.past : []),
      ...(Array.isArray(data?.radar?.nowcast) ? data.radar.nowcast : []),
    ]
      .map((f: { path?: string }) => f?.path)
      .filter((p: unknown): p is string => typeof p === "string" && p.length > 0)
      .slice(-6)
      .map((path: string) => `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`);
  } catch {
    radarFrames = [];
  }
}

export function addRadarLayer(map: mapboxgl.Map) {
  if (!radarFrames.length) return;
  if (map.getSource("radar")) return;

  map.addSource("radar", {
    type: "raster",
    tiles: [radarFrames[0]],
    tileSize: 256,
    maxzoom: 12,
  });

  map.addLayer({
    id: "weather_radar",
    type: "raster",
    source: "radar",
    paint: {
      "raster-opacity": 0.3,
    },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RADAR ANIMATION (SMOOTH)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function startRadarAnimation(map: mapboxgl.Map) {
  setInterval(() => {
    if (!radarFrames.length) return;
    frameIndex = (frameIndex + 1) % radarFrames.length;
    const source = map.getSource("radar") as mapboxgl.RasterSource;
    if (!source) return;
    (source as any).tiles = [radarFrames[frameIndex]];
    map.triggerRepaint();
  }, 900);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATIONS (PULSE EFFECT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addStations(map: mapboxgl.Map, data: any[]) {
  if (map.getSource("stations")) return;

  map.addSource("stations", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: data,
    },
  });

  map.addLayer({
    id: "weather_stations",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 15, 10],
      "circle-color": "#00D1FF",
      "circle-opacity": 0.9,
    },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PULSE ANIMATION (SNAP EFFECT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function animateStations(map: mapboxgl.Map) {
  let t = 0;
  function loop() {
    t += 0.05;
    if (map.getLayer("weather_stations")) {
      const radius = 6 + Math.sin(t) * 3;
      map.setPaintProperty("weather_stations", "circle-radius", radius);
    }
    requestAnimationFrame(loop);
  }
  loop();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PARTICLES (LIGHTWEIGHT)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addParticles(map: mapboxgl.Map) {
  if (!map.getSource("stations") || map.getLayer("weather_particles")) return;

  map.addLayer({
    id: "weather_particles",
    type: "circle",
    source: "stations",
    paint: {
      "circle-radius": 1,
      "circle-color": "#ffffff",
      "circle-opacity": 0.2,
    },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUALITY ADAPTATION (FPS SAFE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function autoQualityAdjust() {
  setInterval(() => {
    if (radarState.fps < 30) radarState.quality = "low";
    else if (radarState.fps < 50) radarState.quality = "medium";
    else radarState.quality = "high";
  }, 2000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MASTER INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function initRadar(map: mapboxgl.Map, stations: any[]) {
  await loadRadarFrames();
  addRadarLayer(map);
  addStations(map, stations);
  addParticles(map);
  startRadarAnimation(map);
  animateStations(map);
  autoQualityAdjust();

  map.on("zoom", () => {
    radarState.zoom = map.getZoom();
    if (map.getLayer("weather_radar")) {
      const opacity = zoomOpacity(5, 10, radarState.zoom);
      map.setPaintProperty("weather_radar", "raster-opacity", opacity * 0.35);
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE COMPUTATION (PRESERVED)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function computeRadar(
  userLat: number,
  userLng: number,
  drivers: Driver[],
  radiusKm = 10,
  driverType?: "taxi" | "delivery",
): RadarResult {
  const filtered = driverType
    ? drivers.filter(d => d.type === driverType)
    : drivers;

  const available = filtered.filter(d => d.status === "available");

  const withDistance: DriverWithDistance[] = available
    .map(d => ({
      ...d,
      distance: haversine(userLat, userLng, d.lat, d.lng),
      eta: estimateETA(haversine(userLat, userLng, d.lat, d.lng)),
    }))
    .filter(d => d.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  const nearest = withDistance[0] || null;

  return {
    nearbyDrivers: withDistance.slice(0, 20),
    nearestDriver: nearest,
    etaMinutes: nearest?.eta ?? null,
    availableCount: withDistance.length,
    totalCount: filtered.length,
  };
}

export function selectBestDriver(drivers: DriverWithDistance[]): DriverWithDistance | null {
  if (!drivers.length) return null;

  return drivers
    .filter(d => d.status === "available")
    .sort((a, b) => {
      const scoreA = (1 / Math.max(a.distance, 0.1)) * 10 + a.rating;
      const scoreB = (1 / Math.max(b.distance, 0.1)) * 10 + b.rating;
      return scoreB - scoreA;
    })[0] || null;
}

/** Radius filter presets */
export const RADIUS_OPTIONS = [
  { value: "5", label: "5 km", km: 5 },
  { value: "10", label: "10 km", km: 10 },
  { value: "25", label: "25 km", km: 25 },
  { value: "50", label: "50 km", km: 50 },
  { value: "city", label: "City", km: null },
  { value: "country", label: "Country", km: null },
  { value: "worldwide", label: "Worldwide", km: null },
] as const;

export type RadiusValue = typeof RADIUS_OPTIONS[number]["value"];

export function filterByRadius<T extends { lat: number; lng: number }>(
  entities: T[],
  center: { lat: number; lng: number },
  radiusKm: number,
): T[] {
  return entities.filter((e) => haversine(center.lat, center.lng, e.lat, e.lng) <= radiusKm);
}

export function sortByDistance<T extends { lat: number; lng: number }>(
  entities: T[],
  center: { lat: number; lng: number },
): (T & { _distKm: number })[] {
  return entities
    .map((e) => ({ ...e, _distKm: haversine(center.lat, center.lng, e.lat, e.lng) }))
    .sort((a, b) => a._distKm - b._distKm);
}
