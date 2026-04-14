import { memo, useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN } from "@/lib/mapbox/config";
import { useInAppNavigation, type TransportMode } from "@/stores/useInAppNavigation";
import { useGeoStore } from "@/lib/geo/geo-store";
import { getDirections, openExternalMaps } from "@/lib/location/geocode";
import { formatDistance, formatETA } from "@/lib/geo/distance";
import { useI18nStore } from "@/domains/i18n/i18n.store";
import * as voiceEngine from "@/lib/navigation/navigation-voice-engine";
import * as instructionTrigger from "@/lib/navigation/instruction-trigger";
import { X, Navigation, Locate, ExternalLink, Car, Footprints, Bike, Volume2, VolumeX } from "lucide-react";

const MODE_ICONS: Record<TransportMode, typeof Car> = {
  driving: Car,
  walking: Footprints,
  cycling: Bike,
};

function InAppNavigationViewInner() {
  const { open, lat, lng, label, mode, close } = useInAppNavigation();
  const userPoint = useGeoStore((s) => s.point);
  const locale = useI18nStore((s) => s.locale);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [activeMode, setActiveMode] = useState<TransportMode>(mode);
  const activeModeRef = useRef<TransportMode>(mode);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; etaMinutes: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(() => voiceEngine.isMuted());
  const fetchIdRef = useRef(0);
  const routeHashRef = useRef<string | null>(null);
  const voiceInitializedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setActiveMode(mode);
      activeModeRef.current = mode;
      setRouteInfo(null);
      setLoading(false);
      voiceEngine.start();
      setMuted(voiceEngine.isMuted());
      routeHashRef.current = null;
      voiceInitializedRef.current = false;
    } else {
      voiceEngine.stop();
      instructionTrigger.clearSteps();
      routeHashRef.current = null;
      voiceInitializedRef.current = false;
    }
    return () => {
      voiceEngine.stop();
      instructionTrigger.clearSteps();
      routeHashRef.current = null;
      voiceInitializedRef.current = false;
    };
  }, [open, mode]);

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    if (!open || !userPoint) return;
    instructionTrigger.updatePosition(userPoint.lat, userPoint.lng);
  }, [open, userPoint?.lat, userPoint?.lng]);

  const fetchRoute = useCallback(async (
    map: mapboxgl.Map,
    origin: { lat: number; lng: number },
    dest: { lat: number; lng: number },
    transportMode: TransportMode,
  ) => {
    const requestId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const result = await getDirections(origin, dest, transportMode, locale);
      if (requestId !== fetchIdRef.current) return;
      if (!result) { setLoading(false); return; }

      const distanceKm = result.distance_m / 1000;
      const etaMinutes = Math.max(1, Math.round(result.duration_s / 60));
      setRouteInfo({ distanceKm, etaMinutes });

      const routeKey = `${transportMode}_${dest.lat.toFixed(5)}_${dest.lng.toFixed(5)}`;
      const isNewRoute = routeHashRef.current !== routeKey;

      if (isNewRoute) {
        routeHashRef.current = routeKey;
        instructionTrigger.loadSteps(result.steps);
      }

      if (!voiceInitializedRef.current && result.steps.length > 0) {
        voiceInitializedRef.current = true;
        const firstInstruction = result.steps[0]?.maneuver?.instruction;
        if (firstInstruction) {
          voiceEngine.announce(firstInstruction);
        }
      }

      const coords = result.geometry.coordinates as [number, number][];
      const src = map.getSource("nav-route") as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(result.geometry);
      }

      if (coords.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach((c) => bounds.extend(c));
        bounds.extend([origin.lng, origin.lat]);
        bounds.extend([dest.lng, dest.lat]);
        map.fitBounds(bounds, { padding: { top: 80, bottom: 160, left: 40, right: 40 }, maxZoom: 16, duration: 600 });
      }
    } catch {
      if (requestId !== fetchIdRef.current) return;
    }
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    if (!open || lat == null || lng == null) return;
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const userLat = userPoint?.lat ?? lat;
    const userLng = userPoint?.lng ?? lng;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom: 14,
      attributionControl: false,
      maxZoom: 18,
    });
    mapRef.current = map;

    map.on("error", () => {});

    map.on("load", () => {
      const destEl = document.createElement("div");
      destEl.style.cssText = "width:36px;height:36px;border-radius:50%;background:hsl(0,72%,51%);border:3px solid white;box-shadow:0 2px 16px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;";
      destEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
      new mapboxgl.Marker(destEl).setLngLat([lng, lat]).addTo(map);

      if (userPoint) {
        const userEl = document.createElement("div");
        userEl.style.cssText = "width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.5);";
        userMarkerRef.current = new mapboxgl.Marker(userEl).setLngLat([userPoint.lng, userPoint.lat]).addTo(map);
      }

      map.addSource("nav-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "nav-route-line-bg",
        type: "line",
        source: "nav-route",
        paint: {
          "line-color": "rgba(59,130,246,0.2)",
          "line-width": 10,
          "line-blur": 3,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      map.addLayer({
        id: "nav-route-line",
        type: "line",
        source: "nav-route",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 4,
          "line-opacity": 0.9,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      const origin = userPoint ? { lat: userPoint.lat, lng: userPoint.lng } : { lat: userLat, lng: userLng };
      fetchRoute(map, origin, { lat, lng }, activeModeRef.current);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
    };
  }, [open, lat, lng]);

  useEffect(() => {
    if (!open || !mapRef.current || lat == null || lng == null) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;
    routeHashRef.current = null;
    voiceInitializedRef.current = false;
    const origin = userPoint ? { lat: userPoint.lat, lng: userPoint.lng } : { lat, lng };
    fetchRoute(map, origin, { lat, lng }, activeMode);
  }, [activeMode]);

  const lastRoutedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !mapRef.current || lat == null || lng == null || !userPoint) return;
    const map = mapRef.current;

    if (!userMarkerRef.current) {
      const userEl = document.createElement("div");
      userEl.style.cssText = "width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.5);";
      userMarkerRef.current = new mapboxgl.Marker(userEl).setLngLat([userPoint.lng, userPoint.lat]).addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userPoint.lng, userPoint.lat]);
    }

    const posKey = `${userPoint.lat.toFixed(4)},${userPoint.lng.toFixed(4)},${activeMode}`;
    if (lastRoutedUserRef.current !== posKey && map.isStyleLoaded()) {
      lastRoutedUserRef.current = posKey;
      fetchRoute(map, { lat: userPoint.lat, lng: userPoint.lng }, { lat, lng }, activeMode);
    }
  }, [userPoint?.lat, userPoint?.lng, open, lat, lng, activeMode]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([lng, lat]);
    if (userPoint) bounds.extend([userPoint.lng, userPoint.lat]);
    mapRef.current.fitBounds(bounds, { padding: { top: 80, bottom: 160, left: 40, right: 40 }, maxZoom: 16, duration: 600 });
  }, [lat, lng, userPoint]);

  const handleOpenExternal = useCallback(() => {
    if (lat == null || lng == null) return;
    openExternalMaps(lat, lng, label || undefined);
  }, [lat, lng, label]);

  const handleToggleMute = useCallback(() => {
    const newMuted = voiceEngine.toggleMute();
    setMuted(newMuted);
  }, []);

  if (!open || lat == null || lng == null) return null;

  const MuteIcon = muted ? VolumeX : Volume2;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <div ref={containerRef} className="flex-1" />

      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-3" style={{ background: "linear-gradient(to bottom, hsl(var(--background) / 0.95), transparent)" }}>
        <button
          onClick={close}
          className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
          style={{ background: "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border) / 0.2)" }}
        >
          <X className="h-5 w-5" style={{ color: "hsl(var(--foreground))" }} />
        </button>

        <div className="flex-1 text-center px-4">
          <p className="text-sm font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>
            {label || "Destination"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
            style={{ background: "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border) / 0.2)" }}
            aria-label={muted ? "Unmute voice guidance" : "Mute voice guidance"}
          >
            <MuteIcon className="h-5 w-5" style={{ color: muted ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))" }} />
          </button>
          <button
            onClick={handleRecenter}
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
            style={{ background: "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border) / 0.2)" }}
          >
            <Locate className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-3xl px-5 pt-5 pb-[env(safe-area-inset-bottom,20px)]" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border) / 0.15)", boxShadow: "0 -8px 40px hsl(var(--background) / 0.5)" }}>
        <div className="flex items-center justify-center gap-2 mb-4">
          {(["driving", "walking", "cycling"] as TransportMode[]).map((m) => {
            const Icon = MODE_ICONS[m];
            const isActive = m === activeMode;
            return (
              <button
                key={m}
                onClick={() => setActiveMode(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: isActive ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted) / 0.15)",
                  color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: `1px solid ${isActive ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.15)"}`,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            );
          })}
        </div>

        {routeInfo && !loading && (
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>
                {formatDistance(routeInfo.distanceKm)}
              </p>
              <p className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>distance</p>
            </div>
            <div className="w-px h-8" style={{ background: "hsl(var(--border) / 0.2)" }} />
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "hsl(var(--primary))" }}>
                {formatETA(routeInfo.etaMinutes)}
              </p>
              <p className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>ETA</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 mb-4 py-2">
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--primary))", borderTopColor: "transparent" }} />
            <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Calculating route…</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleOpenExternal}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={{
              background: "hsl(var(--muted) / 0.15)",
              color: "hsl(var(--muted-foreground))",
              border: "1px solid hsl(var(--border) / 0.15)",
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open in Maps
          </button>
          <button
            onClick={handleRecenter}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            <Navigation className="h-4 w-4" />
            Navigate
          </button>
        </div>
      </div>
    </div>
  );
}

export const InAppNavigationView = memo(InAppNavigationViewInner);
InAppNavigationView.displayName = "InAppNavigationView";
