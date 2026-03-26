import { useEffect, useMemo, useState } from "react";

type WeatherStationState = {
  loading: boolean;
  isRaining: boolean;
  precipitationMm: number;
  temperatureC: number | null;
  weatherCode: number | null;
  label: string;
};

const DUBAI_COORDS = { lat: 25.2048, lng: 55.2708 };
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

function buildWeatherLabel(isRaining: boolean, precipitationMm: number, temperatureC: number | null) {
  const temp = temperatureC == null ? "" : ` · ${Math.round(temperatureC)}°`;
  if (isRaining) {
    return precipitationMm > 0 ? `Rain now · ${precipitationMm.toFixed(1)} mm${temp}` : `Rain now${temp}`;
  }
  return `Weather clear${temp}`;
}

export function useLiveWeatherStation(input?: { lat?: number | null; lng?: number | null }) {
  const lat = input?.lat ?? DUBAI_COORDS.lat;
  const lng = input?.lng ?? DUBAI_COORDS.lng;

  const [state, setState] = useState<WeatherStationState>({
    loading: true,
    isRaining: false,
    precipitationMm: 0,
    temperatureC: null,
    weatherCode: null,
    label: "Loading weather…",
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lng));
        url.searchParams.set("current", "temperature_2m,precipitation,rain,showers,weather_code");
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "1");

        const res = await fetch(url.toString());
        const json = await res.json();
        const current = json?.current ?? {};
        const precipitation = Number(current.precipitation ?? 0);
        const rain = Number(current.rain ?? 0);
        const showers = Number(current.showers ?? 0);
        const weatherCode = Number.isFinite(Number(current.weather_code)) ? Number(current.weather_code) : null;
        const temperatureC = Number.isFinite(Number(current.temperature_2m)) ? Number(current.temperature_2m) : null;
        const strongestPrecipitation = Math.max(precipitation, rain, showers);
        const isRaining = strongestPrecipitation > 0 || (weatherCode != null && RAIN_CODES.has(weatherCode));

        if (!active) return;

        setState({
          loading: false,
          isRaining,
          precipitationMm: strongestPrecipitation,
          temperatureC,
          weatherCode,
          label: buildWeatherLabel(isRaining, strongestPrecipitation, temperatureC),
        });
      } catch {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          label: prev.isRaining ? prev.label : "Weather unavailable",
        }));
      }
    };

    load();
    const interval = window.setInterval(load, 300_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [lat, lng]);

  return useMemo(() => state, [state]);
}