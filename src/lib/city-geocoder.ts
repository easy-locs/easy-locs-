/**
 * Lightweight city geocoder with in-memory + localStorage cache.
 * Uses Nominatim (free) to resolve city names to lat/lng coordinates.
 * Rate-limited to 1 req/s per Nominatim policy.
 */

const STORAGE_KEY = "easylocs_city_coords";
const MAX_CACHE = 500;

interface CityCoords {
  lat: number;
  lng: number;
}

// In-memory cache for session
const memCache = new Map<string, CityCoords | null>();

function loadStorageCache(): Record<string, CityCoords> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStorageCache(cache: Record<string, CityCoords>) {
  try {
    // Prune to MAX_CACHE entries
    const entries = Object.entries(cache);
    if (entries.length > MAX_CACHE) {
      cache = Object.fromEntries(entries.slice(-MAX_CACHE));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded */ }
}

/** Normalize city key for cache lookup */
function cityKey(city: string, country?: string): string {
  const c = city.trim().toLowerCase();
  const co = country?.trim().toLowerCase() || "";
  return co ? `${c}|${co}` : c;
}

/** Queue for rate-limiting Nominatim requests */
let lastRequestTime = 0;

async function geocodeCity(city: string, country?: string): Promise<CityCoords | null> {
  const query = country ? `${city}, ${country}` : city;

  // Rate limit: 1 req/s
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequestTime));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTime = Date.now();

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* timeout/network */ }
  return null;
}

/**
 * Get coordinates for a city, using cache first, then Nominatim.
 */
export async function getCityCoords(city: string, country?: string): Promise<CityCoords | null> {
  if (!city) return null;
  const key = cityKey(city, country);

  // Check memory cache
  if (memCache.has(key)) return memCache.get(key) || null;

  // Check localStorage cache
  const stored = loadStorageCache();
  if (stored[key]) {
    memCache.set(key, stored[key]);
    return stored[key];
  }

  // Geocode via Nominatim
  const coords = await geocodeCity(city, country);
  memCache.set(key, coords);
  if (coords) {
    stored[key] = coords;
    saveStorageCache(stored);
  }

  return coords;
}

/**
 * Batch geocode multiple cities. Returns a map of cityKey → coords.
 * Only geocodes cities not already in cache, up to maxNew new lookups.
 */
export async function batchGeocideCities(
  cities: Array<{ city: string; country?: string }>,
  maxNew = 10
): Promise<Map<string, CityCoords>> {
  const result = new Map<string, CityCoords>();
  const stored = loadStorageCache();
  const toGeocode: Array<{ city: string; country?: string; key: string }> = [];

  for (const { city, country } of cities) {
    if (!city) continue;
    const key = cityKey(city, country);
    if (result.has(key)) continue;

    // Check caches
    if (memCache.has(key)) {
      const c = memCache.get(key);
      if (c) result.set(key, c);
      continue;
    }
    if (stored[key]) {
      memCache.set(key, stored[key]);
      result.set(key, stored[key]);
      continue;
    }

    toGeocode.push({ city, country, key });
  }

  // Geocode up to maxNew new cities (rate limited)
  for (const item of toGeocode.slice(0, maxNew)) {
    const coords = await geocodeCity(item.city, item.country);
    memCache.set(item.key, coords);
    if (coords) {
      result.set(item.key, coords);
      stored[item.key] = coords;
    }
  }

  saveStorageCache(stored);
  return result;
}

export { type CityCoords, cityKey };
