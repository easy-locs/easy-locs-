export interface ContextualFactors {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  dayOfWeek: number;
  isWeekend: boolean;
  location?: { lat: number; lng: number };
  weather?: "sunny" | "cloudy" | "rainy" | "cold" | "hot";
  deviceType?: "mobile" | "tablet" | "desktop";
  sessionDuration?: number;
  recentCategories?: string[];
}

interface BoostRule {
  factor: string;
  condition: (ctx: ContextualFactors) => boolean;
  verticals: string[];
  boost: number;
}

const BOOST_RULES: BoostRule[] = [
  {
    factor: "morning_commute",
    condition: (ctx) => ctx.timeOfDay === "morning" && !ctx.isWeekend,
    verticals: ["taxi", "food", "grocery"],
    boost: 0.25,
  },
  {
    factor: "lunch_rush",
    condition: (ctx) => ctx.timeOfDay === "afternoon" && !ctx.isWeekend,
    verticals: ["food", "delivery"],
    boost: 0.3,
  },
  {
    factor: "evening_leisure",
    condition: (ctx) => ctx.timeOfDay === "evening",
    verticals: ["food", "stay", "services", "shops"],
    boost: 0.2,
  },
  {
    factor: "night_delivery",
    condition: (ctx) => ctx.timeOfDay === "night",
    verticals: ["food", "delivery"],
    boost: 0.35,
  },
  {
    factor: "weekend_shopping",
    condition: (ctx) => ctx.isWeekend && (ctx.timeOfDay === "morning" || ctx.timeOfDay === "afternoon"),
    verticals: ["shops", "grocery", "services"],
    boost: 0.2,
  },
  {
    factor: "weekend_travel",
    condition: (ctx) => ctx.isWeekend,
    verticals: ["stay", "taxi"],
    boost: 0.15,
  },
  {
    factor: "rainy_day",
    condition: (ctx) => ctx.weather === "rainy",
    verticals: ["delivery", "food", "grocery"],
    boost: 0.3,
  },
  {
    factor: "hot_weather",
    condition: (ctx) => ctx.weather === "hot",
    verticals: ["delivery", "grocery", "taxi"],
    boost: 0.2,
  },
  {
    factor: "mobile_quick",
    condition: (ctx) => ctx.deviceType === "mobile" && (ctx.sessionDuration ?? 0) < 60,
    verticals: ["taxi", "food"],
    boost: 0.15,
  },
];

export function computeContextualBoosts(ctx: ContextualFactors): Map<string, number> {
  const boosts = new Map<string, number>();

  for (const rule of BOOST_RULES) {
    if (rule.condition(ctx)) {
      for (const vertical of rule.verticals) {
        const current = boosts.get(vertical) || 0;
        boosts.set(vertical, current + rule.boost);
      }
    }
  }

  if (ctx.recentCategories) {
    for (const cat of ctx.recentCategories) {
      const current = boosts.get(cat) || 0;
      boosts.set(cat, current + 0.1);
    }
  }

  return boosts;
}

export function getContextualFactors(): ContextualFactors {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  let timeOfDay: ContextualFactors["timeOfDay"];
  if (hour >= 5 && hour < 12) timeOfDay = "morning";
  else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
  else if (hour >= 17 && hour < 22) timeOfDay = "evening";
  else timeOfDay = "night";

  return {
    timeOfDay,
    dayOfWeek: day,
    isWeekend: day === 0 || day === 6,
    deviceType: typeof window !== "undefined"
      ? window.innerWidth < 768
        ? "mobile"
        : window.innerWidth < 1024
          ? "tablet"
          : "desktop"
      : "mobile",
  };
}

export function computeGeoProximityBoost(
  itemLat: number,
  itemLng: number,
  userLat: number,
  userLng: number,
  maxDistanceKm = 20,
): number {
  const R = 6371;
  const dLat = ((itemLat - userLat) * Math.PI) / 180;
  const dLng = ((itemLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((itemLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance > maxDistanceKm) return 0;
  return 1 - distance / maxDistanceKm;
}
