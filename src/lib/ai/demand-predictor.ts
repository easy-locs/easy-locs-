/**
 * Demand Predictor — Heuristic demand scoring by time, day, and zone.
 * Feeds into AI dispatch & dynamic pricing.
 */

interface DemandInput {
  hour: number;
  day: number; // 0=Sun … 6=Sat
  zone: string;
}

const HOT_ZONES = new Set([
  "Dubai Marina", "Downtown", "JLT", "Business Bay", "DIFC",
  "Palm Jumeirah", "Deira", "Al Barsha", "Jumeirah",
  "Casablanca Centre", "Marrakech Medina", "Paris Centre",
]);

export function predictDemand({ hour, day, zone }: DemandInput): number {
  let score = 1;

  // Morning rush
  if (hour >= 7 && hour <= 10) score += 2;
  // Evening rush
  if (hour >= 17 && hour <= 21) score += 3;
  // Late night
  if (hour >= 22 || hour < 2) score += 1;

  // Weekend boost
  if (day === 5 || day === 6) score += 2;

  // Hot zone boost
  if (HOT_ZONES.has(zone)) score += 2;

  return score; // 1 → low, 5+ → high demand
}

/** Human-readable demand label */
export function demandLabel(score: number): { text: string; tier: "low" | "normal" | "high" | "surge" } {
  if (score >= 7) return { text: "Surge zone", tier: "surge" };
  if (score >= 5) return { text: "High demand", tier: "high" };
  if (score >= 3) return { text: "Normal", tier: "normal" };
  return { text: "Low demand", tier: "low" };
}
