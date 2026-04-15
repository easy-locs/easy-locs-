const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export interface NominatimResult {
  lat: number;
  lng: number;
  displayName: string;
  confidence: number;
}

export async function geocodeAddress(params: {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}): Promise<NominatimResult | null> {
  const parts = [params.name, params.address, params.city, params.country].filter(Boolean);
  const query = parts.join(", ");
  if (!query || query.length < 3) return null;

  try {
    const url = `${NOMINATIM_BASE}/search?${new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
      addressdetails: "1",
    })}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "EasyLocs-Onboarding/1.0" },
    });

    if (!res.ok) return null;

    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string; importance: number }>;
    if (!data.length) return null;

    const top = data[0];
    const lat = parseFloat(top.lat);
    const lng = parseFloat(top.lon);

    if (isNaN(lat) || isNaN(lng)) return null;

    return {
      lat,
      lng,
      displayName: top.display_name,
      confidence: Math.min(1, (top.importance ?? 0.5) + 0.2),
    };
  } catch (err) {
    console.warn("[nominatim] geocode failed:", err);
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string | null;
  city: string | null;
  country: string | null;
} | null> {
  try {
    const url = `${NOMINATIM_BASE}/reverse?${new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "json",
    })}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "EasyLocs-Onboarding/1.0" },
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      display_name: string;
      address?: { city?: string; town?: string; village?: string; country?: string; road?: string };
    };

    return {
      address: data.display_name ?? null,
      city: data.address?.city ?? data.address?.town ?? data.address?.village ?? null,
      country: data.address?.country ?? null,
    };
  } catch {
    return null;
  }
}
