/**
 * Behavior Pattern Engine — Analyzes aggregated behavior patterns by zone, time, and season.
 * Privacy-first: all data is anonymized and aggregated, never individual.
 * V2: richer rhythms, seasonal awareness, smarter connections, flow chaining.
 */

export type ZoneActivityCategory = "food" | "nightlife" | "tourism" | "business" | "family" | "services" | "shopping" | "wellness" | "cultural";

export interface ZoneProfile {
  zoneId: string;
  lat: number;
  lng: number;
  radiusKm: number;
  activityScore: number;
  dominantCategory: ZoneActivityCategory;
  categoryBreakdown: Record<ZoneActivityCategory, number>;
  peakHours: number[];
  seasonalTrend: "high" | "medium" | "low";
  entityCount: number;
  qualityScore: number;
}

export interface ZoneRhythm {
  timeSlot: string;
  dominantActivity: ZoneActivityCategory;
  activityLevel: number;
  suggestedActions: string[];
  emoji: string;
  transitionHint: string;
}

export interface PlaceConnection {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  connectionType: "proximity" | "complementary" | "sequential";
  strength: number;
}

export interface FlowPrediction {
  nextBestAction: string;
  confidence: number;
  suggestedEntityId?: string;
  suggestedCategory: string;
  reason: string;
  alternativeActions: string[];
}

const TIME_RHYTHMS: Record<string, { dominant: ZoneActivityCategory; actions: string[]; emoji: string; transition: string }> = {
  "06-09": { dominant: "food", actions: ["Coffee nearby", "Breakfast spots", "Morning walk", "Taxi to work"], emoji: "🌅", transition: "Morning rush approaching" },
  "09-12": { dominant: "business", actions: ["Coworking spaces", "Business services", "Meeting rooms"], emoji: "💼", transition: "Lunch spots filling up" },
  "12-14": { dominant: "food", actions: ["Lunch restaurants", "Quick delivery", "Healthy options", "Food courts"], emoji: "🍽️", transition: "Afternoon quiet coming" },
  "14-17": { dominant: "services", actions: ["Shopping", "Services", "Appointments", "Errands"], emoji: "🛍️", transition: "Evening scene starting" },
  "17-19": { dominant: "wellness", actions: ["Gym", "Spa", "After-work drinks", "Sunset spots"], emoji: "🌇", transition: "Dinner time approaching" },
  "19-22": { dominant: "food", actions: ["Dinner restaurants", "Lounges", "Family dining", "Rooftop bars"], emoji: "🌃", transition: "Nightlife warming up" },
  "22-02": { dominant: "nightlife", actions: ["Bars", "Clubs", "Late-night food", "Live music"], emoji: "🌙", transition: "Late night winding down" },
  "02-06": { dominant: "services", actions: ["24h pharmacy", "Late-night transport", "Airport transfer"], emoji: "🌌", transition: "Early birds starting soon" },
};

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
  const isPeak = slot === "12-14" || slot === "19-22";
  const isActive = slot === "22-02" || slot === "17-19";
  return {
    timeSlot: slot,
    dominantActivity: rhythm.dominant,
    activityLevel: isPeak ? 88 : isActive ? 72 : slot === "02-06" ? 15 : 50,
    suggestedActions: rhythm.actions,
    emoji: rhythm.emoji,
    transitionHint: rhythm.transition,
  };
}

const CATEGORY_MAP: Record<string, ZoneActivityCategory> = {
  restaurant: "food", cafe: "food", bakery: "food", fast_food: "food", food: "food",
  bistro: "food", brasserie: "food", patisserie: "food", pizza: "food",
  bar: "nightlife", club: "nightlife", lounge: "nightlife", nightclub: "nightlife", pub: "nightlife",
  hotel: "tourism", resort: "tourism", attraction: "tourism", monument: "tourism",
  office: "business", coworking: "business",
  park: "family", playground: "family", school: "family",
  shop: "shopping", mall: "shopping", grocery: "shopping", supermarket: "shopping", boutique: "shopping",
  gym: "wellness", spa: "wellness", salon: "wellness", fitness: "wellness",
  museum: "cultural", gallery: "cultural", theater: "cultural", cinema: "cultural",
};

export function buildZoneProfile(
  zoneId: string,
  lat: number,
  lng: number,
  entities: { category: string; rating?: number; reviewsCount?: number }[]
): ZoneProfile {
  const breakdown: Record<ZoneActivityCategory, number> = {
    food: 0, nightlife: 0, tourism: 0, business: 0, family: 0, services: 0, shopping: 0, wellness: 0, cultural: 0,
  };

  let totalRating = 0;
  let ratedCount = 0;

  entities.forEach(e => {
    const cat = CATEGORY_MAP[e.category] || "services";
    breakdown[cat]++;
    if (e.rating) { totalRating += e.rating; ratedCount++; }
  });

  const dominant = (Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "services") as ZoneActivityCategory;
  const avgRating = ratedCount > 0 ? totalRating / ratedCount : 3;
  const activityScore = Math.min(100, entities.length * 2.5 + avgRating * 12);
  const qualityScore = Math.round(avgRating * 20);

  const month = new Date().getMonth();
  const isSummer = month >= 5 && month <= 8;
  const isWinter = month >= 11 || month <= 1;
  const seasonalTrend = isSummer ? "high" : isWinter ? "low" : "medium";

  return {
    zoneId,
    lat,
    lng,
    radiusKm: 1,
    activityScore: Math.round(activityScore),
    dominantCategory: dominant,
    categoryBreakdown: breakdown,
    peakHours: [12, 13, 19, 20, 21],
    seasonalTrend,
    entityCount: entities.length,
    qualityScore,
  };
}

