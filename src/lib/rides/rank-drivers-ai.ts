/**
 * rank-drivers-ai — AI-powered driver ranking using composite scoring.
 */
import { computeRadar } from "@/lib/radar/radar-engine";
import { scoreAIDriver, type AIDriver } from "@/lib/rides/ai-driver-score";

export function rankDriversAI(params: {
  userLat: number;
  userLng: number;
  drivers: AIDriver[];
  requestedRideType?: "eco" | "standard" | "premium" | "any";
  riderPriority?: "standard" | "priority" | "vip";
  radiusKm?: number;
  maxDrivers?: number;
}) {
  const {
    userLat,
    userLng,
    drivers,
    requestedRideType = "standard",
    riderPriority = "standard",
    radiusKm = 10,
    maxDrivers = 12,
  } = params;

  const radar = computeRadar(userLat, userLng, drivers as any, radiusKm, "taxi");

  const ranked = (radar.nearbyDrivers as any[])
    .filter((d) => d.status === "available")
    .filter((d) => {
      if (requestedRideType === "any") return true;
      return !d.vehicle_class || d.vehicle_class === requestedRideType;
    })
    .map((d) => {
      const score = scoreAIDriver({
        driver: d,
        requestedRideType,
        riderPriority,
      });
      return { ...d, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDrivers);

  return ranked;
}
