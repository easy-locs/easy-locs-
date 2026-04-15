interface CachedPrayerData {
  prayers: Array<{ name: string; time: string }>;
  date: string;
  lat: number;
  lng: number;
  fetchedAt: number;
}

let _cachedPrayers: CachedPrayerData | null = null;
let _refreshTimer: ReturnType<typeof setInterval> | null = null;

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  AE: { lat: 25.2048, lng: 55.2708 },
  SA: { lat: 24.7136, lng: 46.6753 },
  EG: { lat: 30.0444, lng: 31.2357 },
  MA: { lat: 33.5731, lng: -7.5898 },
  NG: { lat: 9.0579, lng: 7.4951 },
  PK: { lat: 33.6844, lng: 73.0479 },
  TR: { lat: 39.9334, lng: 32.8597 },
  ID: { lat: -6.2088, lng: 106.8456 },
};

const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

async function fetchPrayerTimes(lat: number, lng: number): Promise<Array<{ name: string; time: string }> | null> {
  try {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=2`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const json = await r.json();
    const timings = json?.data?.timings;
    if (!timings) return null;
    return PRAYER_NAMES.map(name => ({
      name,
      time: timings[name]?.replace(/\s*\(.*\)/, "") ?? "",
    })).filter(p => p.time);
  } catch {
    return null;
  }
}

export function getPrayerServiceCache(): CachedPrayerData | null {
  return _cachedPrayers;
}

export { getPrayerServiceCache as getPrayerEngineCache };

export async function refreshPrayerTimes(): Promise<CachedPrayerData | null> {
  const today = new Date().toDateString();
  if (_cachedPrayers && _cachedPrayers.date === today && Date.now() - _cachedPrayers.fetchedAt < 600_000) {
    return _cachedPrayers;
  }

  let lat: number | null = null;
  let lng: number | null = null;

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (geoErr) {
      console.warn("[prayer-service] Geolocation unavailable, using fallback:", geoErr);
    }
  }

  if (lat === null || lng === null) {
    const fallback = COUNTRY_COORDS["AE"];
    lat = fallback.lat;
    lng = fallback.lng;
  }

  const prayers = await fetchPrayerTimes(lat, lng);

  if (prayers && prayers.length > 0) {
    _cachedPrayers = { prayers, date: today, lat, lng, fetchedAt: Date.now() };
    try {
      const { platformBus } = await import("@/lib/shared/platform-bus");
      platformBus.emit("prayer.times.updated", {
        prayerCount: prayers.length, date: today, fetchedAt: _cachedPrayers.fetchedAt,
      }, "data");
    } catch (err) {
      console.warn("[prayer-service] Failed to emit bus event:", err);
    }
  }

  return _cachedPrayers;
}

export function stopPrayerService(): void {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
    console.log("[prayer-service] Stopped");
  }
}

export function startPrayerService(intervalMs = 120_000): () => void {
  if (_refreshTimer) return () => {};
  refreshPrayerTimes();
  _refreshTimer = setInterval(() => {
    if (!document.hidden) refreshPrayerTimes();
  }, intervalMs);
  return () => {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  };
}
