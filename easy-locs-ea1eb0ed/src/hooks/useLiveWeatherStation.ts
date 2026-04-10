import { useEffect, useMemo, useState, useRef } from "react";

type WeatherStationState = {
  loading: boolean;
  isRaining: boolean;
  precipitationMm: number;
  temperatureC: number | null;
  humidity: number | null;
  windKmh: number | null;
  weatherCode: number | null;
  label: string;
  shortLabel: string;
  icon: string;
  lastUpdated: number | null;
};

const DUBAI_COORDS = { lat: 25.2048, lng: 55.2708 };
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const REFRESH_MS = 120_000; // 2 minutes — true live

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

export function useLiveWeatherStation(input?: { lat?: number | null; lng?: number | null }) {
  const lat = input?.lat ?? DUBAI_COORDS.lat;
  const lng = input?.lng ?? DUBAI_COORDS.lng;
  const retryRef = useRef(0);

  const [state, setState] = useState<WeatherStationState>({
    loading: true,
    isRaining: false,
    precipitationMm: 0,
    temperatureC: null,
    humidity: null,
    windKmh: null,
    weatherCode: null,
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
        url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m");
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
