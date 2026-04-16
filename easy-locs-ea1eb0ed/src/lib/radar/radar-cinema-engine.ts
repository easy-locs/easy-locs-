/**
 * Radar Cinema Engine — Cinematic weather radar with animated drivers,
 * rain canvas overlay, timeline playback, fog, and smart camera.
 */
import type maplibregl from "maplibre-gl";
import { getMapLibreGL } from "@/lib/maplibre/maplibre-loader";
import { DRIVER_STATUS_COLORS, RADAR_INTENSITY_COLORS } from "@/config/colors";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type CinemaLngLat = [number, number];

export type CinemaDriverFrame = {
  id: string;
  from: CinemaLngLat;
  to: CinemaLngLat;
  progress: number;
  heading?: number;
  status?: "idle" | "busy" | "delivering";
};

export type WeatherStationLive = {
  id: string;
  name: string;
  coords: CinemaLngLat;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  condition?: string;
  intensity?: number;
};

export type RadarTimelineFrame = {
  id: string;
  label: string;
  opacity?: number;
  stations?: WeatherStationLive[];
};

export type RadarCinemaOptions = {
  weatherStations?: WeatherStationLive[];
  timeline?: RadarTimelineFrame[];
  drivers?: CinemaDriverFrame[];
  nightMode?: boolean;
  autoCamera?: boolean;
};

type RainDrop = {
  x: number;
  y: number;
  len: number;
  speed: number;
  drift: number;
  alpha: number;
};

type RadarCinemaState = {
  map: maplibregl.Map;
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D | null;
  animationFrame?: number;
  stationPulseFrame?: number;
  rainDrops: RainDrop[];
  timelineIndex: number;
  timelinePlaying: boolean;
  timelineTimer?: number;
  popup?: maplibregl.Popup | null;
  stationClickHandler?: (e: maplibregl.MapLayerMouseEvent) => void;
  stationEnterHandler?: () => void;
  stationLeaveHandler?: () => void;
  resizeHandler?: () => void;
};

const CINEMA_STATE = new WeakMap<maplibregl.Map, RadarCinemaState>();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getOrCreateState(map: maplibregl.Map): RadarCinemaState {
  const existing = CINEMA_STATE.get(map);
  if (existing) return existing;
  const state: RadarCinemaState = {
    map,
    rainDrops: [],
    timelineIndex: 0,
    timelinePlaying: true,
    popup: null,
  };
  CINEMA_STATE.set(map, state);
  return state;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpCoords(from: CinemaLngLat, to: CinemaLngLat, t: number): CinemaLngLat {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t)];
}

function driverColor(status?: string) {
  switch (status) {
    case "busy": return DRIVER_STATUS_COLORS.busy;
    case "delivering": return DRIVER_STATUS_COLORS.delivering;
    default: return DRIVER_STATUS_COLORS.idle;
  }
}

function stationColor(intensity = 0.3) {
  if (intensity >= 0.8) return RADAR_INTENSITY_COLORS.extreme;
  if (intensity >= 0.6) return RADAR_INTENSITY_COLORS.high;
  if (intensity >= 0.4) return RADAR_INTENSITY_COLORS.moderate;
  if (intensity >= 0.2) return RADAR_INTENSITY_COLORS.low;
  return RADAR_INTENSITY_COLORS.minimal;
}

function stationRadius(intensity = 0.3) {
  return 5 + intensity * 10;
}

function safeRemoveLayer(map: maplibregl.Map, id: string) {
  if (map.getLayer(id)) map.removeLayer(id);
}

function safeRemoveSource(map: maplibregl.Map, id: string) {
  if (map.getSource(id)) map.removeSource(id);
}

function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DRIVERS SOURCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildDriverFeatures(drivers: CinemaDriverFrame[]): GeoJSON.Feature[] {
  return drivers.map((d) => {
    const progress = clamp(d.progress ?? 0, 0, 1);
    const coords = interpCoords(d.from, d.to, progress);
    return {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: coords },
      properties: {
        id: d.id,
        heading: d.heading ?? 0,
        status: d.status ?? "idle",
        color: driverColor(d.status),
        progress,
      },
    };
  });
}

function buildDriverTrailFeatures(drivers: CinemaDriverFrame[]): GeoJSON.Feature[] {
  return drivers.map((d) => {
    const progress = clamp(d.progress ?? 0, 0, 1);
    const current = interpCoords(d.from, d.to, progress);
    return {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: [d.from, current] },
      properties: { id: d.id, color: driverColor(d.status) },
    };
  });
}

