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

  const retryRef = useRef(0);

  const [state, setState] = useState<WeatherStationState>({
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
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lng));
        url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m,is_day");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "1");

        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json();
        const current = json?.current ?? {};

        const precipitation = Number(current.precipitation ?? 0);
        const rain = Number(current.rain ?? 0);
        const showers = Number(current.showers ?? 0);
        const weatherCode = Number.isFinite(Number(current.weather_code)) ? Number(current.weather_code) : null;
        const temperatureC = Number.isFinite(Number(current.temperature_2m)) ? Number(current.temperature_2m) : null;
        const humidity = Number.isFinite(Number(current.relative_humidity_2m)) ? Number(current.relative_humidity_2m) : null;
        const windKmh = Number.isFinite(Number(current.wind_speed_10m)) ? Number(current.wind_speed_10m) : null;
        const strongestPrecipitation = Math.max(precipitation, rain, showers);
        const isRaining = strongestPrecipitation > 0 || (weatherCode != null && RAIN_CODES.has(weatherCode));
        const isDay = current.is_day === 1 || current.is_day === true;

        if (!active) return;
        retryRef.current = 0;

        setState({
          loading: false,
          isRaining,
          precipitationMm: strongestPrecipitation,
          temperatureC,
          humidity,
          windKmh,
          weatherCode,
          isDay,
          label: buildWeatherLabel(isRaining, strongestPrecipitation, temperatureC, windKmh),
          shortLabel: buildShortLabel(temperatureC, isRaining),
          icon: getWeatherIcon(weatherCode, isRaining),
          lastUpdated: Date.now(),
        });
      } catch {
        if (!active) return;
        retryRef.current += 1;
        setState((prev) => ({
          ...prev,
          loading: false,
          label: prev.lastUpdated ? prev.label : "Offline",
          icon: prev.lastUpdated ? prev.icon : "⚠️",
        }));
      }
    };

    load();
    const interval = window.setInterval(load, REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [lat, lng]);

  return useMemo(() => state, [state]);
}
