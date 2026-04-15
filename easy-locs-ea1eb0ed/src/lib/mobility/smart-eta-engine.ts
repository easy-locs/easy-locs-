import { db } from "@/services/db";
import { getDirections } from "@/lib/location/geocode";
import { fetchWeatherCodeAtPoint } from "@/lib/intelligence/global/weather-provider-openmeteo";
import { getCalibratedMultipliers } from "./eta-accuracy-tracker";

export type SmartTrafficLevel = "low" | "moderate" | "heavy" | "gridlock" | "unknown";
export type SmartWeatherImpact = "none" | "rain" | "storm" | "fog" | "heat";

export interface SmartETAResult {
  etaMinutes: number;
  etaRangeMin: number;
  etaRangeMax: number;
  trafficLevel: SmartTrafficLevel;
  trafficDeltaMinutes: number;
  weatherImpact: SmartWeatherImpact;
  weatherDeltaMinutes: number;
  rushHourMultiplier: number;
  confidenceScore: number;
  distanceKm: number;
  badge: string | null;
  explanation: Record<string, unknown>;
}

export interface DeliveryETAResult {
  leg1DriverToMerchant: SmartETAResult;
  leg2PrepMinutes: number;
  leg3MerchantToClient: SmartETAResult;
  totalMinutes: number;
  totalRangeMin: number;
  totalRangeMax: number;
  preparingWhileEnRoute: boolean;
  badge: string | null;
  trafficLevel: SmartTrafficLevel;
  weatherImpact: SmartWeatherImpact;
}

interface GeoPoint {
  lat: number;
  lng: number;
}

const WEATHER_ETA_MULTIPLIERS: Record<number, { multiplier: number; impact: SmartWeatherImpact }> = {
  0: { multiplier: 1.0, impact: "none" },
  1: { multiplier: 1.0, impact: "none" },
  2: { multiplier: 1.0, impact: "none" },
  3: { multiplier: 1.0, impact: "none" },
  45: { multiplier: 1.10, impact: "fog" },
  48: { multiplier: 1.12, impact: "fog" },
  51: { multiplier: 1.08, impact: "rain" },
  53: { multiplier: 1.12, impact: "rain" },
  55: { multiplier: 1.15, impact: "rain" },
  61: { multiplier: 1.10, impact: "rain" },
  63: { multiplier: 1.15, impact: "rain" },
  65: { multiplier: 1.20, impact: "rain" },
  71: { multiplier: 1.15, impact: "rain" },
  73: { multiplier: 1.20, impact: "rain" },
  75: { multiplier: 1.25, impact: "rain" },
  77: { multiplier: 1.15, impact: "rain" },
  80: { multiplier: 1.10, impact: "rain" },
  81: { multiplier: 1.15, impact: "rain" },
  82: { multiplier: 1.25, impact: "storm" },
  85: { multiplier: 1.15, impact: "rain" },
  86: { multiplier: 1.25, impact: "storm" },
  95: { multiplier: 1.30, impact: "storm" },
  96: { multiplier: 1.35, impact: "storm" },
  99: { multiplier: 1.40, impact: "storm" },
};

const WEATHER_SURGE_MULTIPLIERS: Record<SmartWeatherImpact, number> = {
  none: 1.0,
  heat: 1.03,
  fog: 1.05,
  rain: 1.10,
  storm: 1.20,
};

const RUSH_HOUR_PATTERNS: Record<number, number[]> = {
  0: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.08, 1.05, 1.0, 1.0, 1.05, 1.08, 1.05, 1.0, 1.0, 1.08, 1.12, 1.10, 1.05, 1.0, 1.0, 1.0],
  1: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.15, 1.20, 1.12, 1.05, 1.0, 1.05, 1.10, 1.05, 1.0, 1.05, 1.18, 1.22, 1.15, 1.08, 1.0, 1.0, 1.0],
  2: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.15, 1.20, 1.12, 1.05, 1.0, 1.05, 1.10, 1.05, 1.0, 1.05, 1.18, 1.22, 1.15, 1.08, 1.0, 1.0, 1.0],
  3: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.15, 1.20, 1.12, 1.05, 1.0, 1.05, 1.10, 1.05, 1.0, 1.05, 1.18, 1.22, 1.15, 1.08, 1.0, 1.0, 1.0],
  4: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.15, 1.20, 1.12, 1.05, 1.0, 1.05, 1.10, 1.05, 1.0, 1.05, 1.18, 1.22, 1.15, 1.08, 1.0, 1.0, 1.0],
  5: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.08, 1.12, 1.08, 1.05, 1.05, 1.08, 1.10, 1.08, 1.05, 1.05, 1.10, 1.15, 1.10, 1.05, 1.0, 1.0, 1.0],
  6: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.05, 1.08, 1.10, 1.12, 1.10, 1.08, 1.05, 1.05, 1.08, 1.10, 1.08, 1.05, 1.0, 1.0],
};

