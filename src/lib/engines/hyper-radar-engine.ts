/**
 * Hyper Radar Engine — Orchestrates immersive discovery with contextual layers.
 * Combines heatmap, vibe density, smart guidance, and property previews.
 */

export type RadarLayer = "food" | "stay" | "services" | "utility" | "mobility" | "nightlife";
export type VibeType = "calm" | "active" | "nightlife" | "business" | "family" | "luxury";
export type TimeSlot = "morning" | "lunch" | "afternoon" | "evening" | "night" | "late_night";

export interface RadarZone {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
  vibe: VibeType;
  vibeScore: number; // 0-100
  crowdDensity: number; // 0-100
  dominantCategory: string;
  activityScore: number;
  entities: number;
}

export interface SmartGuidance {
  id: string;
  type: "suggestion" | "transition" | "alert";
  title: string;
  subtitle: string;
  icon: string;
  targetLat?: number;
  targetLng?: number;
  targetEntityId?: string;
  relevanceScore: number;
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

/** Detect current time slot */
export function detectTimeSlot(hour?: number): TimeSlot {
  const h = hour ?? new Date().getHours();
  if (h >= 6 && h < 10) return "morning";
  if (h >= 10 && h < 14) return "lunch";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  if (h >= 21 && h < 24) return "night";
  return "late_night";
}

/** Map time slots to relevant layers */
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

/** Classify a zone's vibe from entity distribution */
export function classifyVibe(entities: { category: string; rating?: number }[]): VibeType {
  if (entities.length === 0) return "calm";
  const counts: Record<string, number> = {};
  entities.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (["bar", "club", "lounge", "nightclub"].includes(top || "")) return "nightlife";
  if (["restaurant", "cafe", "bakery", "food"].includes(top || "")) return "active";
  if (["hotel", "resort", "spa"].includes(top || "")) return "luxury";
  if (["office", "coworking"].includes(top || "")) return "business";
  if (["park", "playground", "school"].includes(top || "")) return "family";
  return "calm";
}

/** Generate smart guidance based on user context */
export function generateGuidance(
  timeSlot: TimeSlot,
  userLat: number,
  userLng: number,
  nearbyEntities: { name: string; category: string; distanceKm: number; id: string }[]
): SmartGuidance[] {
  const guidance: SmartGuidance[] = [];
  const sorted = [...nearbyEntities].sort((a, b) => a.distanceKm - b.distanceKm);

  // Time-based suggestions
  if (timeSlot === "morning") {
    const coffee = sorted.find(e => ["cafe", "coffee", "bakery"].includes(e.category));
    if (coffee) {
      guidance.push({
        id: `guide-coffee-${coffee.id}`,
        type: "suggestion",
        title: `☕ ${coffee.name}`,
        subtitle: `Best coffee ${Math.round(coffee.distanceKm * 1000)}m away`,
        icon: "coffee",
        targetEntityId: coffee.id,
        relevanceScore: 90,
      });
    }
  }

  if (timeSlot === "lunch" || timeSlot === "evening") {
    const food = sorted.find(e => ["restaurant", "fast_food", "food"].includes(e.category));
    if (food) {
      guidance.push({
        id: `guide-food-${food.id}`,
        type: "suggestion",
        title: `🍽️ ${food.name}`,
        subtitle: `${Math.round(food.distanceKm * 1000)}m • Top rated nearby`,
        icon: "utensils",
        targetEntityId: food.id,
        relevanceScore: 95,
      });
    }
  }

  if (timeSlot === "night" || timeSlot === "late_night") {
    const nightlife = sorted.find(e => ["bar", "club", "lounge"].includes(e.category));
    if (nightlife) {
      guidance.push({
        id: `guide-night-${nightlife.id}`,
        type: "suggestion",
        title: `🌙 ${nightlife.name}`,
        subtitle: `Where it moves tonight • ${Math.round(nightlife.distanceKm * 1000)}m`,
        icon: "moon",
        targetEntityId: nightlife.id,
        relevanceScore: 85,
      });
    }
  }

  // Utility suggestions (always relevant)
  const atm = sorted.find(e => ["atm", "bank", "exchange"].includes(e.category));
  if (atm && atm.distanceKm < 1) {
    guidance.push({
      id: `guide-atm-${atm.id}`,
      type: "suggestion",
      title: `🏧 ${atm.name}`,
      subtitle: `${Math.round(atm.distanceKm * 1000)}m away`,
      icon: "banknote",
      targetEntityId: atm.id,
      relevanceScore: 60,
    });
  }

  return guidance.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
}

/** Compute heatmap intensity for a set of points */
export function computeHeatmapIntensity(entities: { lat: number; lng: number; rating?: number; reviewsCount?: number }[]): { lat: number; lng: number; intensity: number }[] {
  return entities.map(e => ({
    lat: e.lat,
    lng: e.lng,
    intensity: Math.min(1, ((e.rating ?? 3) / 5) * 0.5 + ((e.reviewsCount ?? 0) / 100) * 0.3 + 0.2),
  }));
}
