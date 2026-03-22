/**
 * Smart Geolocation Detection — IP + GPS + Browser locale.
 * Auto-detects user's country, language, and currency on first visit.
 * Uses canonical locationStore for GPS — no raw navigator.geolocation calls.
 */

import { useState, useEffect, useCallback } from "react";
import { getCountryEntryOrDefault, type CountryEntry } from "@/lib/global-country-registry";
import { useLocationStore } from "@/stores/locationStore";

export interface GeoDetection {
  country: string;
  language: string;
  currency: string;
  timezone: string;
  city?: string;
  lat?: number;
  lng?: number;
  method: "ip" | "gps" | "browser" | "cached" | "default";
  detectedAt: string;
}

const CACHE_KEY = "easylocs_geo_detect";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCachedDetection(): GeoDetection | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as GeoDetection & { _ts: number };
    if (Date.now() - cached._ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function cacheDetection(detection: GeoDetection) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...detection, _ts: Date.now() }));
  } catch { /* quota */ }
}

function detectFromBrowser(): Partial<GeoDetection> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const lang = navigator.language || "en";
  const parts = lang.split("-");
  const country = parts[1]?.toUpperCase() || "";

  return {
    timezone: tz,
    language: lang,
    country: country || undefined,
    method: "browser",
  };
}

async function detectFromIP(): Promise<Partial<GeoDetection>> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return {
      country: data.country_code || "",
      city: data.city || "",
      currency: data.currency || "",
      lat: data.latitude,
      lng: data.longitude,
      timezone: data.timezone || "",
      method: "ip",
    };
  } catch {
    return {};
  }
}

function detectFromLocationStore(): Partial<GeoDetection> {
  const loc = useLocationStore.getState().currentLocation;
  if (!loc) return {};
  return {
    lat: loc.lat,
    lng: loc.lng,
    method: "gps",
  };
}

function mergeDetections(...sources: Partial<GeoDetection>[]): GeoDetection {
  const merged: Partial<GeoDetection> = {};
  for (const src of sources) {
    for (const [key, val] of Object.entries(src)) {
      if (val != null && val !== "") {
        (merged as any)[key] = val;
      }
    }
  }

  const entry = getCountryEntryOrDefault(merged.country || "AE");

  return {
    country: merged.country || entry.code,
    language: merged.language || entry.defaultLanguage || "en",
    currency: merged.currency || entry.currency || "AED",
    timezone: merged.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    city: merged.city,
    lat: merged.lat,
    lng: merged.lng,
    method: merged.method || "default",
    detectedAt: new Date().toISOString(),
  };
}

export function useGeoDetect() {
  const [detection, setDetection] = useState<GeoDetection | null>(getCachedDetection);
  const [loading, setLoading] = useState(!detection);

  const detect = useCallback(async () => {
    setLoading(true);
    try {
      const browser = detectFromBrowser();
      const gps = detectFromLocationStore();
      const ip = await detectFromIP();
      const result = mergeDetections(browser, gps, ip);
      cacheDetection(result);
      setDetection(result);
    } catch {
      const fallback = mergeDetections(detectFromBrowser());
      setDetection(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!detection) detect();
  }, [detection, detect]);

  return { detection, loading, refresh: detect };
}

export function detectLocationFromTimezone(): { country?: string; currency?: string; city?: string } {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const parts = tz.split("/");
  const cityRaw = parts[parts.length - 1]?.replace(/_/g, " ") || "";

  const tzMap: Record<string, { country: string; currency: string }> = {
    "Asia/Dubai": { country: "AE", currency: "AED" },
    "Europe/Paris": { country: "FR", currency: "EUR" },
    "Europe/London": { country: "GB", currency: "GBP" },
    "America/New_York": { country: "US", currency: "USD" },
    "Asia/Riyadh": { country: "SA", currency: "SAR" },
    "Africa/Casablanca": { country: "MA", currency: "MAD" },
  };

  const match = tzMap[tz];
  return {
    country: match?.country,
    currency: match?.currency,
    city: cityRaw || undefined,
  };
}