const PREP_TIME_FALLBACKS: Record<string, number> = {
  food: 15,
  food_delivery: 15,
  grocery: 5,
  grocery_delivery: 5,
  parcel: 2,
  errand: 3,
};

function getRushHourMultiplier(date?: Date): number {
  const d = date ?? new Date();
  const day = d.getDay();
  const hour = d.getHours();
  const pattern = RUSH_HOUR_PATTERNS[day] ?? RUSH_HOUR_PATTERNS[1];
  return pattern[hour] ?? 1.0;
}

function inferTrafficLevel(durationS: number, distanceM: number, durationTypicalS: number | null): SmartTrafficLevel {
  if (!durationS || !distanceM) return "unknown";
  const km = distanceM / 1000;
  const h = durationS / 3600;
  const speed = km / Math.max(h, 0.0001);

  if (durationTypicalS && durationTypicalS > 0) {
    const ratio = durationS / durationTypicalS;
    if (ratio >= 2.0) return "gridlock";
    if (ratio >= 1.4) return "heavy";
    if (ratio >= 1.15) return "moderate";
    return "low";
  }

  if (speed >= 40) return "low";
  if (speed >= 25) return "moderate";
  if (speed >= 12) return "heavy";
  return "gridlock";
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function computeConfidence(hasDirections: boolean, hasWeather: boolean, nearbyDrivers: number): number {
  let score = 0.5;
  if (hasDirections) score += 0.25;
  if (hasWeather) score += 0.10;
  if (nearbyDrivers >= 3) score += 0.10;
  else if (nearbyDrivers >= 1) score += 0.05;
  return Math.min(0.98, score);
}

function buildBadge(trafficLevel: SmartTrafficLevel, weatherImpact: SmartWeatherImpact, weatherDelta: number, trafficDelta: number): string | null {
  const badges: string[] = [];
  if (weatherImpact === "storm") badges.push(`Orage +${Math.round(weatherDelta)} min`);
  else if (weatherImpact === "rain") badges.push(`Pluie +${Math.round(weatherDelta)} min`);
  else if (weatherImpact === "fog") badges.push(`Brouillard +${Math.round(weatherDelta)} min`);

  if (trafficLevel === "gridlock") badges.push("Embouteillage");
  else if (trafficLevel === "heavy") badges.push(`Trafic dense +${Math.round(trafficDelta)} min`);

  return badges.length > 0 ? badges.join(" · ") : null;
}

async function fetchWeatherCode(point: GeoPoint): Promise<number | null> {
  return fetchWeatherCodeAtPoint(point.lat, point.lng);
}

let _calibrationCache: {
  weatherMultipliers: Record<string, number>;
  rushHourMultipliers: Record<number, number>;
  fetchedAt: number;
} | null = null;
const CALIBRATION_CACHE_TTL = 30 * 60_000;

async function loadCalibration(): Promise<{
  weatherMultipliers: Record<string, number>;
  rushHourMultipliers: Record<number, number>;
}> {
  if (_calibrationCache && Date.now() - _calibrationCache.fetchedAt < CALIBRATION_CACHE_TTL) {
    return _calibrationCache;
  }
  try {
    const result = await getCalibratedMultipliers();
    _calibrationCache = { ...result, fetchedAt: Date.now() };
    return result;
  } catch {
    return {
      weatherMultipliers: { none: 1.0, rain: 1.15, storm: 1.30, fog: 1.10, heat: 1.0 },
      rushHourMultipliers: {},
    };
  }
}

function applyCalibratedWeather(baseMultiplier: number, impact: SmartWeatherImpact, calibrated: Record<string, number>): number {
  const cal = calibrated[impact];
  if (cal == null) return baseMultiplier;
  return Math.max(0.9, Math.min(1.5, cal));
}

function applyCalibratedRush(baseMultiplier: number, hour: number, calibrated: Record<number, number>): number {
  const cal = calibrated[hour];
  if (cal == null) return baseMultiplier;
  return baseMultiplier * Math.max(0.9, Math.min(1.3, cal));
}

export function getWeatherSurgeMultiplier(impact: SmartWeatherImpact): number {
  return WEATHER_SURGE_MULTIPLIERS[impact] ?? 1.0;
}

async function countNearbyDrivers(point: GeoPoint, radiusKm: number = 3): Promise<number> {
  try {
    const degPerKm = 1 / 111;
    const latDelta = radiusKm * degPerKm;
    const lngDelta = radiusKm * degPerKm / Math.cos((point.lat * Math.PI) / 180);

    const { data } = await db
      .from("rider_presence")
      .select("id")
      .eq("is_online", true)
      .eq("is_available", true)
      .gte("lat", point.lat - latDelta)
      .lte("lat", point.lat + latDelta)
      .gte("lng", point.lng - lngDelta)
      .lte("lng", point.lng + lngDelta)
      .limit(50);

    return data?.length ?? 0;
  } catch {
    return 0;
  }
}

export async function computeSmartETA(
  origin: GeoPoint,
  destination: GeoPoint,
  options?: {
    skipWeather?: boolean;
    skipDriverCount?: boolean;
    nearbyDriversOverride?: number;
  },
): Promise<SmartETAResult> {
  const fallbackDistanceKm = haversineKm(origin, destination) * 1.3;
  const fallbackEtaMin = Math.max(2, Math.round(fallbackDistanceKm * 2.5));

  let durationS = fallbackEtaMin * 60;
  let distanceM = fallbackDistanceKm * 1000;
  let durationTypicalS: number | null = null;
  let hasDirections = false;

  try {
    const directions = await getDirections(origin, destination, "driving-traffic");
    if (directions) {
      durationS = directions.duration_s;
      distanceM = directions.distance_m;
      durationTypicalS = directions.duration_typical_s;
      hasDirections = true;
    }
  } catch { /* fallback */ }

  const baseEtaMinutes = Math.max(1, durationS / 60);
  const distanceKm = distanceM / 1000;

  const calibration = await loadCalibration();
  let rushMultiplier = getRushHourMultiplier();
  rushMultiplier = applyCalibratedRush(rushMultiplier, new Date().getHours(), calibration.rushHourMultipliers);

  let weatherCode: number | null = null;
  let weatherMultiplier = 1.0;
  let weatherImpact: SmartWeatherImpact = "none";
  const hasWeather = !options?.skipWeather;

  if (hasWeather) {
    weatherCode = await fetchWeatherCode(origin);
    if (weatherCode != null) {
      const entry = WEATHER_ETA_MULTIPLIERS[weatherCode];
      if (entry) {
        weatherMultiplier = entry.multiplier;
        weatherImpact = entry.impact;
        weatherMultiplier = applyCalibratedWeather(weatherMultiplier, weatherImpact, calibration.weatherMultipliers);
      }
    }
  }

  const nearbyDrivers = options?.skipDriverCount
    ? (options.nearbyDriversOverride ?? 5)
    : await countNearbyDrivers(origin);

  let driverDensityMultiplier = 1.0;
  if (nearbyDrivers === 0) driverDensityMultiplier = 1.25;
  else if (nearbyDrivers <= 2) driverDensityMultiplier = 1.12;
  else if (nearbyDrivers <= 4) driverDensityMultiplier = 1.05;
  else if (nearbyDrivers >= 10) driverDensityMultiplier = 0.95;

  const adjustedEta = baseEtaMinutes * weatherMultiplier * rushMultiplier * driverDensityMultiplier;
  const etaMinutes = Math.max(1, Math.round(adjustedEta));

  const confidence = computeConfidence(hasDirections, weatherCode != null, nearbyDrivers);
  const spreadFactor = 1 - confidence;
  const etaRangeMin = Math.max(1, Math.round(adjustedEta * (1 - spreadFactor * 0.3)));
  const etaRangeMax = Math.round(adjustedEta * (1 + spreadFactor * 0.5));

  const trafficLevel = inferTrafficLevel(durationS, distanceM, durationTypicalS);

  const typicalMinutes = durationTypicalS ? durationTypicalS / 60 : baseEtaMinutes;
  const trafficDelta = Math.max(0, baseEtaMinutes - typicalMinutes);
  const weatherDelta = Math.max(0, adjustedEta - baseEtaMinutes * rushMultiplier);

  const badge = buildBadge(trafficLevel, weatherImpact, weatherDelta, trafficDelta);

  return {
    etaMinutes,
    etaRangeMin,
    etaRangeMax,
    trafficLevel,
    trafficDeltaMinutes: Math.round(trafficDelta),
    weatherImpact,
    weatherDeltaMinutes: Math.round(weatherDelta),
    rushHourMultiplier: rushMultiplier,
    confidenceScore: Number(confidence.toFixed(2)),
    distanceKm: Number(distanceKm.toFixed(1)),
    badge,
    explanation: {
      hasDirections,
      weatherCode,
      weatherMultiplier,
      rushMultiplier,
      driverDensityMultiplier,
      nearbyDrivers,
      durationS: Math.round(durationS),
      durationTypicalS: durationTypicalS ? Math.round(durationTypicalS) : null,
    },
  };
}

export async function computeDeliveryETA(
  driverPosition: GeoPoint,
  merchantPosition: GeoPoint,
  clientPosition: GeoPoint,
  options?: {
    merchantId?: string;
    deliveryCategory?: string;
    prepTimeOverride?: number;
  },
): Promise<DeliveryETAResult> {
  const [leg1, leg3] = await Promise.all([
    computeSmartETA(driverPosition, merchantPosition, { skipDriverCount: true }),
    computeSmartETA(merchantPosition, clientPosition, { skipDriverCount: true }),
  ]);

  let prepMinutes = options?.prepTimeOverride ?? null;

  if (prepMinutes == null && options?.merchantId) {
    try {
      const { data: merchant } = await db
        .from("merchant_profiles")
        .select("prep_time_minutes, merchant_type")
        .eq("id", options.merchantId)
        .maybeSingle();

      if (merchant?.prep_time_minutes != null) {
        prepMinutes = merchant.prep_time_minutes;
      } else if (merchant?.merchant_type) {
        prepMinutes = PREP_TIME_FALLBACKS[merchant.merchant_type] ?? 10;
      }
    } catch { /* fallback */ }
  }

  if (prepMinutes == null && options?.merchantId) {
    try {
      const { data: runtime } = await db
        .from("merchant_delivery_runtime")
        .select("prep_time_minutes")
        .eq("merchant_id", options.merchantId)
        .maybeSingle();

      if (runtime?.prep_time_minutes != null) {
        prepMinutes = runtime.prep_time_minutes;
      }
    } catch { /* fallback */ }
  }

  if (prepMinutes == null) {
    const category = options?.deliveryCategory ?? "food";
    prepMinutes = PREP_TIME_FALLBACKS[category] ?? 10;
  }

  const preparingWhileEnRoute = leg1.etaMinutes < prepMinutes;
  const waitAfterArrival = preparingWhileEnRoute ? prepMinutes - leg1.etaMinutes : 0;
  const totalMinutes = Math.max(leg1.etaMinutes, prepMinutes) + leg3.etaMinutes;
  const totalRangeMin = Math.max(leg1.etaRangeMin, prepMinutes) + leg3.etaRangeMin;
  const totalRangeMax = Math.max(leg1.etaRangeMax, prepMinutes) + leg3.etaRangeMax;

  const worstTraffic: SmartTrafficLevel = 
    leg1.trafficLevel === "gridlock" || leg3.trafficLevel === "gridlock" ? "gridlock" :
    leg1.trafficLevel === "heavy" || leg3.trafficLevel === "heavy" ? "heavy" :
    leg1.trafficLevel === "moderate" || leg3.trafficLevel === "moderate" ? "moderate" :
    leg1.trafficLevel === "low" || leg3.trafficLevel === "low" ? "low" : "unknown";

  const badges: string[] = [];
  if (preparingWhileEnRoute) badges.push(`En préparation (~${waitAfterArrival} min)`);
  if (leg1.badge) badges.push(leg1.badge);
  if (leg3.badge && leg3.badge !== leg1.badge) badges.push(leg3.badge);
  const badge = badges.length > 0 ? badges.join(" · ") : null;

  return {
    leg1DriverToMerchant: leg1,
    leg2PrepMinutes: prepMinutes,
    leg3MerchantToClient: leg3,
    totalMinutes,
    totalRangeMin,
    totalRangeMax,
    preparingWhileEnRoute,
    badge,
    trafficLevel: worstTraffic,
    weatherImpact: leg1.weatherImpact,
  };
}

export function computeSmartETASync(
  distanceKm: number,
  durationMinutes: number,
  trafficLevel: SmartTrafficLevel = "moderate",
  weatherImpact: SmartWeatherImpact = "none",
): SmartETAResult {
  const rushMultiplier = getRushHourMultiplier();
  const weatherMultiplier = weatherImpact === "storm" ? 1.30 :
    weatherImpact === "rain" ? 1.15 :
    weatherImpact === "fog" ? 1.10 : 1.0;

  const adjustedEta = durationMinutes * weatherMultiplier * rushMultiplier;
  const etaMinutes = Math.max(1, Math.round(adjustedEta));

  const confidence = 0.6;
  const spreadFactor = 1 - confidence;
  const etaRangeMin = Math.max(1, Math.round(adjustedEta * (1 - spreadFactor * 0.3)));
  const etaRangeMax = Math.round(adjustedEta * (1 + spreadFactor * 0.5));

  const weatherDelta = Math.max(0, adjustedEta - durationMinutes * rushMultiplier);
  const badge = buildBadge(trafficLevel, weatherImpact, weatherDelta, 0);

  return {
    etaMinutes,
    etaRangeMin,
    etaRangeMax,
    trafficLevel,
    trafficDeltaMinutes: 0,
    weatherImpact,
    weatherDeltaMinutes: Math.round(weatherDelta),
    rushHourMultiplier: rushMultiplier,
    confidenceScore: confidence,
    distanceKm,
    badge,
    explanation: { sync: true, weatherMultiplier, rushMultiplier },
  };
}
