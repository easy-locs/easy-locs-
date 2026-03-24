/**
 * Google Parser — Transforms Google Maps / Business data into canonical format.
 */
import type { CanonicalShopData } from "./canonical-format";

export function parseGoogleData(raw: any): CanonicalShopData {
  return {
    name: raw.name || raw.title || "",
    description: raw.description || raw.editorial_summary?.text || undefined,
    source_key: "google_maps",
    source_external_id: raw.place_id || raw.id?.toString() || undefined,
    source_url: raw.url || raw.google_maps_url || undefined,
    vertical: mapGoogleTypeToVertical(raw.types || raw.categories || []),
    category: raw.primary_type || raw.category || undefined,
    cuisine_tags: extractGoogleTags(raw),
    address: raw.formatted_address || raw.address || undefined,
    city: extractCity(raw),
    area: raw.vicinity || raw.neighborhood || undefined,
    country: extractCountry(raw),
    lat: raw.geometry?.location?.lat || raw.latitude || raw.lat || undefined,
    lng: raw.geometry?.location?.lng || raw.longitude || raw.lng || undefined,
    phone: raw.formatted_phone_number || raw.international_phone_number || raw.phone || undefined,
    website: raw.website || undefined,
    logo_url: undefined, // Google doesn't provide logos
    cover_url: raw.photos?.[0]?.url || raw.photos?.[0]?.photo_reference || undefined,
    images: (raw.photos || []).slice(0, 10).map((p: any) => p.url || p.photo_reference).filter(Boolean),
    menu_sections: [], // Google doesn't provide structured menus
    menu_items: [],
    rating: raw.rating || undefined,
    reviews_count: raw.user_ratings_total || raw.reviews_count || undefined,
    price_level: raw.price_level || undefined,
    hours: parseGoogleHours(raw.opening_hours || raw.hours),
    delivery_available: raw.delivery !== false,
    dine_in: raw.dine_in,
    takeaway: raw.takeout,
    raw_payload: raw,
  };
}

function mapGoogleTypeToVertical(types: string[]): string {
  const t = types.map(x => x.toLowerCase());
  if (t.some(x => ["restaurant", "food", "cafe", "bakery", "bar", "meal_delivery", "meal_takeaway"].includes(x))) return "food";
  if (t.some(x => ["lodging", "hotel", "resort"].includes(x))) return "property";
  if (t.some(x => ["pharmacy", "hospital", "doctor", "health", "dentist"].includes(x))) return "healthcare";
  if (t.some(x => ["grocery_or_supermarket", "supermarket", "convenience_store"].includes(x))) return "grocery";
  if (t.some(x => ["store", "shopping_mall", "clothing_store", "electronics_store"].includes(x))) return "shops";
  return "services";
}

function extractGoogleTags(raw: any): string[] {
  const tags: string[] = [];
  if (Array.isArray(raw.types)) tags.push(...raw.types);
  return [...new Set(tags.map(t => t.toLowerCase().replace(/_/g, " ").trim()).filter(Boolean))];
}

function extractCity(raw: any): string | undefined {
  if (raw.city) return raw.city;
  const comp = raw.address_components || [];
  const city = comp.find((c: any) => c.types?.includes("locality"));
  return city?.long_name || undefined;
}

function extractCountry(raw: any): string | undefined {
  if (raw.country) return raw.country;
  const comp = raw.address_components || [];
  const country = comp.find((c: any) => c.types?.includes("country"));
  return country?.short_name || undefined;
}

function parseGoogleHours(hours: any): Record<string, string> | undefined {
  if (!hours?.weekday_text) return undefined;
  const result: Record<string, string> = {};
  for (const line of hours.weekday_text) {
    const [day, ...rest] = line.split(": ");
    if (day) result[day.toLowerCase()] = rest.join(": ");
  }
  return result;
}
