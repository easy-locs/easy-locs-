/**
 * useRouteETA — Real-time ETA calculation using Mapbox Directions API.
 * 
 * Features:
 * - Road-based distance + traffic-aware ETA
 * - Auto-refresh every N seconds
 * - Route polyline for map display
 * - Fallback to haversine estimation
 */
import { useState, useCallback, useRef, useEffect } from "react";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWFzeWxvY3MyMDI2IiwiYSI6ImNtbXZiZ3h0cTF6ZHMycnIyOWw4NnJzZTIifQ.ElIj6bFQK_BpVm6suigHUQ";

export interface RouteInfo {
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  durationText: string;
  distanceText: string;
  routeGeometry?: GeoJSON.LineString;
  trafficLevel?: "low" | "moderate" | "heavy";
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return "< 1 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}min` : `${hours}h`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function useRouteETA(opts?: { autoRefreshSec?: number }) {
  const { autoRefreshSec } = opts || {};
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoordsRef = useRef<{ oLat: number; oLng: number; dLat: number; dLng: number } | null>(null);

  const calculateRoute = useCallback(async (
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    profile: "driving-traffic" | "driving" | "cycling" | "walking" = "driving-traffic",
  ): Promise<RouteInfo | null> => {
    lastCoordsRef.current = { oLat: originLat, oLng: originLng, dLat: destLat, dLng: destLng };

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originLng},${originLat};${destLng},${destLat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&annotations=duration,congestion`;

      const res = await fetch(url, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error("Directions API failed");

      const data = await res.json();
      const leg = data.routes?.[0];

      if (!leg) {
        // Fallback to haversine
        return fallbackRoute(originLat, originLng, destLat, destLng);
      }

      // Detect traffic level
      const congestion = leg.legs?.[0]?.annotation?.congestion || [];
      const heavyCount = congestion.filter((c: string) => c === "heavy" || c === "severe").length;
      const trafficLevel: "low" | "moderate" | "heavy" =
        heavyCount > congestion.length * 0.3 ? "heavy" :
        heavyCount > congestion.length * 0.1 ? "moderate" : "low";

      const info: RouteInfo = {
        distanceKm: leg.distance / 1000,
        durationSeconds: leg.duration,
        durationMinutes: Math.round(leg.duration / 60),
        durationText: formatDuration(leg.duration),
        distanceText: formatDistance(leg.distance / 1000),
        routeGeometry: leg.geometry,
        trafficLevel,
      };

      setRoute(info);
      return info;
    } catch (err: any) {
      if (err.name === "AbortError") return null;
      console.warn("[RouteETA] API failed, using fallback:", err);
      return fallbackRoute(originLat, originLng, destLat, destLng);
    } finally {
      setLoading(false);
    }
  }, []);

  function fallbackRoute(
    lat1: number, lng1: number, lat2: number, lng2: number,
  ): RouteInfo {
    const dist = haversineKm(lat1, lng1, lat2, lng2) * 1.3; // road factor
    const seconds = Math.round((dist / 30) * 3600); // 30 km/h avg
    const info: RouteInfo = {
      distanceKm: dist,
      durationSeconds: seconds,
      durationMinutes: Math.round(seconds / 60),
      durationText: formatDuration(seconds),
      distanceText: formatDistance(dist),
    };
    setRoute(info);
    return info;
  }

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshSec || !lastCoordsRef.current) return;
    intervalRef.current = setInterval(() => {
      const c = lastCoordsRef.current;
      if (c) calculateRoute(c.oLat, c.oLng, c.dLat, c.dLng);
    }, autoRefreshSec * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefreshSec, calculateRoute]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { route, loading, calculateRoute };
}
