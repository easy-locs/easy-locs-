/**
 * Demand Heatmap — Zone-level demand/supply intensity mapping.
 * Feeds into driver repositioning suggestions and heatmap visualization.
 */

export interface ZoneDemand {
  zone: string;
  lat?: number;
  lng?: number;
  demand: number;
  supply: number;
  score: number;
}

export interface ZoneHeat extends ZoneDemand {
  intensity: number; // 0–1
  level: "hot" | "warm" | "normal";
  ratio: number;
}

/** Compute heatmap intensities from zone demand/supply data */
export function computeHeatmap(zones: ZoneDemand[]): ZoneHeat[] {
  return zones.map(z => {
    const ratio = z.demand / Math.max(z.supply, 1);
    return {
      ...z,
      ratio,
      intensity: Math.min(1, ratio / 2),
      level: ratio > 2 ? "hot" : ratio > 1.5 ? "warm" : "normal",
    };
  });
}

/** Suggest best repositioning zone for a driver */
export function suggestReposition(
  driverLat: number,
  driverLng: number,
  heatmap: ZoneHeat[],
): ZoneHeat | null {
  const hot = heatmap
    .filter(z => z.level === "hot")
    .sort((a, b) => b.intensity - a.intensity);
  return hot[0] ?? null;
}

/** Check if a driver should be notified about a hot zone */
export function shouldNotifyDriver(zone: ZoneHeat): boolean {
  return zone.level === "hot" && zone.intensity > 0.6;
}

/** Format repositioning suggestion for display */
export function formatSuggestion(zone: ZoneHeat): { title: string; body: string; boost: string } {
  const boostPct = Math.round((zone.ratio - 1) * 100);
  return {
    title: `🔥 High demand nearby`,
    body: `📍 Move to ${zone.zone}`,
    boost: `💰 +${boostPct}% more rides`,
  };
}
