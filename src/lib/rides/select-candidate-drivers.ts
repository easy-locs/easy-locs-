/**
 * Select Candidate Drivers — Score and rank nearby drivers for ride offers.
 */
import { computeRadar, type DriverWithDistance } from "@/lib/radar/radar-engine";

export interface CandidateDriver extends DriverWithDistance {
  acceptance_rate?: number;
  score: number;
}

export function selectCandidateDrivers(
  userLat: number,
  userLng: number,
  drivers: Array<{ id: string; lat: number; lng: number; status: "available" | "busy"; type: "taxi" | "delivery"; rating: number; acceptance_rate?: number }>,
  maxDrivers = 7,
): CandidateDriver[] {
  const radar = computeRadar(userLat, userLng, drivers, 8, "taxi");

  return radar.nearbyDrivers
    .filter(d => d.status === "available")
    .map(d => {
      const distanceScore = 1 / Math.max(d.distance, 0.1);
      const ratingScore = (d.rating ?? 4) / 5;
      const acceptanceScore = (d as any).acceptance_rate ?? 0.85;

      const score =
        distanceScore * 0.55 +
        ratingScore * 0.25 +
        acceptanceScore * 0.20;

      return { ...d, acceptance_rate: acceptanceScore, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDrivers);
}
