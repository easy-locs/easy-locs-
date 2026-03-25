/**
 * Behavior Pattern Engine — Analyzes aggregated behavior patterns by zone, time, and season.
 * Privacy-first: all data is anonymized and aggregated, never individual.
 */

export type ZoneActivityCategory = "food" | "nightlife" | "tourism" | "business" | "family" | "services" | "shopping" | "wellness";

export interface ZoneProfile {
  zoneId: string;
  lat: number;
  lng: number;
  radiusKm: number;
  activityScore: number; // 0-100
  dominantCategory: ZoneActivityCategory;
  categoryBreakdown: Record<ZoneActivityCategory, number>;
  peakHours: number[]; // [11, 12, 13, 19, 20, 21]
  seasonalTrend: "high" | "medium" | "low";
  entityCount: number;
}

export interface ZoneRhythm {
  timeSlot: string;
  dominantActivity: ZoneActivityCategory;
  activityLevel: number; // 0-100
  suggestedActions: string[];
}

export interface PlaceConnection {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  connectionType: "proximity" | "complementary" | "sequential";
  strength: number; // 0-1
}

export interface FlowPrediction {
  nextBestAction: string;
  confidence: number;
  suggestedEntityId?: string;
  suggestedCategory: string;
  reason: string;
}

/** Time slot mapping for zone rhythms */
const TIME_RHYTHMS: Record<string, { dominant: ZoneActivityCategory; actions: string[] }> = {
  "06-09": { dominant: "food", actions: ["Coffee nearby", "Breakfast spots", "Taxi to work"] },
  "09-12": { dominant: "business", actions: ["Coworking spaces", "Business services"] },
  "12-14": { dominant: "food", actions: ["Lunch restaurants", "Quick delivery", "Healthy options"] },
  "14-17": { dominant: "services", actions: ["Shopping", "Services", "Appointments"] },
  "17-19": { dominant: "wellness", actions: ["Gym", "Spa", "After-work drinks"] },
  "19-22": { dominant: "food", actions: ["Dinner restaurants", "Lounges", "Family dining"] },
  "22-02": { dominant: "nightlife", actions: ["Bars", "Clubs", "Late-night food"] },
  "02-06": { dominant: "services", actions: ["24h pharmacy", "Late-night transport"] },
};

/** Get zone rhythm for current time */
export function getZoneRhythm(hour: number): ZoneRhythm {
  let slot = "02-06";
  if (hour >= 6 && hour < 9) slot = "06-09";
  else if (hour >= 9 && hour < 12) slot = "09-12";
  else if (hour >= 12 && hour < 14) slot = "12-14";
  else if (hour >= 14 && hour < 17) slot = "14-17";
  else if (hour >= 17 && hour < 19) slot = "17-19";
  else if (hour >= 19 && hour < 22) slot = "19-22";
  else if (hour >= 22 || hour < 2) slot = "22-02";

  const rhythm = TIME_RHYTHMS[slot];
  return {
    timeSlot: slot,
    dominantActivity: rhythm.dominant,
    activityLevel: slot === "12-14" || slot === "19-22" ? 85 : slot === "22-02" ? 70 : 50,
    suggestedActions: rhythm.actions,
  };
}

/** Build zone profile from entity data */
export function buildZoneProfile(
  zoneId: string,
  lat: number,
  lng: number,
  entities: { category: string; rating?: number; reviewsCount?: number }[]
): ZoneProfile {
  const breakdown: Record<ZoneActivityCategory, number> = {
    food: 0, nightlife: 0, tourism: 0, business: 0, family: 0, services: 0, shopping: 0, wellness: 0,
  };

  const categoryMap: Record<string, ZoneActivityCategory> = {
    restaurant: "food", cafe: "food", bakery: "food", fast_food: "food", food: "food",
    bar: "nightlife", club: "nightlife", lounge: "nightlife", nightclub: "nightlife",
    hotel: "tourism", resort: "tourism", attraction: "tourism",
    office: "business", coworking: "business",
    park: "family", playground: "family", school: "family",
    shop: "shopping", mall: "shopping", grocery: "shopping",
    gym: "wellness", spa: "wellness", salon: "wellness",
  };

  entities.forEach(e => {
    const cat = categoryMap[e.category] || "services";
    breakdown[cat]++;
  });

  const dominant = (Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "services") as ZoneActivityCategory;
  const activityScore = Math.min(100, entities.length * 3 + entities.reduce((sum, e) => sum + (e.rating ?? 3), 0) / Math.max(1, entities.length) * 10);

  return {
    zoneId,
    lat,
    lng,
    radiusKm: 1,
    activityScore: Math.round(activityScore),
    dominantCategory: dominant,
    categoryBreakdown: breakdown,
    peakHours: [12, 13, 19, 20, 21],
    seasonalTrend: "medium",
    entityCount: entities.length,
  };
}

/** Generate place connections from proximity and category */
export function generatePlaceConnections(
  entities: { id: string; name: string; category: string; lat: number; lng: number }[]
): PlaceConnection[] {
  const connections: PlaceConnection[] = [];
  const complementary: Record<string, string[]> = {
    restaurant: ["hotel", "bar", "cafe"],
    hotel: ["restaurant", "spa", "taxi", "exchange"],
    bar: ["restaurant", "club", "taxi"],
    airport: ["hotel", "taxi", "exchange", "restaurant"],
    mall: ["restaurant", "cinema", "taxi"],
    beach: ["cafe", "restaurant", "hotel", "lounge"],
  };

  for (let i = 0; i < entities.length && i < 50; i++) {
    const from = entities[i];
    const complements = complementary[from.category] || [];
    for (let j = 0; j < entities.length && j < 50; j++) {
      if (i === j) continue;
      const to = entities[j];
      if (complements.includes(to.category)) {
        const dist = Math.sqrt(Math.pow(from.lat - to.lat, 2) + Math.pow(from.lng - to.lng, 2));
        if (dist < 0.02) { // ~2km
          connections.push({
            fromId: from.id,
            fromName: from.name,
            toId: to.id,
            toName: to.name,
            connectionType: "complementary",
            strength: Math.max(0, 1 - dist * 50),
          });
        }
      }
    }
  }
  return connections.sort((a, b) => b.strength - a.strength).slice(0, 20);
}

/** Predict next user action based on time and context */
export function predictNextAction(
  hour: number,
  recentCategories: string[],
  nearbyCategories: string[]
): FlowPrediction {
  const rhythm = getZoneRhythm(hour);

  // If user visited food recently, suggest complementary
  if (recentCategories.includes("restaurant") || recentCategories.includes("food")) {
    if (nearbyCategories.includes("cafe")) {
      return { nextBestAction: "Coffee after meal", confidence: 0.7, suggestedCategory: "cafe", reason: "Post-meal coffee suggestion" };
    }
    if (nearbyCategories.includes("bar") && hour >= 19) {
      return { nextBestAction: "Drinks nearby", confidence: 0.6, suggestedCategory: "bar", reason: "Evening drinks after dinner" };
    }
  }

  return {
    nextBestAction: rhythm.suggestedActions[0] || "Explore nearby",
    confidence: 0.5,
    suggestedCategory: rhythm.dominantActivity,
    reason: `Based on time (${rhythm.timeSlot}) and local activity`,
  };
}