export function upsertCinemaDrivers(map: maplibregl.Map, drivers: CinemaDriverFrame[]) {
  safeRemoveLayer(map, "cinema-driver-trails");
  safeRemoveLayer(map, "cinema-drivers");
  safeRemoveSource(map, "cinema-driver-trails-source");
  safeRemoveSource(map, "cinema-drivers-source");

  map.addSource("cinema-drivers-source", {
    type: "geojson",
    data: fc(buildDriverFeatures(drivers)),
  });

  map.addSource("cinema-driver-trails-source", {
    type: "geojson",
    data: fc(buildDriverTrailFeatures(drivers)),
  });

  map.addLayer({
    id: "cinema-driver-trails",
    type: "line",
    source: "cinema-driver-trails-source",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 2.5, 18, 4.5],
      "line-opacity": 0.34,
      "line-blur": 1.1,
    },
  });

  map.addLayer({
    id: "cinema-drivers",
    type: "circle",
    source: "cinema-drivers-source",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 7, 18, 11],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.96,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
      "circle-blur": 0.08,
    },
  });
}

export function updateCinemaDrivers(map: maplibregl.Map, drivers: CinemaDriverFrame[]) {
  const pointSource = map.getSource("cinema-drivers-source") as maplibregl.GeoJSONSource | undefined;
  const trailSource = map.getSource("cinema-driver-trails-source") as maplibregl.GeoJSONSource | undefined;
  if (pointSource) pointSource.setData(fc(buildDriverFeatures(drivers)));
  if (trailSource) trailSource.setData(fc(buildDriverTrailFeatures(drivers)));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATIONS LIVE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildStationFeatures(stations: WeatherStationLive[]): GeoJSON.Feature[] {
  return stations.map((s) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: s.coords },
    properties: {
      id: s.id,
      name: s.name,
      temperature: s.temperature ?? null,
      humidity: s.humidity ?? null,
      windSpeed: s.windSpeed ?? null,
      condition: s.condition ?? "",
      intensity: s.intensity ?? 0.3,
      color: stationColor(s.intensity ?? 0.3),
      radius: stationRadius(s.intensity ?? 0.3),
    },
  }));
}

export function upsertCinemaStations(map: maplibregl.Map, stations: WeatherStationLive[]) {
  safeRemoveLayer(map, "cinema-stations-pulse");
  safeRemoveLayer(map, "cinema-stations-core");
  safeRemoveSource(map, "cinema-stations-source");

  map.addSource("cinema-stations-source", {
    type: "geojson",
    data: fc(buildStationFeatures(stations)),
  });

  map.addLayer({
    id: "cinema-stations-pulse",
    type: "circle",
    source: "cinema-stations-source",
    paint: {
      "circle-radius": ["get", "radius"],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.16,
      "circle-stroke-width": 0,
    },
  });

  map.addLayer({
    id: "cinema-stations-core",
    type: "circle",
    source: "cinema-stations-source",
    paint: {
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        8, ["*", ["get", "radius"], 0.45],
        14, ["*", ["get", "radius"], 0.62],
        18, ["*", ["get", "radius"], 0.75],
      ],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.95,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.3,
    },
  });
}

export function attachStationPopups(map: maplibregl.Map) {
  const state = getOrCreateState(map);

  if (state.stationClickHandler) {
    map.off("click", "cinema-stations-core", state.stationClickHandler);
  }
  if (state.stationEnterHandler) {
    map.off("mouseenter", "cinema-stations-core", state.stationEnterHandler);
  }
  if (state.stationLeaveHandler) {
    map.off("mouseleave", "cinema-stations-core", state.stationLeaveHandler);
  }

  state.stationClickHandler = (e: maplibregl.MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;
    const props = feature.properties ?? {};
    const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

    if (state.popup) {
      state.popup.remove();
      state.popup = null;
    }

    const gl = getMapLibreGL();
    if (!gl) return;
    state.popup = new gl.Popup({
      closeButton: false,
      offset: 14,
      className: "radar-cinema-popup",
    })
      .setLngLat(coordinates)
      .setHTML(`
        <div style="min-width:180px;padding:10px 12px;border-radius:14px;background:rgba(15,23,42,0.92);backdrop-filter:blur(12px);color:white;border:1px solid rgba(255,255,255,0.08)">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px">${props.name ?? "Station"}</div>
          <div style="font-size:12px;opacity:.92;margin-bottom:3px">Condition: ${props.condition ?? "-"}</div>
          <div style="font-size:12px;opacity:.92;margin-bottom:3px">Temp: ${props.temperature ?? "-"}°C</div>
          <div style="font-size:12px;opacity:.92;margin-bottom:3px">Humidity: ${props.humidity ?? "-"}%</div>
          <div style="font-size:12px;opacity:.92">Wind: ${props.windSpeed ?? "-"} km/h</div>
        </div>
      `)
      .addTo(map);
  };

  state.stationEnterHandler = () => {
    try { map.getCanvas().style.cursor = "pointer"; } catch {}
  };

  state.stationLeaveHandler = () => {
    try { map.getCanvas().style.cursor = ""; } catch {}
  };

  map.on("click", "cinema-stations-core", state.stationClickHandler);
  map.on("mouseenter", "cinema-stations-core", state.stationEnterHandler);
  map.on("mouseleave", "cinema-stations-core", state.stationLeaveHandler);
}

