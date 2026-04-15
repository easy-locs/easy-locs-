import { useEffect, useMemo, useState, useRef } from "react";
import { useLocationStore } from "@/stores/locationStore";

export type WeatherStationState = {
  loading: boolean;
  isRaining: boolean;
  precipitationMm: number;
  temperatureC: number | null;
  humidity: number | null;
  windKmh: number | null;
  weatherCode: number | null;
  isDay: boolean;
  label: string;
  shortLabel: string;
  icon: string;
  lastUpdated: number | null;
  isStale: boolean;
  source: string;
};

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  AE: { lat: 25.2048, lng: 55.2708 },
  SA: { lat: 24.7136, lng: 46.6753 },
  EG: { lat: 30.0444, lng: 31.2357 },
  MA: { lat: 33.5731, lng: -7.5898 },
  FR: { lat: 48.8566, lng: 2.3522 },
  GB: { lat: 51.5074, lng: -0.1278 },
  US: { lat: 40.7128, lng: -74.006 },
  NG: { lat: 9.0579, lng: 7.4951 },
  PK: { lat: 33.6844, lng: 73.0479 },
  BD: { lat: 23.8103, lng: 90.4125 },
  TR: { lat: 39.9334, lng: 32.8597 },
  ID: { lat: -6.2088, lng: 106.8456 },
  MY: { lat: 3.139, lng: 101.6869 },
  DZ: { lat: 36.7372, lng: 3.0865 },
  TN: { lat: 36.8065, lng: 10.1815 },
  SN: { lat: 14.7167, lng: -17.4677 },
  DE: { lat: 52.52, lng: 13.405 },
  ES: { lat: 40.4168, lng: -3.7038 },
  IT: { lat: 41.9028, lng: 12.4964 },
  BR: { lat: -23.5505, lng: -46.6333 },
};

const DEFAULT_COORDS = { lat: 48.8566, lng: 2.3522 };
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const REFRESH_MS = 120_000;

function getWeatherIcon(code: number | null, isRaining: boolean): string {
  if (isRaining) return "🌧";
  if (code === null) return "🌤";
  if (code <= 1) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫";
  if (code <= 67) return "🌧";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦";
  if (code <= 99) return "⛈";
  return "🌤";
}

function buildWeatherLabel(isRaining: boolean, precipitationMm: number, temperatureC: number | null, windKmh: number | null) {
  const temp = temperatureC != null ? `${Math.round(temperatureC)}°` : "";
  const wind = windKmh != null && windKmh > 20 ? ` · 💨 ${Math.round(windKmh)}km/h` : "";
  if (isRaining) {
    const intensity = precipitationMm > 5 ? "Heavy rain" : precipitationMm > 1 ? "Rain" : "Light rain";
    return `${intensity} · ${precipitationMm.toFixed(1)}mm${temp ? ` · ${temp}` : ""}${wind}`;
  }
  return `${temp}${wind}`;
}

function buildShortLabel(temperatureC: number | null, isRaining: boolean) {
  if (temperatureC == null) return isRaining ? "Rain" : "—";
  return `${Math.round(temperatureC)}°`;
}

let _weatherModule: typeof import("@/services/data/weather-data-service") | null = null;
const _weatherModulePromise = import("@/services/data/weather-data-service").then(m => {
  _weatherModule = m;
  return m;
}).catch(err => {
  console.warn("[useLiveWeatherStation] Failed to load weather-data-service:", err);
  return null;
});

function readFromServiceCache(): WeatherCacheEntry | null {
  try {
    return _weatherModule?.getWeatherServiceCache() ?? null;
  } catch (err) {
    console.warn("[useLiveWeatherStation] Failed to read service cache:", err);
    return null;
  }
}

interface WeatherCacheEntry {
  isRaining: boolean;
  precipitation: number;
  rain: number;
  showers: number;
  temperatureC: number;
  humidity: number;
  windKmh: number;
  weatherCode: number;
  isDay: boolean;
  fetchedAt: number;
  source: string;
}

