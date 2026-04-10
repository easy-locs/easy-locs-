/**
 * Map God Engine — Premium Mapbox layer stack with 3D buildings,
 * weather, shops, drivers, order routes, and cinematic camera.
 */
import mapboxgl from "mapbox-gl";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type LngLat = [number, number];

type DriverPoint = {
  id: string;
  lng: number;
  lat: number;
  heading?: number;
  speed?: number;
  status?: "idle" | "busy" | "delivering";
};

type OrderRoute = {
  id: string;
  coordinates: LngLat[];
  status?: "pending" | "accepted" | "picked_up" | "delivered";
};

type ShopPoint = {
  id: string;
  lng: number;
  lat: number;
  name: string;
  category?: string;
};

type UserPoint = {
  id: string;
  lng: number;
  lat: number;
};

type RadarMapGodOptions = {
  shops?: ShopPoint[];
  drivers?: DriverPoint[];
  users?: UserPoint[];
  orderRoutes?: OrderRoute[];
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function safeRemoveLayer(map: mapboxgl.Map, id: string) {
  if (map.getLayer(id)) map.removeLayer(id);
}

function safeRemoveSource(map: mapboxgl.Map, id: string) {
  if (map.getSource(id)) map.removeSource(id);
}

function featureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features };
}

function zoomFade(zoom: number, start: number, end: number) {
  if (zoom <= start) return 0;
  if (zoom >= end) return 1;
  return (zoom - start) / (end - start);
}

function driverColor(status?: string) {
  switch (status) {
    case "busy": return "#ff9500";
    case "delivering": return "#22c55e";
    default: return "#00d4ff";
  }
}

function routeColor(status?: string) {
  switch (status) {
    case "delivered": return "#22c55e";
    case "picked_up": return "#f59e0b";
    case "accepted": return "#38bdf8";
    default: return "#a855f7";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOURCE BUILDERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildShopFeatures(shops: ShopPoint[] = []): GeoJSON.Feature[] {
  return shops.map((shop) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [shop.lng, shop.lat] },
    properties: { id: shop.id, name: shop.name, category: shop.category ?? "shop" },
  }));
}

function buildUserFeatures(users: UserPoint[] = []): GeoJSON.Feature[] {
  return users.map((user) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [user.lng, user.lat] },
    properties: { id: user.id, kind: "user" },
  }));
}

function buildDriverFeatures(drivers: DriverPoint[] = []): GeoJSON.Feature[] {
  return drivers.map((driver) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [driver.lng, driver.lat] },
    properties: {
      id: driver.id,
      heading: driver.heading ?? 0,
      speed: driver.speed ?? 0,
      status: driver.status ?? "idle",
      color: driverColor(driver.status),
    },
  }));
}

function buildRouteFeatures(routes: OrderRoute[] = []): GeoJSON.Feature[] {
  return routes.map((route) => ({
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: route.coordinates },
    properties: { id: route.id, status: route.status ?? "pending", color: routeColor(route.status) },
  }));
}

function buildDriverTrailFeatures(drivers: DriverPoint[] = []): GeoJSON.Feature[] {
  return drivers
    .filter((d) => Number.isFinite(d.heading))
    .map((driver) => {
      const heading = (driver.heading ?? 0) * (Math.PI / 180);
      const distance = 0.0025;
      const dx = Math.sin(heading) * distance;
      const dy = Math.cos(heading) * distance;
      return {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [driver.lng - dx, driver.lat - dy],
            [driver.lng, driver.lat],
          ],
        },
        properties: { id: driver.id, status: driver.status ?? "idle", color: driverColor(driver.status) },
      };
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CANONICAL CLEANUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function cleanupMapGod(map: mapboxgl.Map) {
  [
    "selection-ring", "order-routes", "driver-trails", "drivers-points",
    "users-points", "shops-points", "shops-clusters", "shops-cluster-count",
    "weather-stations-pulse", "weather-stations-core", "weather-heat",
    "weather-radar", "road-glow", "3d-buildings",
  ].forEach((id) => safeRemoveLayer(map, id));

  [
    "order-routes-source", "driver-trails-source", "drivers-source",
    "users-source", "shops-source", "weather-source",
  ].forEach((id) => safeRemoveSource(map, id));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3D BUILDINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function add3DBuildings(map: mapboxgl.Map) {
  if (map.getLayer("3d-buildings")) return;

  const labelLayerId = map
    .getStyle()
    .layers?.find((l) => l.type === "symbol" && (l.layout as any)?.["text-field"])?.id;

  map.addLayer(
    {
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": ["interpolate", ["linear"], ["zoom"], 14, "#1f2937", 18, "#334155"],
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["get", "height"]],
        "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["get", "min_height"]],
        "fill-extrusion-opacity": 0.82,
      },
    },
    labelLayerId,
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROAD GLOW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addRoadGlow(map: mapboxgl.Map) {
  if (map.getLayer("road-glow")) return;

  map.addLayer({
    id: "road-glow",
    type: "line",
    source: "composite",
    "source-layer": "road",
    minzoom: 10,
    paint: {
      "line-color": "#38bdf8",
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 14, 1.2, 18, 3.2],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.08, 14, 0.16, 18, 0.28],
      "line-blur": 1.5,
    },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEATHER CANONICAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addWeatherSource(map: mapboxgl.Map, points: LngLat[] = []) {
  safeRemoveSource(map, "weather-source");
  map.addSource("weather-source", {
    type: "geojson",
    data: featureCollection(
      points.map((p, i) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: p },
        properties: { id: `station-${i}` },
      })),
    ),
  });
}

