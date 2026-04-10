import type { RadarMode, RadarModeResult, UserContext } from "./types";

const INTENT_TO_RADAR_MODE: Record<string, RadarMode> = {
  buy_property: "property",
  rent_property: "property",
  project_property: "property",
  stay_booking: "stay",
  food_order: "food",
  grocery_order: "food",
  service_request: "services",
  ride_request: "mobility",
  wallet_transfer: "discovery",
  support_request: "discovery",
};

const VERTICAL_TO_RADAR_MODE: Record<string, RadarMode> = {
  property: "property",
  stay: "stay",
  food: "food",
  grocery: "food",
  mobility: "mobility",
  utility: "utility",
  services: "services",
  beauty: "services",
  pharmacy: "utility",
  shops: "discovery",
};

const RADAR_MODE_FILTERS: Record<RadarMode, Record<string, string>> = {
  food: { layer: "food", icon: "restaurant", label: "Restaurants nearby" },
  utility: { layer: "utility", icon: "utility", label: "Utilities nearby" },
  property: { layer: "property", icon: "building", label: "Properties nearby" },
  stay: { layer: "stay", icon: "hotel", label: "Hotels nearby" },
  mobility: { layer: "mobility", icon: "car", label: "Rides available" },
  services: { layer: "services", icon: "wrench", label: "Services nearby" },
  discovery: { layer: "all", icon: "compass", label: "Discover nearby" },
};

export function resolveRadarMode(ctx: UserContext): RadarModeResult {
  if (ctx.activeIntent) {
    const mode = INTENT_TO_RADAR_MODE[ctx.activeIntent];
    if (mode) {
      return {
        mode,
        filters: RADAR_MODE_FILTERS[mode],
        reason: `active_intent: ${ctx.activeIntent}`,
        confidence: 0.9,
      };
    }
  }

  if (ctx.recentVerticals && ctx.recentVerticals.length > 0) {
    const primaryVertical = ctx.recentVerticals[0];
    const mode = VERTICAL_TO_RADAR_MODE[primaryVertical];
    if (mode) {
      return {
        mode,
        filters: RADAR_MODE_FILTERS[mode],
        reason: `recent_vertical: ${primaryVertical}`,
        confidence: 0.7,
      };
    }
  }

  if (ctx.timeOfDay === "evening" || ctx.timeOfDay === "night") {
    return {
      mode: "food",
      filters: RADAR_MODE_FILTERS.food,
      reason: "time_contextual: evening/night → food",
      confidence: 0.5,
    };
  }

  return {
    mode: "discovery",
    filters: RADAR_MODE_FILTERS.discovery,
    reason: "default_discovery",
    confidence: 0.3,
  };
}

export function getRadarFiltersForQuery(query: string): RadarModeResult {
  const q = query.toLowerCase().trim();

  const KEYWORD_MAP: [RegExp, RadarMode][] = [
    [/\b(atm|bank|money|cash)\b/, "utility"],
    [/\b(fuel|gas|petrol|diesel|ev\s*charg)\b/, "utility"],
    [/\b(pharmacy|hospital|clinic|doctor|medical)\b/, "utility"],
    [/\b(parking|park)\b/, "utility"],
    [/\b(police|fire\s*station|post\s*office)\b/, "utility"],
    [/\b(restaurant|food|eat|pizza|burger|sushi|kebab|shawarma|falafel)\b/, "food"],
    [/\b(grocery|supermarket|fruits|vegetables|carrefour)\b/, "food"],
    [/\b(hotel|resort|stay|airbnb|booking)\b/, "stay"],
    [/\b(apartment|villa|rent|buy|property|house|penthouse)\b/, "property"],
    [/\b(taxi|ride|uber|driver|car)\b/, "mobility"],
    [/\b(salon|barber|spa|beauty|massage)\b/, "services"],
    [/\b(plumber|electrician|cleaning|repair|handyman)\b/, "services"],
  ];

  for (const [pattern, mode] of KEYWORD_MAP) {
    if (pattern.test(q)) {
      return {
        mode,
        filters: { ...RADAR_MODE_FILTERS[mode], query: q },
        reason: `keyword_match: ${pattern.source}`,
        confidence: 0.85,
      };
    }
  }

  return {
    mode: "discovery",
    filters: { ...RADAR_MODE_FILTERS.discovery, query: q },
    reason: "no_keyword_match",
    confidence: 0.3,
  };
}