const COMPLEMENTARY: Record<string, string[]> = {
  restaurant: ["hotel", "bar", "cafe", "taxi", "parking"],
  hotel: ["restaurant", "spa", "taxi", "exchange", "gym", "lounge"],
  bar: ["restaurant", "club", "taxi", "lounge"],
  cafe: ["bakery", "park", "coworking", "bookshop"],
  airport: ["hotel", "taxi", "exchange", "restaurant"],
  mall: ["restaurant", "cinema", "taxi", "cafe"],
  beach: ["cafe", "restaurant", "hotel", "lounge", "surfing"],
  gym: ["spa", "cafe", "restaurant"],
  museum: ["cafe", "restaurant", "park", "bookshop"],
  spa: ["hotel", "restaurant", "cafe"],
};

export function generatePlaceConnections(
  entities: { id: string; name: string; category: string; lat: number; lng: number }[]
): PlaceConnection[] {
  const connections: PlaceConnection[] = [];
  const limit = Math.min(entities.length, 60);

  for (let i = 0; i < limit; i++) {
    const from = entities[i];
    const complements = COMPLEMENTARY[from.category] || [];
    if (!complements.length) continue;

    for (let j = 0; j < limit; j++) {
      if (i === j) continue;
      const to = entities[j];
      if (!complements.includes(to.category)) continue;

      const dist = Math.sqrt(Math.pow(from.lat - to.lat, 2) + Math.pow(from.lng - to.lng, 2));
      if (dist < 0.025) {
        connections.push({
          fromId: from.id,
          fromName: from.name,
          toId: to.id,
          toName: to.name,
          connectionType: "complementary",
          strength: Math.max(0, 1 - dist * 40),
        });
      }
    }
  }
  return connections.sort((a, b) => b.strength - a.strength).slice(0, 25);
}

const FLOW_TRANSITIONS: Record<string, { next: string; cat: string; confidence: number; reason: string }[]> = {
  restaurant: [
    { next: "Coffee after meal", cat: "cafe", confidence: 0.8, reason: "Post-meal coffee" },
    { next: "Drinks nearby", cat: "bar", confidence: 0.65, reason: "Evening drinks" },
    { next: "Walk it off", cat: "park", confidence: 0.5, reason: "Post-meal walk" },
  ],
  food: [
    { next: "Coffee after meal", cat: "cafe", confidence: 0.75, reason: "Post-meal coffee" },
  ],
  hotel: [
    { next: "Dinner reservations", cat: "restaurant", confidence: 0.7, reason: "Hotel guest dining" },
    { next: "Explore the area", cat: "attraction", confidence: 0.6, reason: "Tourist exploration" },
  ],
  gym: [
    { next: "Post-workout smoothie", cat: "cafe", confidence: 0.7, reason: "Recovery nutrition" },
    { next: "Recovery spa", cat: "spa", confidence: 0.55, reason: "Muscle recovery" },
  ],
  museum: [
    { next: "Café break", cat: "cafe", confidence: 0.7, reason: "Cultural break" },
    { next: "Nearby gallery", cat: "gallery", confidence: 0.6, reason: "Cultural immersion" },
  ],
};

export function predictNextAction(
  hour: number,
  recentCategories: string[],
  nearbyCategories: string[]
): FlowPrediction {
  const rhythm = getZoneRhythm(hour);

  for (const recent of recentCategories) {
    const transitions = FLOW_TRANSITIONS[recent];
    if (!transitions) continue;

    for (const t of transitions) {
      if (nearbyCategories.includes(t.cat)) {
        let conf = t.confidence;
        if (t.cat === "bar" && hour < 18) conf *= 0.5;
        if (t.cat === "cafe" && (hour < 7 || hour > 22)) conf *= 0.4;

        return {
          nextBestAction: t.next,
          confidence: Math.round(conf * 100) / 100,
          suggestedCategory: t.cat,
          reason: t.reason,
          alternativeActions: transitions.filter(x => x.cat !== t.cat).map(x => x.next),
        };
      }
    }
  }

  return {
    nextBestAction: rhythm.suggestedActions[0] || "Explore nearby",
    confidence: 0.5,
    suggestedCategory: rhythm.dominantActivity,
    reason: `Based on time (${rhythm.timeSlot}) and local activity`,
    alternativeActions: rhythm.suggestedActions.slice(1),
  };
}
