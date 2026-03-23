/**
 * Heatmap Engine — Generates heatmap data from unified radar points.
 * Consumes normalized ecosystem points. No separate data source.
 */
import type { RadarPoint } from "@/lib/radar/types";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  /** Intensity 0–1 */
  intensity: number;
}

export type HeatmapMode = "density" | "trending" | "rating";

/**
 * Convert radar points into heatmap-ready data.
 * Intensity is computed from the selected mode.
 */
export function radarPointsToHeatmap(
  points: RadarPoint[],
  mode: HeatmapMode = "density"
): HeatmapPoint[] {
  if (!points.length) return [];

  if (mode === "density") {
    // Each point contributes equally — density is visualized by clustering
    return points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      intensity: 0.6,
    }));
  }

  if (mode === "rating") {
    const maxRating = 5;
    return points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      intensity: Math.min(1, (p.rating ?? 0) / maxRating),
    }));
  }

  // trending: combine rating + reviews + sponsorship
  const maxReviews = Math.max(1, ...points.map((p) => p.reviewsCount ?? 0));
  return points.map((p) => {
    const ratingNorm = (p.rating ?? 0) / 5;
    const reviewNorm = (p.reviewsCount ?? 0) / maxReviews;
    const sponsorBonus = p.isSponsored ? 0.2 : 0;
    return {
      lat: p.lat,
      lng: p.lng,
      intensity: Math.min(1, ratingNorm * 0.4 + reviewNorm * 0.4 + sponsorBonus),
    };
  });
}
