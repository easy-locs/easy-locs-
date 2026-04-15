interface WeatherData {
  temperatureC: number | null;
  humidity: number | null;
  windKmh: number | null;
  weatherCode: number | null;
  isDay: boolean;
  precipitation: number;
  rain: number;
  showers: number;
  isRaining: boolean;
  fetchedAt: number;
  lat: number;
  lng: number;
  source: string;
}

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const DEFAULT_COORDS = { lat: 48.8566, lng: 2.3522 };
const REFRESH_MS = 120_000;

let _cachedWeather: WeatherData | null = null;
let _refreshTimer: ReturnType<typeof setInterval> | null = null;
let _lat = DEFAULT_COORDS.lat;
let _lng = DEFAULT_COORDS.lng;
let _consecutiveFailures = 0;

export function getWeatherServiceCache(): WeatherData | null {
  return _cachedWeather;
}

export function setWeatherServiceLocation(lat: number, lng: number): void {
  const changed = Math.abs(lat - _lat) > 0.01 || Math.abs(lng - _lng) > 0.01;
  _lat = lat;
  _lng = lng;
  if (changed && _refreshTimer) {
    refreshWeatherData();
  }
}

export async function refreshWeatherData(): Promise<WeatherData | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(_lat));
    url.searchParams.set("longitude", String(_lng));
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m,is_day");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "1");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
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

    _cachedWeather = {
      temperatureC,
      humidity,
      windKmh,
      weatherCode,
      isDay,
      precipitation,
      rain,
      showers,
      isRaining,
      fetchedAt: Date.now(),
      lat: _lat,
      lng: _lng,
      source: "live",
    };
    _consecutiveFailures = 0;

    emitUpdate();
    return _cachedWeather;
  } catch (err) {
    _consecutiveFailures++;
    console.warn(`[weather-service] Refresh failed (failure #${_consecutiveFailures}):`, err);
    return _cachedWeather;
  }
}

function emitUpdate(): void {
  try {
    import("@/lib/shared/platform-bus").then(({ platformBus }) => {
      platformBus.emit("weather:data:updated", {
        temperatureC: _cachedWeather?.temperatureC ?? null,
        isRaining: _cachedWeather?.isRaining ?? false,
        fetchedAt: _cachedWeather?.fetchedAt ?? 0,
        lat: _lat,
        lng: _lng,
      }, "data");
    }).catch(err => {
      console.warn("[weather-service] Failed to emit bus event:", err);
    });
  } catch (err) {
    console.warn("[weather-service] Bus import failed:", err);
  }
}

const MAX_RETRY_BACKOFF_MS = 60_000;

export function stopWeatherService(): void {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
    console.log("[weather-service] Stopped");
  }
}

export function startWeatherService(intervalMs = REFRESH_MS): () => void {
  if (_refreshTimer) return () => {};
  console.log("[weather-service] Starting background weather polling");
  refreshWeatherData();
  _refreshTimer = setInterval(() => {
    if (!document.hidden) {
      const backoffMs = _consecutiveFailures > 0
        ? Math.min(intervalMs * Math.pow(2, _consecutiveFailures - 1), MAX_RETRY_BACKOFF_MS)
        : 0;
      if (backoffMs > 0) {
        setTimeout(() => refreshWeatherData(), backoffMs);
      } else {
        refreshWeatherData();
      }
    }
  }, intervalMs);
  return () => {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  };
}
