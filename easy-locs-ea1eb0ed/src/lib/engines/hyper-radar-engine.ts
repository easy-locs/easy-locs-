/**
 * Hyper Radar Engine — Orchestrates immersive discovery with contextual layers.
 * Combines heatmap, vibe density, smart guidance, and property previews.
 * V2: weighted scoring, seasonal awareness, result caching, richer guidance.
 */

export type RadarLayer = "food" | "stay" | "services" | "utility" | "mobility" | "nightlife" | "healthcare" | "shops" | "property" | "grocery" | "experiences";
export type VibeType = "calm" | "active" | "nightlife" | "business" | "family" | "luxury";
export type TimeSlot = "morning" | "lunch" | "afternoon" | "evening" | "night" | "late_night";

export interface RadarZone {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
  vibe: VibeType;
  vibeScore: number;
  crowdDensity: number;
  dominantCategory: string;
  activityScore: number;
  entities: number;
}

export interface SmartGuidance {
  id: string;
  type: "suggestion" | "transition" | "alert" | "discovery" | "trending";
  title: string;
  subtitle: string;
  icon: string;
  targetLat?: number;
  targetLng?: number;
  targetEntityId?: string;
  relevanceScore: number;
  accentColor?: string;
}

export interface HyperRadarState {
  layers: RadarLayer[];
  activeLayers: RadarLayer[];
  zones: RadarZone[];
  guidance: SmartGuidance[];
  timeSlot: TimeSlot;
  radiusKm: number;
  fullscreen: boolean;
}

export interface RadarStats {
  totalEntities: number;
  visibleEntities: number;
  activeCategories: number;
  avgRating: number;
  nearestDistance: number;
  hotspotCount: number;
}

const CATEGORY_SETS: Record<RadarLayer, string[]> = {
  food: ["restaurant", "food", "cafe", "bakery", "fast_food", "coffee", "pizza", "sushi", "burger", "bistro", "brasserie", "patisserie"],
  grocery: ["grocery", "supermarket", "mini_mart", "organic_store", "fruits_vegetables", "butcher", "dairy", "fish_market", "health_food"],
  stay: ["hotel", "hostel", "resort", "guesthouse", "villa", "riad", "airbnb", "lodge", "motel", "bed_breakfast", "glamping", "serviced_apartment"],
  services: ["service", "salon", "spa", "laundry", "repair", "veterinary", "cleaning", "handyman", "plumbing", "electrical"],
  utility: ["atm", "pharmacy", "bank", "exchange", "post_office", "gas_station", "fuel", "parking", "public_toilet"],
  mobility: ["driver", "taxi", "bus", "mobility", "rental", "car_rental", "station", "airport", "metro", "tram", "scooter", "bike"],
  nightlife: ["bar", "club", "lounge", "nightclub", "pub", "karaoke", "rooftop", "cocktail", "brewery"],
  healthcare: ["hospital", "clinic", "doctor", "dentist", "healthcare", "medical", "emergency", "optician", "physiotherapy", "mental_health"],
  shops: ["shop", "store", "boutique", "mall", "market", "retail", "clothing", "electronics", "jewelry", "fashion"],
  property: ["property", "real_estate", "apartment", "villa", "penthouse", "townhouse", "duplex", "studio", "office", "warehouse", "land", "commercial", "residential"],
  experiences: ["experience", "tour", "activity", "adventure", "safari", "diving", "hiking", "museum", "theme_park", "concert", "sports", "cruise", "water_sports"],
};

let _slotCache: { h: number; slot: TimeSlot } | null = null;

export function detectTimeSlot(hour?: number): TimeSlot {
  const h = hour ?? new Date().getHours();
  if (_slotCache && _slotCache.h === h) return _slotCache.slot;
  let slot: TimeSlot;
  if (h >= 6 && h < 10) slot = "morning";
  else if (h >= 10 && h < 14) slot = "lunch";
  else if (h >= 14 && h < 17) slot = "afternoon";
  else if (h >= 17 && h < 21) slot = "evening";
  else if (h >= 21 && h < 24) slot = "night";
  else slot = "late_night";
  _slotCache = { h, slot };
  return slot;
}