function buildStateFromCache(cached: WeatherCacheEntry | null): WeatherStationState | null {
  if (!cached) return null;
  const strongestPrecipitation = Math.max(cached.precipitation ?? 0, cached.rain ?? 0, cached.showers ?? 0);
  const age = Date.now() - cached.fetchedAt;
  return {
    loading: false,
    isRaining: cached.isRaining,
    precipitationMm: strongestPrecipitation,
    temperatureC: cached.temperatureC,
    humidity: cached.humidity,
    windKmh: cached.windKmh,
    weatherCode: cached.weatherCode,
    isDay: cached.isDay,
    label: buildWeatherLabel(cached.isRaining, strongestPrecipitation, cached.temperatureC, cached.windKmh),
    shortLabel: buildShortLabel(cached.temperatureC, cached.isRaining),
    icon: getWeatherIcon(cached.weatherCode, cached.isRaining),
    lastUpdated: cached.fetchedAt,
    isStale: age > REFRESH_MS * 2,
    source: cached.source ?? "unknown",
  };
}

export function useLiveWeatherStation(input?: { lat?: number | null; lng?: number | null; country?: string | null }) {
  const gpsLocation = useLocationStore((s) => s.currentLocation);

  const resolvedLat = input?.lat ?? gpsLocation?.lat ?? null;
  const resolvedLng = input?.lng ?? gpsLocation?.lng ?? null;

  const countryFallback = input?.country
    ? COUNTRY_COORDS[input.country.toUpperCase()]
    : undefined;
  const fallback = countryFallback ?? DEFAULT_COORDS;

  const lat = resolvedLat ?? fallback.lat;
  const lng = resolvedLng ?? fallback.lng;

  const [state, setState] = useState<WeatherStationState>(() => {
    const cached = readFromServiceCache();
    const fromCache = buildStateFromCache(cached);
    return fromCache ?? {
      loading: true,
      isRaining: false,
      precipitationMm: 0,
      temperatureC: null,
      humidity: null,
      windKmh: null,
      weatherCode: null,
      isDay: true,
      label: "Loading…",
      shortLabel: "—",
      icon: "🌤",
      lastUpdated: null,
      isStale: false,
      source: "unknown",
    };
  });

  useEffect(() => {
    let active = true;
    let busUnsub: (() => void) | null = null;

    const updateFromCache = () => {
      const cached = readFromServiceCache();
      const fromCache = buildStateFromCache(cached);
      if (fromCache && active) {
        setState(fromCache);
      }
    };

    _weatherModulePromise.then(mod => {
      if (!active || !mod) return;
      mod.setWeatherServiceLocation(lat, lng);
      updateFromCache();

      if (!readFromServiceCache()) {
        mod.refreshWeatherData().then(() => {
          if (active) updateFromCache();
        }).catch(err => {
          console.warn("[useLiveWeatherStation] Initial refresh failed:", err);
          if (active) {
            setState(prev => ({
              ...prev,
              loading: false,
              label: "Offline",
              icon: "⚠️",
            }));
          }
        });
      }
    });

    import("@/lib/shared/platform-bus").then(({ platformBus }) => {
      if (!active) return;
      busUnsub = platformBus.on("weather:data:updated", () => {
        updateFromCache();
      });
    }).catch(err => {
      console.warn("[useLiveWeatherStation] Failed to subscribe to bus:", err);
    });

    const staleCheckInterval = setInterval(() => {
      if (!active) return;
      const cached = readFromServiceCache();
      if (cached) {
        const age = Date.now() - cached.fetchedAt;
        setState(prev => {
          const nowStale = age > REFRESH_MS * 2;
          if (prev.isStale === nowStale) return prev;
          return { ...prev, isStale: nowStale };
        });
      }
    }, 30_000);

    return () => {
      active = false;
      if (busUnsub) busUnsub();
      clearInterval(staleCheckInterval);
    };
  }, [lat, lng]);

  return useMemo(() => state, [state]);
}