export function animateCinemaStations(map: maplibregl.Map) {
  const state = getOrCreateState(map);
  let t = 0;
  if (state.stationPulseFrame) cancelAnimationFrame(state.stationPulseFrame);
  function loop() {
    if (!map.getLayer("cinema-stations-pulse")) { state.stationPulseFrame = undefined; return; }
    t += 0.04;
    const radiusBoost = 2 + (Math.sin(t) + 1) * 3;
    const opacity = 0.08 + (Math.sin(t) + 1) * 0.05;
    map.setPaintProperty("cinema-stations-pulse", "circle-radius", ["+", ["get", "radius"], radiusBoost]);
    map.setPaintProperty("cinema-stations-pulse", "circle-opacity", opacity);
    state.stationPulseFrame = requestAnimationFrame(loop);
  }
  loop();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NIGHT CITY HALO + FOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addNightHalo(map: maplibregl.Map) {
  if (map.getLayer("cinema-night-halo")) return;
  map.addLayer({
    id: "cinema-night-halo",
    type: "background",
    paint: {
      "background-color": "rgba(4,10,28,0.12)",
      "background-opacity": 0.22,
    },
  });
}

export function addFogCinema(map: maplibregl.Map) {
  try {
    map.setFog({
      color: "rgb(8,18,38)",
      "high-color": "rgb(25,54,86)",
      "horizon-blend": 0.14,
      "space-color": "rgb(2,8,20)",
      "star-intensity": 0.1,
    });
  } catch {
    // fog unsupported
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RAIN GPU-LIKE CANVAS OVERLAY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createRainCanvas(map: maplibregl.Map) {
  const state = getOrCreateState(map);
  const container = map.getContainer();
  if (state.canvas) return state.canvas;

  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "20";
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);
  state.canvas = canvas;
  state.ctx = canvas.getContext("2d");
  return canvas;
}

function resizeRainCanvas(map: maplibregl.Map) {
  const state = getOrCreateState(map);
  const canvas = state.canvas;
  if (!canvas) return;

  const container = map.getContainer();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(container.clientWidth * dpr);
  canvas.height = Math.floor(container.clientHeight * dpr);
  canvas.style.width = `${container.clientWidth}px`;
  canvas.style.height = `${container.clientHeight}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.ctx = ctx;
  }
}

function seedRain(map: maplibregl.Map, density = 160) {
  const state = getOrCreateState(map);
  const container = map.getContainer();
  state.rainDrops = Array.from({ length: density }, () => ({
    x: Math.random() * container.clientWidth,
    y: Math.random() * container.clientHeight,
    len: 8 + Math.random() * 16,
    speed: 4 + Math.random() * 7,
    drift: -1.4 + Math.random() * 2.2,
    alpha: 0.08 + Math.random() * 0.2,
  }));
}

export function enableRainCinema(map: maplibregl.Map, density = 160) {
  const state = getOrCreateState(map);
  createRainCanvas(map);
  resizeRainCanvas(map);
  seedRain(map, density);

  const onResize = () => resizeRainCanvas(map);
  state.resizeHandler = onResize;
  map.on("resize", onResize);

  function loop() {
    const { ctx } = state;
    const canvas = state.canvas;
    if (!ctx || !canvas) return;

    const w = map.getContainer().clientWidth;
    const h = map.getContainer().clientHeight;
    ctx.clearRect(0, 0, w, h);

    for (const d of state.rainDrops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.drift, d.y + d.len);
      ctx.strokeStyle = `rgba(180,220,255,${d.alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      d.x += d.drift;
      d.y += d.speed;

      if (d.y > h + 20 || d.x < -20 || d.x > w + 20) {
        d.x = Math.random() * w;
        d.y = -20;
      }
    }

    state.animationFrame = requestAnimationFrame(loop);
  }

  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  loop();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIMELINE WEATHER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function startRadarTimeline(map: maplibregl.Map, timeline: RadarTimelineFrame[] = []) {
  const state = getOrCreateState(map);
  if (!timeline.length) return;
  if (state.timelineTimer) window.clearInterval(state.timelineTimer);

  state.timelineTimer = window.setInterval(() => {
    if (!state.timelinePlaying) return;
    state.timelineIndex = (state.timelineIndex + 1) % timeline.length;
    const frame = timeline[state.timelineIndex];
    upsertCinemaStations(map, frame.stations ?? []);
  }, 2200);
}

export function playRadarTimeline(map: maplibregl.Map) {
  getOrCreateState(map).timelinePlaying = true;
}

export function pauseRadarTimeline(map: maplibregl.Map) {
  getOrCreateState(map).timelinePlaying = false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SMART CAMERA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function focusCinemaOnDrivers(map: maplibregl.Map, drivers: CinemaDriverFrame[]) {
  if (!drivers.length) return;
  const gl = getMapLibreGL();
  if (!gl) return;
  const bounds = new gl.LngLatBounds();
  drivers.forEach((d) => {
    const p = interpCoords(d.from, d.to, clamp(d.progress, 0, 1));
    bounds.extend(p);
  });
  map.fitBounds(bounds, { padding: 90, duration: 1400, pitch: 58, bearing: -18, maxZoom: 15.5 });
}

export function focusCinemaOnStations(map: maplibregl.Map, stations: WeatherStationLive[]) {
  if (!stations.length) return;
  const gl = getMapLibreGL();
  if (!gl) return;
  const bounds = new gl.LngLatBounds();
  stations.forEach((s) => bounds.extend(s.coords));
  map.fitBounds(bounds, { padding: 80, duration: 1200, pitch: 52, bearing: -12, maxZoom: 13.8 });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MASTER INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function initRadarCinema(map: maplibregl.Map, options: RadarCinemaOptions = {}) {
  addFogCinema(map);
  if (options.nightMode !== false) addNightHalo(map);
  upsertCinemaStations(map, options.weatherStations ?? []);
  attachStationPopups(map);
  animateCinemaStations(map);
  upsertCinemaDrivers(map, options.drivers ?? []);
  enableRainCinema(map, 170);

  if (options.timeline?.length) {
    startRadarTimeline(map, options.timeline);
  }

  if (options.autoCamera) {
    if ((options.drivers ?? []).length > 0) {
      focusCinemaOnDrivers(map, options.drivers ?? []);
    } else if ((options.weatherStations ?? []).length > 0) {
      focusCinemaOnStations(map, options.weatherStations ?? []);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLEANUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function destroyRadarCinema(map: maplibregl.Map) {
  const state = getOrCreateState(map);
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  if (state.stationPulseFrame) cancelAnimationFrame(state.stationPulseFrame);
  if (state.timelineTimer) window.clearInterval(state.timelineTimer);
  if (state.popup) state.popup.remove();
  if (state.stationClickHandler) map.off("click", "cinema-stations-core", state.stationClickHandler);
  if (state.stationEnterHandler) map.off("mouseenter", "cinema-stations-core", state.stationEnterHandler);
  if (state.stationLeaveHandler) map.off("mouseleave", "cinema-stations-core", state.stationLeaveHandler);
  if (state.resizeHandler) map.off("resize", state.resizeHandler);
  if (state.canvas?.parentNode) state.canvas.parentNode.removeChild(state.canvas);

  [
    "cinema-driver-trails", "cinema-drivers",
    "cinema-stations-pulse", "cinema-stations-core",
    "cinema-night-halo",
  ].forEach((id) => safeRemoveLayer(map, id));

  [
    "cinema-driver-trails-source", "cinema-drivers-source",
    "cinema-stations-source",
  ].forEach((id) => safeRemoveSource(map, id));

  CINEMA_STATE.delete(map);
}