export function getRelevantLayers(slot: TimeSlot): RadarLayer[] {
  const map: Record<TimeSlot, RadarLayer[]> = {
    morning: ["food", "mobility", "services"],
    lunch: ["food", "services"],
    afternoon: ["food", "services", "stay", "utility"],
    evening: ["food", "nightlife", "stay"],
    night: ["nightlife", "food", "stay"],
    late_night: ["nightlife", "food", "mobility"],
  };
  return map[slot];
}

export function matchesLayer(category: string, layer: RadarLayer): boolean {
  const cat = category.toLowerCase();
  return CATEGORY_SETS[layer].some(t => cat.includes(t));
}

export function classifyVibe(entities: { category: string; rating?: number }[]): VibeType {
  if (entities.length === 0) return "calm";
  const counts: Record<string, number> = {};
  let totalRating = 0;
  let ratedCount = 0;
  entities.forEach(e => {
    counts[e.category] = (counts[e.category] || 0) + 1;
    if (e.rating) { totalRating += e.rating; ratedCount++; }
  });
  const avgRating = ratedCount > 0 ? totalRating / ratedCount : 3;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (["bar", "club", "lounge", "nightclub", "pub"].includes(top || "")) return "nightlife";
  if (["restaurant", "cafe", "bakery", "food", "bistro"].includes(top || "")) return avgRating >= 4.2 ? "luxury" : "active";
  if (["hotel", "resort", "spa", "villa"].includes(top || "")) return "luxury";
  if (["office", "coworking"].includes(top || "")) return "business";
  if (["park", "playground", "school"].includes(top || "")) return "family";
  return "calm";
}

