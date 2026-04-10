/**
 * Radar Snap Elite — Premium station rings, driver shadows,
 * lightning flashes, adaptive labels, and live side panel.
 */
import mapboxgl from "mapbox-gl";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SnapEliteLngLat = [number, number];

export type SnapEliteStation = {
  id: string;
  name: string;
  coords: SnapEliteLngLat;
  condition?: string;
  intensity?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  rainfallMm?: number;
  live?: boolean;
};

export type SnapEliteDriver = {
  id: string;
  coords: SnapEliteLngLat;
  heading?: number;
  status?: "idle" | "busy" | "delivering";
  speed?: number;
};

type SnapEliteState = {
  map: mapboxgl.Map;
  lightning: { active: boolean; opacity: number };
  sidePanel?: HTMLElement | null;
  labelZoomBound?: boolean;
  pulseFrame?: number;
};

const SNAP_ELITE = new WeakMap<mapboxgl.Map, SnapEliteState>();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getState(map: mapboxgl.Map): SnapEliteState {
  const existing = SNAP_ELITE.get(map);
  if (existing) return existing;
  const state: SnapEliteState = {
    map,
    lightning: { active: false, opacity: 0 },
    sidePanel: null,
    labelZoomBound: false,
  };
  SNAP_ELITE.set(map, state);
  return state;
}

function safeRemoveLayer(map: mapboxgl.Map, id: string) {
  if (map.getLayer(id)) map.removeLayer(id);
}

function safeRemoveSource(map: mapboxgl.Map, id: string) {
  if (map.getSource(id)) map.removeSource(id);
}

function featureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

function stationColor(intensity = 0.3) {
  if (intensity >= 0.85) return "#ef4444";
  if (intensity >= 0.65) return "#f97316";
  if (intensity >= 0.45) return "#facc15";
  if (intensity >= 0.25) return "#22c55e";
  return "#38bdf8";
}

function stationCoreRadius(intensity = 0.3) { return 5 + intensity * 8; }
function ring1(intensity = 0.3) { return 12 + intensity * 15; }
function ring2(intensity = 0.3) { return 20 + intensity * 25; }

function driverColor(status?: string) {
  switch (status) {
    case "busy": return "#f59e0b";
    case "delivering": return "#22c55e";
    default: return "#38bdf8";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FEATURE BUILDERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildStationFeatures(stations: SnapEliteStation[]): GeoJSON.Feature[] {
  return stations.map((s) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: s.coords },
    properties: {
      id: s.id,
      name: s.name,
      condition: s.condition ?? "",
      intensity: s.intensity ?? 0.3,
      color: stationColor(s.intensity ?? 0.3),
      coreRadius: stationCoreRadius(s.intensity ?? 0.3),
      ring1: ring1(s.intensity ?? 0.3),
      ring2: ring2(s.intensity ?? 0.3),
      temperature: s.temperature ?? null,
      humidity: s.humidity ?? null,
      windSpeed: s.windSpeed ?? null,
      rainfallMm: s.rainfallMm ?? null,
      live: s.live ? "LIVE" : "",
    },
  }));
}

