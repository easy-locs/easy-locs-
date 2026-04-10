/**
 * Context Awareness Engine — Understands the user's current situation.
 */

export type DayPart = "early_morning" | "morning" | "lunch" | "afternoon" | "evening" | "night" | "late_night";
export type TravelState = "stationary" | "walking" | "transit" | "driving" | "just_arrived" | "exploring";
export type ZoneType = "business" | "residential" | "tourist" | "nightlife" | "commercial" | "airport" | "station" | "mixed";

export interface UserContext {
  dayPart: DayPart;
  hour: number;
  isWeekend: boolean;
  travelState: TravelState;
  zoneType: ZoneType;
  country?: string;
  city?: string;
  district?: string;
  temperature?: number;
  suggestedMood: string;
}

export function detectDayPart(hour?: number): DayPart {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 7) return "early_morning";
  if (h >= 7 && h < 11) return "morning";
  if (h >= 11 && h < 14) return "lunch";
  if (h >= 14 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  if (h >= 21 && h < 24) return "night";
  return "late_night";
}

export function inferZoneType(nearbyCategories: string[]): ZoneType {
  const counts: Record<string, number> = {};
  nearbyCategories.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
  
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominant = top[0]?.[0] || "";
  
  if (["airport", "airline", "terminal"].some(s => dominant.includes(s))) return "airport";
  if (["station", "metro", "bus_stop"].some(s => dominant.includes(s))) return "station";
  if (["bar", "club", "lounge", "nightclub"].some(s => dominant.includes(s))) return "nightlife";
  if (["office", "coworking", "bank"].some(s => dominant.includes(s))) return "business";
  if (["hotel", "resort", "museum", "monument"].some(s => dominant.includes(s))) return "tourist";
  if (["mall", "shop", "store", "market"].some(s => dominant.includes(s))) return "commercial";
  return "mixed";
}

export function inferTravelState(speedKmh?: number, recentLocations?: number): TravelState {
  if (!speedKmh || speedKmh < 1) return "stationary";
  if (speedKmh < 6) return "walking";
  if (speedKmh < 15) return "exploring";
  if (speedKmh < 50) return "transit";
  return "driving";
}

export function buildUserContext(opts: {
  hour?: number;
  nearbyCategories?: string[];
  speedKmh?: number;
  country?: string;
  city?: string;
}): UserContext {
  const hour = opts.hour ?? new Date().getHours();
  const dayPart = detectDayPart(hour);
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 5 || day === 6; // Fri-Sun for many regions
  const zoneType = inferZoneType(opts.nearbyCategories || []);
  const travelState = inferTravelState(opts.speedKmh);

  const moodMap: Record<DayPart, string> = {
    early_morning: "energize",
    morning: "productive",
    lunch: "hungry",
    afternoon: "explore",
    evening: "relax",
    night: "social",
    late_night: "unwind",
  };

  return {
    dayPart,
    hour,
    isWeekend,
    travelState,
    zoneType,
    country: opts.country,
    city: opts.city,
    suggestedMood: moodMap[dayPart],
  };
}
