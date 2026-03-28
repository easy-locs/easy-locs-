/**
 * OSM Places Engine — Fetches nearby POIs from OpenStreetMap Overpass API.
 * Provides Google Maps-like place density by querying real-world POIs.
 */

import { haversineKm } from "@/lib/geo/distance";

export interface OSMPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  subcategory: string;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
}

// OSM tag → our category mapping
const TAG_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  restaurant: { category: "food", subcategory: "restaurant" },
  cafe: { category: "food", subcategory: "cafe" },
  fast_food: { category: "food", subcategory: "fast_food" },
  bar: { category: "food", subcategory: "bar" },
  bakery: { category: "food", subcategory: "bakery" },
  ice_cream: { category: "food", subcategory: "ice_cream" },
  supermarket: { category: "grocery", subcategory: "supermarket" },
  convenience: { category: "grocery", subcategory: "convenience" },
  greengrocer: { category: "grocery", subcategory: "greengrocer" },
  butcher: { category: "grocery", subcategory: "butcher" },
  pharmacy: { category: "services", subcategory: "pharmacy" },
  hospital: { category: "services", subcategory: "hospital" },
  clinic: { category: "services", subcategory: "clinic" },
  dentist: { category: "services", subcategory: "dentist" },
  bank: { category: "services", subcategory: "bank" },
  atm: { category: "services", subcategory: "atm" },
  fuel: { category: "services", subcategory: "fuel_station" },
  car_wash: { category: "services", subcategory: "car_wash" },
  car_repair: { category: "services", subcategory: "car_repair" },
  hairdresser: { category: "services", subcategory: "salon" },
  beauty: { category: "services", subcategory: "beauty" },
  gym: { category: "services", subcategory: "gym" },
  fitness_centre: { category: "services", subcategory: "gym" },
  hotel: { category: "services", subcategory: "hotel" },
  clothes: { category: "shops", subcategory: "clothing" },
  shoes: { category: "shops", subcategory: "shoes" },
  electronics: { category: "shops", subcategory: "electronics" },
  mobile_phone: { category: "shops", subcategory: "mobile" },
  jewelry: { category: "shops", subcategory: "jewelry" },
  optician: { category: "shops", subcategory: "optician" },
  books: { category: "shops", subcategory: "bookstore" },
  furniture: { category: "shops", subcategory: "furniture" },
  hardware: { category: "shops", subcategory: "hardware" },
  mall: { category: "shops", subcategory: "mall" },
  department_store: { category: "shops", subcategory: "department_store" },
  mosque: { category: "services", subcategory: "mosque" },
  school: { category: "services", subcategory: "school" },
  kindergarten: { category: "services", subcategory: "kindergarten" },
  parking: { category: "services", subcategory: "parking" },
  post_office: { category: "services", subcategory: "post_office" },
  laundry: { category: "services", subcategory: "laundry" },
};

// Build Overpass query for nearby amenities/shops
function buildOverpassQuery(lat: number, lng: number, radiusM: number = 2000): string {
  return `
[out:json][timeout:10];
(
  node["amenity"~"restaurant|cafe|fast_food|bar|bakery|ice_cream|pharmacy|hospital|clinic|dentist|bank|atm|fuel|car_wash|car_repair|school|kindergarten|post_office"](around:${radiusM},${lat},${lng});
  node["shop"~"supermarket|convenience|greengrocer|butcher|clothes|shoes|electronics|mobile_phone|jewelry|optician|books|furniture|hardware|mall|department_store|hairdresser|beauty|laundry"](around:${radiusM},${lat},${lng});
  node["leisure"~"fitness_centre|gym"](around:${radiusM},${lat},${lng});
  node["tourism"~"hotel"](around:${radiusM},${lat},${lng});
);
out body 300;
`.trim();
}

function classifyElement(tags: Record<string, string>): { category: string; subcategory: string } {
  for (const key of ["amenity", "shop", "leisure", "tourism"]) {
    const val = tags[key];
    if (val && TAG_CATEGORY_MAP[val]) return TAG_CATEGORY_MAP[val];
  }
  return { category: "services", subcategory: "other" };
}

// In-memory cache to avoid hammering Overpass
const cache = new Map<string, { data: OSMPlace[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function cacheKey(lat: number, lng: number, radius: number): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${radius}`;
}

export async function fetchOSMPlaces(
  lat: number,
  lng: number,
  opts?: { radiusM?: number; limit?: number }
): Promise<OSMPlace[]> {
  const radiusM = opts?.radiusM ?? 2000;
  const limit = opts?.limit ?? 200;
  const key = cacheKey(lat, lng, radiusM);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data.slice(0, limit);
  }

  try {
    const query = buildOverpassQuery(lat, lng, radiusM);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      console.warn("[OSM] Overpass returned", res.status);
      return [];
    }

    const json = await res.json();
    const elements: any[] = json.elements ?? [];

    const places: OSMPlace[] = elements
      .filter((el: any) => el.lat && el.lon && el.tags?.name)
      .map((el: any) => {
        const { category, subcategory } = classifyElement(el.tags);
        return {
          id: `osm-${el.id}`,
          name: el.tags.name,
          lat: el.lat,
          lng: el.lon,
          category,
          subcategory,
          address: [el.tags["addr:street"], el.tags["addr:housenumber"]].filter(Boolean).join(" ") || undefined,
          phone: el.tags.phone || el.tags["contact:phone"] || undefined,
          website: el.tags.website || el.tags["contact:website"] || undefined,
          openingHours: el.tags.opening_hours || undefined,
        };
      })
      .sort((a, b) => {
        const dA = haversineKm(lat, lng, a.lat, a.lng);
        const dB = haversineKm(lat, lng, b.lat, b.lng);
        return dA - dB;
      })
      .slice(0, limit);

    cache.set(key, { data: places, ts: Date.now() });
    return places;
  } catch (err) {
    console.error("[OSM] Fetch failed:", err);
    return [];
  }
}

/** Convert OSM category to radar category */
export function osmCategoryToRadarCategory(cat: string): string {
  switch (cat) {
    case "food": return "food";
    case "grocery": return "grocery";
    case "shops": return "shops";
    default: return "services";
  }
}