function buildDriverFeatures(drivers: SnapEliteDriver[]): GeoJSON.Feature[] {
  return drivers.map((d) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: d.coords },
    properties: {
      id: d.id,
      heading: d.heading ?? 0,
      color: driverColor(d.status),
      speed: d.speed ?? 0,
      status: d.status ?? "idle",
    },
  }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATIONS ELITE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function upsertSnapEliteStations(map: mapboxgl.Map, stations: SnapEliteStation[]) {
  safeRemoveLayer(map, "snap-elite-stations-ring-2");
  safeRemoveLayer(map, "snap-elite-stations-ring-1");
  safeRemoveLayer(map, "snap-elite-stations-core");
  safeRemoveLayer(map, "snap-elite-stations-labels");
  safeRemoveSource(map, "snap-elite-stations-source");

  map.addSource("snap-elite-stations-source", {
    type: "geojson",
    data: featureCollection(buildStationFeatures(stations)),
  });

  map.addLayer({
    id: "snap-elite-stations-ring-2",
    type: "circle",
    source: "snap-elite-stations-source",
    paint: {
      "circle-radius": ["get", "ring2"],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.08,
      "circle-blur": 0.5,
    },
  });

  map.addLayer({
    id: "snap-elite-stations-ring-1",
    type: "circle",
    source: "snap-elite-stations-source",
    paint: {
      "circle-radius": ["get", "ring1"],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.16,
      "circle-blur": 0.2,
    },
  });

  map.addLayer({
    id: "snap-elite-stations-core",
    type: "circle",
    source: "snap-elite-stations-source",
    paint: {
      "circle-radius": ["get", "coreRadius"],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.96,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.4,
    },
  });

  map.addLayer({
    id: "snap-elite-stations-labels",
    type: "symbol",
    source: "snap-elite-stations-source",
    layout: {
      "text-field": [
        "format",
        ["get", "name"], { "font-scale": 1.0 },
        "\n", {},
        ["get", "live"], { "font-scale": 0.78 },
      ],
      "text-size": ["interpolate", ["linear"], ["zoom"], 6, 0, 8, 10, 12, 11, 15, 13],
      "text-offset": [0, 1.8],
      "text-anchor": "top",
      "text-allow-overlap": false,
      "text-ignore-placement": false,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(8,12,22,0.95)",
      "text-halo-width": 1.5,
      "text-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 9, 0.8, 13, 1],
    },
  });
}

export function updateSnapEliteStations(map: mapboxgl.Map, stations: SnapEliteStation[]) {
  const source = map.getSource("snap-elite-stations-source") as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(featureCollection(buildStationFeatures(stations)));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DRIVERS ELITE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function upsertSnapEliteDrivers(map: mapboxgl.Map, drivers: SnapEliteDriver[]) {
  safeRemoveLayer(map, "snap-elite-drivers-shadow");
  safeRemoveLayer(map, "snap-elite-drivers-core");
  safeRemoveLayer(map, "snap-elite-drivers-labels");
  safeRemoveSource(map, "snap-elite-drivers-source");

  map.addSource("snap-elite-drivers-source", {
    type: "geojson",
    data: featureCollection(buildDriverFeatures(drivers)),
  });

  map.addLayer({
    id: "snap-elite-drivers-shadow",
    type: "circle",
    source: "snap-elite-drivers-source",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 13, 10, 18, 16],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.14,
      "circle-blur": 0.8,
    },
  });

  map.addLayer({
    id: "snap-elite-drivers-core",
    type: "circle",
    source: "snap-elite-drivers-source",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 13, 5, 18, 8],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.98,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.2,
    },
  });

  map.addLayer({
    id: "snap-elite-drivers-labels",
    type: "symbol",
    source: "snap-elite-drivers-source",
    layout: {
      "text-field": ["get", "status"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 9, 16, 10],
      "text-offset": [0, 1.3],
      "text-anchor": "top",
    },
    paint: {
      "text-color": "#dbeafe",
      "text-halo-color": "rgba(8,12,22,0.95)",
      "text-halo-width": 1.2,
    },
  });
}