export function addWeatherHeat(map: mapboxgl.Map) {
  if (map.getLayer("weather-heat")) return;
  map.addLayer({
    id: "weather-heat",
    type: "heatmap",
    source: "weather-source",
    maxzoom: 13,
    paint: {
      "heatmap-weight": 1,
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.4, 9, 0.8, 13, 1.2],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 10, 9, 25, 13, 40],
      "heatmap-opacity": 0.4,
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(0,0,0,0)",
        0.2, "rgba(56,189,248,0.18)",
        0.4, "rgba(34,197,94,0.22)",
        0.6, "rgba(250,204,21,0.28)",
        0.8, "rgba(249,115,22,0.32)",
        1, "rgba(239,68,68,0.38)",
      ],
    },
  });
}

export function addWeatherStations(map: mapboxgl.Map) {
  if (!map.getLayer("weather-stations-core")) {
    map.addLayer({
      id: "weather-stations-core",
      type: "circle",
      source: "weather-source",
      minzoom: 8,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 14, 5.5, 18, 8.5],
        "circle-color": "#38bdf8",
        "circle-opacity": 0.9,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.2,
      },
    });
  }

  if (!map.getLayer("weather-stations-pulse")) {
    map.addLayer({
      id: "weather-stations-pulse",
      type: "circle",
      source: "weather-source",
      minzoom: 8,
      paint: {
        "circle-radius": 8,
        "circle-color": "#38bdf8",
        "circle-opacity": 0.15,
        "circle-stroke-width": 0,
      },
    });
  }
}

export function animateWeatherStations(map: mapboxgl.Map) {
  let t = 0;
  function pulse() {
    if (!map.getLayer("weather-stations-pulse")) return;
    t += 0.035;
    const radius = 8 + Math.sin(t) * 4;
    const opacity = 0.12 + (Math.sin(t) + 1) * 0.06;
    map.setPaintProperty("weather-stations-pulse", "circle-radius", radius);
    map.setPaintProperty("weather-stations-pulse", "circle-opacity", opacity);
    requestAnimationFrame(pulse);
  }
  pulse();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOPS CANONICAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addShops(map: mapboxgl.Map, shops: ShopPoint[]) {
  safeRemoveSource(map, "shops-source");
  map.addSource("shops-source", {
    type: "geojson",
    data: featureCollection(buildShopFeatures(shops)),
    cluster: true,
    clusterRadius: 45,
    clusterMaxZoom: 14,
  });

  map.addLayer({
    id: "shops-clusters",
    type: "circle",
    source: "shops-source",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ["step", ["get", "point_count"], "#38bdf8", 10, "#22c55e", 25, "#f59e0b", 50, "#ef4444"],
      "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 24, 50, 30],
      "circle-opacity": 0.9,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    },
  });

  map.addLayer({
    id: "shops-cluster-count",
    type: "symbol",
    source: "shops-source",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    },
    paint: { "text-color": "#ffffff" },
  });

  map.addLayer({
    id: "shops-points",
    type: "circle",
    source: "shops-source",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 6, 18, 8],
      "circle-color": "#22c55e",
      "circle-opacity": 0.95,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.4,
    },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USERS CANONICAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addUsers(map: mapboxgl.Map, users: UserPoint[]) {
  safeRemoveSource(map, "users-source");
  map.addSource("users-source", {
    type: "geojson",
    data: featureCollection(buildUserFeatures(users)),
  });

  map.addLayer({
    id: "users-points",
    type: "circle",
    source: "users-source",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 5, 18, 7],
      "circle-color": "#ffffff",
      "circle-opacity": 0.95,
      "circle-stroke-color": "#0f172a",
      "circle-stroke-width": 1.3,
    },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DRIVERS CANONICAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addDrivers(map: mapboxgl.Map, drivers: DriverPoint[]) {
  safeRemoveSource(map, "drivers-source");
  safeRemoveSource(map, "driver-trails-source");

  map.addSource("drivers-source", {
    type: "geojson",
    data: featureCollection(buildDriverFeatures(drivers)),
  });

  map.addSource("driver-trails-source", {
    type: "geojson",
    data: featureCollection(buildDriverTrailFeatures(drivers)),
  });

  map.addLayer({
    id: "driver-trails",
    type: "line",
    source: "driver-trails-source",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 15, 2.5, 18, 4],
      "line-opacity": 0.35,
      "line-blur": 0.8,
    },
  });

  map.addLayer({
    id: "drivers-points",
    type: "circle",
    source: "drivers-source",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 7, 18, 10],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.95,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.6,
    },
  });
}

