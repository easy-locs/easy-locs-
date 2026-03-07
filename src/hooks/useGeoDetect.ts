/**
 * Smart Geolocation Detection — IP + GPS + Browser locale.
 * Auto-detects user's country, language, and currency on first visit.
 * Caches result in localStorage to avoid repeated API calls.
 */

import { useState, useEffect, useCallback } from "react";
import { getCountryEntryOrDefault, type CountryEntry } from "@/lib/global-country-registry";

export interface GeoDetection {
  country: string;       // ISO 3166-1 alpha-2
  language: string;       // BCP-47 language tag
  currency: string;       // ISO 4217 currency code
  timezone: string;
  city?: string;
  lat?: number;
  lng?: number;
  method: "ip" | "gps" | "browser" | "cached" | "default";
  detectedAt: string;
}

const CACHE_KEY = "easylocs_geo_detect";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedDetection(): GeoDetection | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as GeoDetection & { _ts: number };
    if (Date.now() - cached._ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return { ...cached, method: "cached" };
  } catch {
    return null;
  }
}

function cacheDetection(detection: GeoDetection) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...detection, _ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

/** Extract country from browser locale (e.g. "fr-FR" → "FR") */
function detectFromBrowser(): Partial<GeoDetection> {
  const locale = navigator.language || (navigator as any).userLanguage || "en-US";
  const parts = locale.split("-");
  const language = parts[0]?.toLowerCase() || "en";
  const country = parts[1]?.toUpperCase() || "";

  return {
    language,
    country: country || undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    method: "browser",
  };
}

/** Detect country via free IP geolocation API */
async function detectFromIP(): Promise<Partial<GeoDetection>> {
  // Try ip-api.com (free, no key, 45 req/min)
  try {
    const res = await fetch("https://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon,timezone,currency", {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        return {
          country: data.countryCode,
          city: data.city,
          lat: data.lat,
          lng: data.lon,
          timezone: data.timezone,
          currency: data.currency,
          method: "ip",
        };
      }
    }
  } catch { /* timeout or network error */ }

  // Fallback: ipapi.co
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.country_code) {
        return {
          country: data.country_code,
          city: data.city,
          lat: data.latitude,
          lng: data.longitude,
          timezone: data.timezone,
          currency: data.currency,
          method: "ip",
        };
      }
    }
  } catch { /* ignore */ }

  return {};
}

/** Optional GPS refinement */
function detectFromGPS(): Promise<Partial<GeoDetection>> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          method: "gps",
        });
      },
      () => resolve({}),
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
}

function buildFullDetection(parts: Partial<GeoDetection>[]): GeoDetection {
  const merged: Partial<GeoDetection> = {};

  // Merge in priority order (later overrides earlier for non-null values)
  for (const part of parts) {
    for (const [key, val] of Object.entries(part)) {
      if (val !== undefined && val !== null && val !== "") {
        (merged as any)[key] = val;
      }
    }
  }

  const country = merged.country || "US";
  const entry = getCountryEntryOrDefault(country);

  return {
    country,
    language: merged.language || entry.locale.split("-")[0] || "en",
    currency: merged.currency || entry.currency,
    timezone: merged.timezone || entry.timezone,
    city: merged.city,
    lat: merged.lat,
    lng: merged.lng,
    method: merged.method || "default",
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Main hook — detects user's geolocation on mount.
 * Priority: cache → IP → browser → GPS (for coordinates refinement)
 */
export function useGeoDetect() {
  const [detection, setDetection] = useState<GeoDetection | null>(getCachedDetection);
  const [loading, setLoading] = useState(!detection);

  useEffect(() => {
    if (detection) return; // Already have cached result

    let cancelled = false;

    (async () => {
      const browserData = detectFromBrowser();
      const ipData = await detectFromIP();

      if (cancelled) return;

      // GPS is optional — don't block on it
      const gpsPromise = detectFromGPS();
      const gpsData = await Promise.race([
        gpsPromise,
        new Promise<Partial<GeoDetection>>((r) => setTimeout(() => r({}), 3000)),
      ]);

      if (cancelled) return;

      const result = buildFullDetection([browserData, ipData, gpsData]);
      cacheDetection(result);
      setDetection(result);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [detection]);

  /** Force re-detection (clears cache) */
  const redetect = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    setDetection(null);
    setLoading(true);
  }, []);

  /** Manually override country */
  const setCountry = useCallback((country: string) => {
    const entry = getCountryEntryOrDefault(country);
    const updated: GeoDetection = {
      ...(detection || buildFullDetection([])),
      country,
      currency: entry.currency,
      language: entry.locale.split("-")[0] || "en",
      timezone: entry.timezone,
      method: "default",
      detectedAt: new Date().toISOString(),
    };
    cacheDetection(updated);
    setDetection(updated);
  }, [detection]);

  return {
    detection,
    loading,
    redetect,
    setCountry,
    country: detection?.country || "US",
    language: detection?.language || "en",
    currency: detection?.currency || "USD",
    timezone: detection?.timezone || "UTC",
  };
}