export function updateSnapEliteDrivers(map: mapboxgl.Map, drivers: SnapEliteDriver[]) {
  const source = map.getSource("snap-elite-drivers-source") as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(featureCollection(buildDriverFeatures(drivers)));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIGHTNING / STORM FLASH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ensureLightningOverlay(map: mapboxgl.Map) {
  const container = map.getContainer();
  let node = container.querySelector(".snap-elite-lightning") as HTMLDivElement | null;
  if (!node) {
    node = document.createElement("div");
    node.className = "snap-elite-lightning";
    node.style.position = "absolute";
    node.style.inset = "0";
    node.style.pointerEvents = "none";
    node.style.zIndex = "24";
    node.style.background = "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.85), rgba(255,255,255,0.08) 35%, rgba(255,255,255,0) 70%)";
    node.style.opacity = "0";
    node.style.transition = "opacity 140ms ease";
    container.appendChild(node);
  }
  return node;
}

export function triggerSnapLightning(map: mapboxgl.Map, flashes = 2) {
  const overlay = ensureLightningOverlay(map);
  let count = 0;
  const flash = () => {
    overlay.style.opacity = "0.95";
    window.setTimeout(() => {
      overlay.style.opacity = "0";
      count += 1;
      if (count < flashes) {
        window.setTimeout(flash, 120 + Math.random() * 220);
      }
    }, 90);
  };
  flash();
}

export function autoStormLightning(map: mapboxgl.Map, stations: SnapEliteStation[]) {
  const strongest = Math.max(...stations.map((s) => s.intensity ?? 0), 0);
  if (strongest >= 0.85 && Math.random() > 0.72) {
    triggerSnapLightning(map, 1 + Math.floor(Math.random() * 2));
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIDE PANEL LIVE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildStationCard(s: SnapEliteStation) {
  return `
    <div style="border:1px solid rgba(255,255,255,0.08);background:rgba(15,23,42,0.78);backdrop-filter:blur(12px);border-radius:16px;padding:12px;margin-bottom:10px;color:white;box-shadow:0 8px 30px rgba(0,0,0,0.22)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-weight:700;font-size:14px">${s.name}</div>
        <div style="font-size:10px;font-weight:700;padding:3px 7px;border-radius:999px;background:${stationColor(s.intensity ?? 0.3)};color:white">${s.live ? "LIVE" : "FEED"}</div>
      </div>
      <div style="font-size:12px;opacity:.92;margin-bottom:4px">Condition: ${s.condition ?? "-"}</div>
      <div style="font-size:12px;opacity:.92;margin-bottom:4px">Temp: ${s.temperature ?? "-"}°C</div>
      <div style="font-size:12px;opacity:.92;margin-bottom:4px">Humidity: ${s.humidity ?? "-"}%</div>
      <div style="font-size:12px;opacity:.92;margin-bottom:4px">Wind: ${s.windSpeed ?? "-"} km/h</div>
      <div style="font-size:12px;opacity:.92">Rain: ${s.rainfallMm ?? "-"} mm</div>
    </div>
  `;
}

export function renderSnapEliteSidePanel(map: mapboxgl.Map, stations: SnapEliteStation[]) {
  const state = getState(map);
  const container = map.getContainer();

  if (!state.sidePanel) {
    const panel = document.createElement("div");
    panel.className = "snap-elite-side-panel";
    panel.style.position = "absolute";
    panel.style.top = "14px";
    panel.style.right = "14px";
    panel.style.width = "270px";
    panel.style.maxHeight = "calc(100% - 28px)";
    panel.style.overflowY = "auto";
    panel.style.zIndex = "25";
    panel.style.pointerEvents = "auto";
    panel.style.padding = "0";
    state.sidePanel = panel;
    container.appendChild(panel);
  }

  const sorted = [...stations].sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0)).slice(0, 6);
  state.sidePanel.innerHTML = `
    <div style="margin-bottom:10px;padding:10px 12px;border-radius:18px;background:rgba(8,12,22,0.72);color:white;font-weight:800;font-size:13px;letter-spacing:.2px;backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.08)">
      RADAR LIVE STATIONS
    </div>
    ${sorted.map(buildStationCard).join("")}
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CINEMA ZOOM FEEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function applySnapEliteCameraFeel(map: mapboxgl.Map) {
  map.easeTo({ pitch: 58, bearing: -18, duration: 1600, essential: true });
}

export function smartSnapZoom(map: mapboxgl.Map, mode: "city" | "district" | "street") {
  if (mode === "city") {
    map.easeTo({ zoom: 9.8, pitch: 44, bearing: -12, duration: 1300 });
  } else if (mode === "district") {
    map.easeTo({ zoom: 12.8, pitch: 54, bearing: -18, duration: 1300 });
  } else {
    map.easeTo({ zoom: 15.8, pitch: 62, bearing: -24, duration: 1300 });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PULSE ANIMATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function animateSnapElitePulse(map: mapboxgl.Map) {
  const state = getState(map);
  let t = 0;

  const loop = () => {
    t += 0.05;
    if (map.getLayer("snap-elite-stations-ring-1")) {
      map.setPaintProperty("snap-elite-stations-ring-1", "circle-opacity", 0.14 + (Math.sin(t) + 1) * 0.05);
    }
    if (map.getLayer("snap-elite-stations-ring-2")) {
      map.setPaintProperty("snap-elite-stations-ring-2", "circle-opacity", 0.05 + (Math.sin(t * 0.8) + 1) * 0.03);
    }
    if (map.getLayer("snap-elite-drivers-shadow")) {
      map.setPaintProperty("snap-elite-drivers-shadow", "circle-opacity", 0.1 + (Math.sin(t * 1.15) + 1) * 0.05);
    }
    state.pulseFrame = requestAnimationFrame(loop);
  };

  if (state.pulseFrame) cancelAnimationFrame(state.pulseFrame);
  loop();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LABEL ADAPTIVE MODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function bindSnapEliteAdaptiveLabels(map: mapboxgl.Map) {
  const state = getState(map);
  if (state.labelZoomBound) return;

  const update = () => {
    const zoom = map.getZoom();
    if (map.getLayer("snap-elite-stations-labels")) {
      map.setLayoutProperty("snap-elite-stations-labels", "text-size", zoom < 8 ? 0 : zoom < 10 ? 10 : zoom < 13 ? 11 : 13);
    }
    if (map.getLayer("snap-elite-drivers-labels")) {
      map.setLayoutProperty("snap-elite-drivers-labels", "text-size", zoom < 12 ? 0 : zoom < 15 ? 9 : 10);
    }
  };

  map.on("zoom", update);
  update();
  state.labelZoomBound = true;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MASTER SNAP ELITE INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function initSnapElite(
  map: mapboxgl.Map,
  payload: {
    stations: SnapEliteStation[];
    drivers: SnapEliteDriver[];
    autoSidePanel?: boolean;
    autoLightning?: boolean;
    cameraMode?: "city" | "district" | "street";
  },
) {
  upsertSnapEliteStations(map, payload.stations);
  upsertSnapEliteDrivers(map, payload.drivers);
  animateSnapElitePulse(map);
  bindSnapEliteAdaptiveLabels(map);

  if (payload.autoSidePanel !== false) {
    renderSnapEliteSidePanel(map, payload.stations);
  }
  if (payload.autoLightning !== false) {
    autoStormLightning(map, payload.stations);
  }
  smartSnapZoom(map, payload.cameraMode ?? "district");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLEANUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function destroySnapElite(map: mapboxgl.Map) {
  const state = getState(map);
  if (state.pulseFrame) cancelAnimationFrame(state.pulseFrame);

  const lightning = map.getContainer().querySelector(".snap-elite-lightning");
  if (lightning?.parentNode) lightning.parentNode.removeChild(lightning);
  if (state.sidePanel?.parentNode) state.sidePanel.parentNode.removeChild(state.sidePanel);

  [
    "snap-elite-stations-ring-2", "snap-elite-stations-ring-1",
    "snap-elite-stations-core", "snap-elite-stations-labels",
    "snap-elite-drivers-shadow", "snap-elite-drivers-core",
    "snap-elite-drivers-labels",
  ].forEach((id) => safeRemoveLayer(map, id));

  ["snap-elite-stations-source", "snap-elite-drivers-source"].forEach((id) => safeRemoveSource(map, id));

  SNAP_ELITE.delete(map);
}