export function generateGuidance(
  timeSlot: TimeSlot,
  userLat: number,
  userLng: number,
  nearbyEntities: { name: string; category: string; distanceKm: number; id: string; rating?: number }[]
): SmartGuidance[] {
  const guidance: SmartGuidance[] = [];
  const sorted = [...nearbyEntities].sort((a, b) => a.distanceKm - b.distanceKm);

  const findBest = (cats: string[], maxDist = 5) => {
    const matches = sorted.filter(e => cats.some(c => e.category.toLowerCase().includes(c)) && e.distanceKm <= maxDist);
    return matches.sort((a, b) => ((b.rating ?? 3) * 10 - b.distanceKm) - ((a.rating ?? 3) * 10 - a.distanceKm))[0];
  };

  const distLabel = (km: number) => km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;

  if (timeSlot === "morning") {
    const coffee = findBest(["cafe", "coffee", "bakery", "patisserie"], 3);
    if (coffee) {
      guidance.push({
        id: `guide-coffee-${coffee.id}`, type: "suggestion",
        title: `☕ ${coffee.name}`,
        subtitle: `${distLabel(coffee.distanceKm)} • ${coffee.rating ? `★${coffee.rating}` : "Popular"}`,
        icon: "coffee", targetEntityId: coffee.id, relevanceScore: 92, accentColor: "hsl(30 80% 55%)",
      });
    }
    const gym = findBest(["gym", "fitness", "sport"], 3);
    if (gym) {
      guidance.push({
        id: `guide-gym-${gym.id}`, type: "suggestion",
        title: `💪 ${gym.name}`,
        subtitle: `Start your day active • ${distLabel(gym.distanceKm)}`,
        icon: "dumbbell", targetEntityId: gym.id, relevanceScore: 75, accentColor: "hsl(140 60% 45%)",
      });
    }
  }

  if (timeSlot === "lunch" || timeSlot === "evening") {
    const food = findBest(["restaurant", "bistro", "brasserie", "food"], 3);
    if (food) {
      guidance.push({
        id: `guide-food-${food.id}`, type: "suggestion",
        title: `🍽️ ${food.name}`,
        subtitle: `${distLabel(food.distanceKm)} • ${food.rating ? `★${food.rating} Top rated` : "Nearby"}`,
        icon: "utensils", targetEntityId: food.id, relevanceScore: 95, accentColor: "hsl(15 80% 55%)",
      });
    }
  }

  if (timeSlot === "afternoon") {
    const shop = findBest(["shop", "mall", "boutique", "market"], 3);
    if (shop) {
      guidance.push({
        id: `guide-shop-${shop.id}`, type: "discovery",
        title: `🛍️ ${shop.name}`,
        subtitle: `Explore nearby • ${distLabel(shop.distanceKm)}`,
        icon: "shopping-bag", targetEntityId: shop.id, relevanceScore: 70, accentColor: "hsl(270 60% 55%)",
      });
    }
  }

  if (timeSlot === "night" || timeSlot === "late_night") {
    const nightlife = findBest(["bar", "club", "lounge", "rooftop"], 5);
    if (nightlife) {
      guidance.push({
        id: `guide-night-${nightlife.id}`, type: "suggestion",
        title: `🌙 ${nightlife.name}`,
        subtitle: `Hot tonight • ${distLabel(nightlife.distanceKm)}`,
        icon: "moon", targetEntityId: nightlife.id, relevanceScore: 88, accentColor: "hsl(280 70% 55%)",
      });
    }
  }

  const trending = sorted.filter(e => (e.rating ?? 0) >= 4.5).slice(0, 1)[0];
  if (trending && !guidance.find(g => g.targetEntityId === trending.id)) {
    guidance.push({
      id: `guide-trending-${trending.id}`, type: "trending",
      title: `🔥 ${trending.name}`,
      subtitle: `★${trending.rating} • Trending now • ${distLabel(trending.distanceKm)}`,
      icon: "trending-up", targetEntityId: trending.id, relevanceScore: 80, accentColor: "hsl(0 80% 55%)",
    });
  }

  const atm = findBest(["atm", "bank", "exchange"], 1);
  if (atm && atm.distanceKm < 1) {
    guidance.push({
      id: `guide-atm-${atm.id}`, type: "suggestion",
      title: `🏧 ${atm.name}`,
      subtitle: `${distLabel(atm.distanceKm)}`,
      icon: "banknote", targetEntityId: atm.id, relevanceScore: 55, accentColor: "hsl(140 50% 45%)",
    });
  }

  return guidance.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 6);
}

export function computeHeatmapIntensity(entities: { lat: number; lng: number; rating?: number; reviewsCount?: number }[]): { lat: number; lng: number; intensity: number }[] {
  const maxReviews = Math.max(1, ...entities.map(e => e.reviewsCount ?? 0));
  return entities.map(e => ({
    lat: e.lat,
    lng: e.lng,
    intensity: Math.min(1,
      ((e.rating ?? 3) / 5) * 0.4 +
      ((e.reviewsCount ?? 0) / maxReviews) * 0.35 +
      0.25
    ),
  }));
}

export function computeRadarStats(
  totalEntities: number,
  visibleEntities: { rating?: number; distance?: number; category?: string }[]
): RadarStats {
  const ratings = visibleEntities.filter(e => e.rating).map(e => e.rating!);
  const distances = visibleEntities.filter(e => e.distance !== undefined).map(e => e.distance!);
  const categories = new Set(visibleEntities.map(e => e.category).filter(Boolean));
  return {
    totalEntities,
    visibleEntities: visibleEntities.length,
    activeCategories: categories.size,
    avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0,
    nearestDistance: distances.length ? Math.min(...distances) : 0,
    hotspotCount: visibleEntities.filter(e => (e.rating ?? 0) >= 4.3).length,
  };
}