export function animateDrivers(map: mapboxgl.Map) {
  let tick = 0;
  function animate() {
    if (!map.getLayer("drivers-points")) return;
    tick += 0.03;
    const zoom = map.getZoom();
    const pulseBoost = 0.5 + Math.sin(tick) * 0.5;
    const base = 4 + zoomFade(zoom, 8, 18) * 6;
    const radius = base + pulseBoost * 1.5;
    map.setPaintProperty("drivers-points", "circle-radius", radius);
    requestAnimationFrame(animate);
  }
  animate();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ORDER ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function addOrderRoutes(map: mapboxgl.Map, routes: OrderRoute[]) {
  safeRemoveSource(map, "order-routes-source");
  map.addSource("order-routes-source", {
    type: "geojson",
    data: featureCollection(buildRouteFeatures(routes)),
  });

  map.addLayer({
    id: "order-routes",
    type: "line",
    source: "order-routes-source",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 14, 4, 18, 6],
      "line-opacity": 0.72,
      "line-blur": 0.3,
    },
  });
}

export function animateOrderRoutes(map: mapboxgl.Map) {
  let t = 0;
  function loop() {
    if (!map.getLayer("order-routes")) return;
    t += 0.04;
    const opacity = 0.56 + ((Math.sin(t) + 1) / 2) * 0.24;
    map.setPaintProperty("order-routes", "line-opacity", opacity);
    requestAnimationFrame(loop);
  }
  loop();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAP CAMERA / CINEMA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function enablePremiumCamera(map: mapboxgl.Map) {
  map.setPitch(55);
  map.setBearing(-18);
}

export function applyZoomLOD(map: mapboxgl.Map) {
  const update = () => {
    const z = map.getZoom();
    if (map.getLayer("weather-heat")) {
      map.setPaintProperty("weather-heat", "heatmap-opacity", 0.35 * (1 - zoomFade(z, 10, 13)));
    }
    if (map.getLayer("shops-clusters")) {
      map.setPaintProperty("shops-clusters", "circle-opacity", 0.92 * (1 - zoomFade(z, 15, 17)));
    }
    if (map.getLayer("shops-points")) {
      map.setPaintProperty("shops-points", "circle-opacity", 0.8 + zoomFade(z, 12, 16) * 0.15);
    }
    if (map.getLayer("drivers-points")) {
      map.setPaintProperty("drivers-points", "circle-opacity", 0.85 + zoomFade(z, 11, 16) * 0.1);
    }
  };
  map.on("zoom", update);
  update();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MASTER INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function initMapGodEngine(
  map: mapboxgl.Map,
  weatherStations: LngLat[] = [],
  options: RadarMapGodOptions = {},
) {
  cleanupMapGod(map);
  add3DBuildings(map);
  addRoadGlow(map);
  addWeatherSource(map, weatherStations);
  addWeatherHeat(map);
  addWeatherStations(map);
  addShops(map, options.shops ?? []);
  addUsers(map, options.users ?? []);
  addDrivers(map, options.drivers ?? []);
  addOrderRoutes(map, options.orderRoutes ?? []);
  animateWeatherStations(map);
  animateDrivers(map);
  animateOrderRoutes(map);
  enablePremiumCamera(map);
  applyZoomLOD(map);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIVE UPDATE API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function updateDrivers(map: mapboxgl.Map, drivers: DriverPoint[]) {
  const source = map.getSource("drivers-source") as mapboxgl.GeoJSONSource | undefined;
  const trailSource = map.getSource("driver-trails-source") as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(featureCollection(buildDriverFeatures(drivers)));
  if (trailSource) trailSource.setData(featureCollection(buildDriverTrailFeatures(drivers)));
}

export function updateRoutes(map: mapboxgl.Map, routes: OrderRoute[]) {
  const source = map.getSource("order-routes-source") as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(featureCollection(buildRouteFeatures(routes)));
}

export function updateShops(map: mapboxgl.Map, shops: ShopPoint[]) {
  const source = map.getSource("shops-source") as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(featureCollection(buildShopFeatures(shops)));
}

export function updateUsers(map: mapboxgl.Map, users: UserPoint[]) {
  const source = map.getSource("users-source") as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(featureCollection(buildUserFeatures(users)));
}

// Re-export types for consumers
export type { LngLat, DriverPoint, OrderRoute, ShopPoint, UserPoint, RadarMapGodOptions };
