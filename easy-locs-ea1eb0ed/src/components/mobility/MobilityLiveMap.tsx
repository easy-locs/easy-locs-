import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";
import type mapboxglModule from "mapbox-gl";
import { loadMapbox } from "@/lib/mapbox/mapbox-loader";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";

type MapboxGL = typeof mapboxglModule;

export interface MobilityLiveMapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitRoute: () => void;
}

interface MobilityLiveMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  driverLat?: number | null;
  driverLng?: number | null;
  mode?: "taxi" | "delivery";
  nearbyRiders?: number;
  className?: string;
  fullScreen?: boolean;
  bottomPadding?: number;
}

function generateNearby(lat: number, lng: number, count: number) {
  const positions: { lat: number; lng: number; id: number; heading: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count + Math.random() * 0.5;
    const dist = (Math.random() * 0.7 + 0.3) * 2;
    const dLat = (dist / 111) * Math.cos(angle);
    const dLng = (dist / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    positions.push({ lat: lat + dLat, lng: lng + dLng, id: i, heading: Math.random() * 360 });
  }
  return positions;
}

const SVG_CAR = (heading: number) => `
<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));transition:transform 2s ease-in-out;">
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="transform:rotate(${heading}deg);transition:transform 2s ease-in-out;">
    <path d="M5 17h1a2 2 0 0 0 4 0h4a2 2 0 0 0 4 0h1a1 1 0 0 0 1-1v-4.5l-2.6-5.2A2 2 0 0 0 15.6 5H8.4a2 2 0 0 0-1.8 1.1L4 11.5V16a1 1 0 0 0 1 1z" fill="hsl(220,15%,18%)" stroke="hsl(142,71%,45%)" stroke-width="1.5"/>
    <circle cx="7.5" cy="17" r="1.5" fill="hsl(142,71%,45%)"/>
    <circle cx="16.5" cy="17" r="1.5" fill="hsl(142,71%,45%)"/>
    <path d="M5.5 11.5L7.5 7h9l2 4.5H5.5z" fill="hsl(200,20%,30%)" stroke="hsl(142,71%,45%)" stroke-width="0.5" opacity="0.6"/>
  </svg>
</div>`;

const SVG_PICKUP = `
<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
  <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:hsl(142,71%,45%,0.2);animation:taxi-pulse 2s ease-in-out infinite;"></div>
  <div style="width:18px;height:18px;border-radius:50%;background:hsl(142,71%,45%);border:3px solid white;box-shadow:0 2px 12px rgba(34,197,94,0.5);"></div>
</div>`;

const SVG_DROPOFF = `
<div style="position:relative;width:40px;height:48px;display:flex;flex-direction:column;align-items:center;">
  <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="hsl(var(--accent))"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
    <path d="M10 10l2-2 2 2v4l-2 2-2-2v-4z" fill="hsl(var(--accent))"/>
  </svg>
</div>`;

const SVG_DRIVER = `
<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
  <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:hsl(38,65%,56%,0.2);animation:taxi-pulse 2s ease-in-out infinite;"></div>
  <div style="width:24px;height:24px;border-radius:50%;background:hsl(38,65%,56%);border:3px solid white;box-shadow:0 2px 12px rgba(212,175,55,0.5);"></div>
</div>`;

const PULSE_STYLE = `
@keyframes taxi-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.6); opacity: 0; }
}
@keyframes taxi-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

export const MobilityLiveMap = forwardRef<MobilityLiveMapHandle, MobilityLiveMapProps>(function MobilityLiveMapInner({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  driverLat,
  driverLng,
  mode = "taxi",
  nearbyRiders = 4,
  className,
  fullScreen = false,
  bottomPadding = 0,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxglModule.Map | null>(null);
  const mapboxglRef = useRef<MapboxGL | null>(null);
  const mapReadyRef = useRef(false);
  const riderMarkersRef = useRef<mapboxglModule.Marker[]>([]);
  const pickupMarkerRef = useRef<mapboxglModule.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxglModule.Marker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeAnimRef = useRef<number | null>(null);
  const hasRouteRef = useRef(false);
  const routeFetchControllerRef = useRef<AbortController | null>(null);
  const driverMarkerRef = useRef<mapboxglModule.Marker | null>(null);

  const centerLat = driverLat ?? pickupLat ?? 25.2048;
  const centerLng = driverLng ?? pickupLng ?? 55.2708;

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom?: number) => {
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) return;
      map.flyTo({ center: [lng, lat], zoom: zoom ?? 15, duration: 1200 });
    },
    fitRoute: () => {
      const map = mapRef.current;
      const mgl = mapboxglRef.current;
      if (!map || !mgl || !mapReadyRef.current) return;
      if (pickupLat == null || pickupLng == null) return;
      const bounds = new mgl.LngLatBounds();
      if (driverLat != null && driverLng != null) bounds.extend([driverLng, driverLat]);
      bounds.extend([pickupLng, pickupLat]);
      if (dropoffLat != null && dropoffLng != null) bounds.extend([dropoffLng, dropoffLat]);
      map.fitBounds(bounds, { padding: { top: 80, bottom: bottomPadding + 40, left: 40, right: 40 }, maxZoom: 14, duration: 800 });
    },
  }), [pickupLat, pickupLng, dropoffLat, dropoffLng, driverLat, driverLng, bottomPadding]);

  const [mapError, setMapError] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  const injectStyles = useCallback(() => {
    if (document.getElementById("taxi-map-styles")) return;
    const style = document.createElement("style");
    style.id = "taxi-map-styles";
    style.textContent = PULSE_STYLE;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    injectStyles();
  }, [injectStyles]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    if (!MAPBOX_ACCESS_TOKEN?.trim()) {
      setMapError(true);
      setMapLoading(false);
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) { setMapError(true); setMapLoading(false); return; }
    } catch { setMapError(true); setMapLoading(false); return; }

    loadMapbox().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      mapboxglRef.current = mapboxgl;

      let map: mapboxgl.Map;
      try {
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [centerLng, centerLat],
          zoom: 13,
          attributionControl: false,
          interactive: true,
        });
      } catch {
        setMapError(true);
        setMapLoading(false);
        return;
      }

      mapRef.current = map;

      map.on("error", (e) => {
        const msg = ((e.error?.message as string) ?? "").toLowerCase();
        if (msg.includes("access token") || msg.includes("unauthorized") || msg.includes("401")) {
          setMapError(true);
          setMapLoading(false);
        }
      });

      map.on("load", () => {
        if (cancelled) return;
        setMapLoading(false);
        mapReadyRef.current = true;
      });
    }).catch(() => {
      setMapError(true);
      setMapLoading(false);
    });

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      hasRouteRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (routeAnimRef.current) cancelAnimationFrame(routeAnimRef.current);
      if (routeFetchControllerRef.current) routeFetchControllerRef.current.abort();
      riderMarkersRef.current.forEach(m => m.remove());
      riderMarkersRef.current = [];
      pickupMarkerRef.current?.remove();
      dropoffMarkerRef.current?.remove();
      driverMarkerRef.current?.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mgl = mapboxglRef.current;
    if (!map || !mgl || !mapReadyRef.current) return;

    const markerLat = pickupLat ?? centerLat;
    const markerLng = pickupLng ?? centerLng;

    if (pickupLat != null && pickupLng != null) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLngLat([markerLng, markerLat]);
      } else {
        const pickupEl = document.createElement("div");
        pickupEl.innerHTML = SVG_PICKUP;
        pickupMarkerRef.current = new mgl.Marker(pickupEl).setLngLat([markerLng, markerLat]).addTo(map);
      }
    } else if (driverLat == null && driverLng == null) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLngLat([markerLng, markerLat]);
      } else {
        const pickupEl = document.createElement("div");
        pickupEl.innerHTML = SVG_PICKUP;
        pickupMarkerRef.current = new mgl.Marker(pickupEl).setLngLat([markerLng, markerLat]).addTo(map);
      }
    } else {
      if (pickupMarkerRef.current) { pickupMarkerRef.current.remove(); pickupMarkerRef.current = null; }
    }

    map.easeTo({ center: [centerLng, centerLat], duration: 500 });
  }, [centerLat, centerLng, pickupLat, pickupLng, driverLat, driverLng, mapLoading]);

  useEffect(() => {
    const map = mapRef.current;
    const mgl = mapboxglRef.current;
    if (!map || !mgl || !mapReadyRef.current) return;
    if (driverLat == null || driverLng == null) {
      if (driverMarkerRef.current) { driverMarkerRef.current.remove(); driverMarkerRef.current = null; }
      return;
    }
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([driverLng, driverLat]);
    } else {
      const el = document.createElement("div");
      el.innerHTML = SVG_DRIVER;
      driverMarkerRef.current = new mgl.Marker(el).setLngLat([driverLng, driverLat]).addTo(map);
    }
  }, [driverLat, driverLng, mapLoading]);

  useEffect(() => {
    const map = mapRef.current;
    const mgl = mapboxglRef.current;
    if (!map || !mgl || !mapReadyRef.current) return;

    if (routeAnimRef.current) {
      cancelAnimationFrame(routeAnimRef.current);
      routeAnimRef.current = null;
    }
    if (routeFetchControllerRef.current) {
      routeFetchControllerRef.current.abort();
      routeFetchControllerRef.current = null;
    }

    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove();
      dropoffMarkerRef.current = null;
    }

    ["route-line", "route-line-bg", "route-line-glow"].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource("route")) map.removeSource("route");
    hasRouteRef.current = false;

    if (dropoffLat == null || dropoffLng == null) return;

    const dropEl = document.createElement("div");
    dropEl.innerHTML = SVG_DROPOFF;
    dropoffMarkerRef.current = new mgl.Marker({ element: dropEl, anchor: "bottom" }).setLngLat([dropoffLng, dropoffLat]).addTo(map);

    const routeStartLat = pickupLat ?? centerLat;
    const routeStartLng = pickupLng ?? centerLng;

    const bounds = new mgl.LngLatBounds();
    if (driverLat != null && driverLng != null) bounds.extend([driverLng, driverLat]);
    bounds.extend([routeStartLng, routeStartLat]);
    bounds.extend([dropoffLng, dropoffLat]);
    map.fitBounds(bounds, {
      padding: { top: 80, bottom: bottomPadding + 40, left: 40, right: 40 },
      maxZoom: 14,
    });

    const controller = new AbortController();
    routeFetchControllerRef.current = controller;

    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${routeStartLng},${routeStartLat};${dropoffLng},${dropoffLat}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`,
      { signal: controller.signal }
    )
      .then(r => r.json())
      .then(data => {
        if (controller.signal.aborted) return;
        const route = data.routes?.[0]?.geometry;
        if (!route) return;

        map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: route } });

        map.addLayer({
          id: "route-line-glow", type: "line", source: "route",
          paint: { "line-color": "hsl(168, 72%, 44%)", "line-width": 10, "line-opacity": 0.15, "line-blur": 8 },
        });
        map.addLayer({
          id: "route-line-bg", type: "line", source: "route",
          paint: { "line-color": "hsl(220, 40%, 18%)", "line-width": 6, "line-opacity": 0.4 },
        });
        map.addLayer({
          id: "route-line", type: "line", source: "route",
          paint: {
            "line-color": "hsl(168, 72%, 44%)",
            "line-width": 3.5,
            "line-opacity": 0.9,
            "line-dasharray": [0, 4, 3],
          },
        });

        hasRouteRef.current = true;
        let dashStep = 0;
        const animateDash = () => {
          if (controller.signal.aborted) return;
          dashStep = (dashStep + 1) % 120;
          const t = dashStep / 120;
          const dashLen = 2 + t * 6;
          const gapLen = 2 + (1 - t) * 2;
          if (map.getLayer("route-line")) {
            map.setPaintProperty("route-line", "line-dasharray", [dashLen, gapLen]);
          }
          routeAnimRef.current = requestAnimationFrame(animateDash);
        };
        routeAnimRef.current = requestAnimationFrame(animateDash);
      })
      .catch(() => {});
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, mapLoading]);

  useEffect(() => {
    const map = mapRef.current;
    const mgl = mapboxglRef.current;
    if (!map || !mgl || !mapReadyRef.current) return;

    riderMarkersRef.current.forEach(m => m.remove());
    riderMarkersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const riders = generateNearby(centerLat, centerLng, nearbyRiders);
    const riderMarkers: mapboxglModule.Marker[] = [];

    riders.forEach((r) => {
      const el = document.createElement("div");
      el.innerHTML = SVG_CAR(r.heading);
      el.style.transition = "transform 2s ease-in-out";
      const marker = new mgl.Marker(el).setLngLat([r.lng, r.lat]).addTo(map);
      riderMarkers.push(marker);
    });

    riderMarkersRef.current = riderMarkers;

    intervalRef.current = setInterval(() => {
      riderMarkers.forEach((marker) => {
        const lngLat = marker.getLngLat();
        const dLng = (Math.random() - 0.5) * 0.003;
        const dLat = (Math.random() - 0.5) * 0.003;
        const heading = Math.atan2(dLng, dLat) * (180 / Math.PI);
        const el = marker.getElement();
        const svg = el.querySelector("svg");
        if (svg) svg.style.transform = `rotate(${Math.round(heading)}deg)`;
        marker.setLngLat([lngLat.lng + dLng, lngLat.lat + dLat]);
      });
    }, 3000);

    return () => {
      riderMarkers.forEach(m => m.remove());
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [centerLat, centerLng, nearbyRiders, mode, mapLoading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || mode !== "delivery") return;

    const DEMAND_SOURCE = "demand-zones";
    const DEMAND_LAYER = "demand-zones-fill";

    if (map.getLayer(DEMAND_LAYER)) map.removeLayer(DEMAND_LAYER);
    if (map.getSource(DEMAND_SOURCE)) map.removeSource(DEMAND_SOURCE);

    const zones = [
      { lat: centerLat + 0.008, lng: centerLng - 0.005, intensity: 0.7 },
      { lat: centerLat - 0.006, lng: centerLng + 0.008, intensity: 0.5 },
      { lat: centerLat + 0.003, lng: centerLng + 0.012, intensity: 0.9 },
      { lat: centerLat - 0.01, lng: centerLng - 0.003, intensity: 0.4 },
    ];

    const features = zones.map((z) => {
      const steps = 32;
      const radiusKm = 0.4 + z.intensity * 0.3;
      const coords: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const angle = (2 * Math.PI * i) / steps;
        const dLat = (radiusKm / 111) * Math.cos(angle);
        const dLng = (radiusKm / (111 * Math.cos((z.lat * Math.PI) / 180))) * Math.sin(angle);
        coords.push([z.lng + dLng, z.lat + dLat]);
      }
      return {
        type: "Feature" as const,
        properties: { intensity: z.intensity },
        geometry: { type: "Polygon" as const, coordinates: [coords] },
      };
    });

    map.addSource(DEMAND_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    map.addLayer({
      id: DEMAND_LAYER,
      type: "fill",
      source: DEMAND_SOURCE,
      paint: {
        "fill-color": [
          "interpolate", ["linear"], ["get", "intensity"],
          0.3, "hsl(142, 60%, 50%)",
          0.6, "hsl(38, 65%, 56%)",
          0.9, "hsl(0, 70%, 55%)",
        ],
        "fill-opacity": ["interpolate", ["linear"], ["get", "intensity"], 0.3, 0.08, 0.9, 0.2],
      },
    });

    return () => {
      if (map.getLayer(DEMAND_LAYER)) map.removeLayer(DEMAND_LAYER);
      if (map.getSource(DEMAND_SOURCE)) map.removeSource(DEMAND_SOURCE);
    };
  }, [centerLat, centerLng, mode, mapLoading]);

  useEffect(() => {
    const map = mapRef.current;
    const mgl = mapboxglRef.current;
    if (!map || !mgl || !hasRouteRef.current) return;
    if (dropoffLat == null || dropoffLng == null) return;

    const bounds = new mgl.LngLatBounds();
    bounds.extend([centerLng, centerLat]);
    bounds.extend([dropoffLng, dropoffLat]);
    map.fitBounds(bounds, {
      padding: { top: 80, bottom: bottomPadding + 40, left: 40, right: 40 },
      maxZoom: 14,
      duration: 500,
    });
  }, [bottomPadding]);

  if (fullScreen) {
    return (
      <div
        className="absolute inset-0 w-full h-full"
        style={{ background: "hsl(220, 15%, 10%)" }}
      >
        {mapError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="text-2xl mb-2">📍</span>
            <p className="text-sm font-semibold text-foreground">Live Map</p>
            <p className="text-xs text-muted-foreground">Riders are being tracked in your area</p>
          </div>
        ) : (
          <>
            {mapLoading && (
              <div className="absolute inset-0 z-10"
                style={{
                  background: "linear-gradient(90deg, hsl(220 15% 10%) 0%, hsl(220 15% 14%) 50%, hsl(220 15% 10%) 100%)",
                  backgroundSize: "200% 100%",
                  animation: "taxi-shimmer 1.5s ease-in-out infinite",
                }}
              />
            )}
            <div ref={containerRef} className="absolute inset-0 w-full h-full" />
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("relative rounded-2xl border border-border/30 overflow-hidden", className)}
      style={{ minHeight: 180, background: "hsl(220, 15%, 10%)" }}
    >
      {mapError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <span className="text-2xl mb-2">📍</span>
          <p className="text-sm font-semibold text-foreground">Live Map</p>
          <p className="text-xs text-muted-foreground">Riders are being tracked in your area</p>
        </div>
      ) : (
        <>
          {mapLoading && (
            <div className="absolute inset-0 z-10"
              style={{
                background: "linear-gradient(90deg, hsl(220 15% 10%) 0%, hsl(220 15% 14%) 50%, hsl(220 15% 10%) 100%)",
                backgroundSize: "200% 100%",
                animation: "taxi-shimmer 1.5s ease-in-out infinite",
              }}
            />
          )}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        </>
      )}

      <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-card via-card/80 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">
              {nearbyRiders} {mode === "taxi" ? "drivers" : "riders"} nearby
            </span>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">Live</span>
        </div>
      </div>
    </div>
  );
});
