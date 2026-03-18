/**
 * Select Candidate Drivers — Score and rank nearby drivers for ride offers.
 */
import { computeRadar, type DriverWithDistance } from "@/lib/radar/radar-engine";

export interface CandidateDriver extends DriverWithDistance {
  acceptance_rate?: number;
  vehicle_class?: "eco" | "standard" | "premium";
  score: number;
}

export function selectCandidateDrivers(
  userLat: number,
  userLng: number,
  drivers: Array<{
    id: string;
    lat: number;
    lng: number;
    status: "available" | "busy";
    type: "taxi" | "delivery";
    rating: number;
    acceptance_rate?: number;
    vehicle_class?: "eco" | "standard" | "premium";
  }>,
  radiusKm = 8,
  maxDrivers = 7,
  rideType: "eco" | "standard" | "premium" | "any" = "standard",
): CandidateDriver[] {
  const radar = computeRadar(userLat, userLng, drivers, radiusKm, "taxi");

  return radar.nearbyDrivers
    .filter((d) => d.status === "available")
    .filter((d) => {
      if (rideType === "any") return true;
      return !(d as any).vehicle_class || (d as any).vehicle_class === rideType;
    })
    .map((d) => {
      const distanceScore = 1 / Math.max(d.distance, 0.1);
      const ratingScore = (d.rating ?? 4) / 5;
      const acceptanceScore = (d as any).acceptance_rate ?? 0.85;

      const score =
        distanceScore * 0.55 +
        ratingScore * 0.25 +
        acceptanceScore * 0.20;

      return { ...d, acceptance_rate: acceptanceScore, score } as CandidateDriver;
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, maxDrivers);
}
