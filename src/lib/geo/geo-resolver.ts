/**
 * geo-resolver — Atomic unit: resolve geographic coordinates to structured address.
 * Single responsibility: coordinate → address resolution.
 */
import { reportHealth } from "@/lib/runtime/health-aggregator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[GEO][${step}] ${phase}:`, payload ?? {});
};

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface ResolvedAddress {
  formatted: string;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  postalCode: string | null;
  street: string | null;
}

export async function reverseGeocode(coords: GeoCoords): Promise<ResolvedAddress | null> {
  trace("reverse", "input", coords);
  const start = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) {
      trace("reverse", "error", { status: res.status });
      reportHealth("geo", "degraded", Date.now() - start, `HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const addr = data.address || {};
    const result: ResolvedAddress = {
      formatted: data.display_name || "",
      city: addr.city || addr.town || addr.village || null,
      country: addr.country || null,
      countryCode: addr.country_code?.toUpperCase() || null,
      postalCode: addr.postcode || null,
      street: [addr.road, addr.house_number].filter(Boolean).join(" ") || null,
    };

    const latency = Date.now() - start;
    trace("reverse", "output", { ...result, latency });
    reportHealth("geo", "ok", latency);
    return result;
  } catch (err: any) {
    trace("reverse", "error", { message: err.message });
    reportHealth("geo", "down", Date.now() - start, err.message);
    return null;
  }
}
