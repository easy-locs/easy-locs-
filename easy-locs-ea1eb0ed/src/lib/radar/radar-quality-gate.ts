import type { RadarResultItem } from "./radar-result-item";

export interface QualityGateResult {
  passed: boolean;
  demoted: boolean;
  reason: string | null;
}

export function applyQualityGate(item: RadarResultItem): QualityGateResult {
  if (!item.lat || !item.lng || (item.lat === 0 && item.lng === 0)) {
    return { passed: false, demoted: false, reason: "missing_geo" };
  }

  if (!item.title || item.title.trim().length < 2) {
    return { passed: false, demoted: false, reason: "missing_title" };
  }

  if (!item.category || item.category.trim().length === 0) {
    return { passed: false, demoted: false, reason: "missing_category" };
  }

  if (item.qualityScore < 0.15) {
    return { passed: false, demoted: false, reason: "quality_too_low" };
  }

  if (item.qualityScore < 0.3) {
    return { passed: true, demoted: true, reason: "low_quality" };
  }

  if (!item.image && (item.type === "food" || item.type === "hotel")) {
    return { passed: true, demoted: true, reason: "missing_image_critical_vertical" };
  }

  return { passed: true, demoted: false, reason: null };
}

export function filterAndDemoteResults(items: RadarResultItem[]): RadarResultItem[] {
  const passed: RadarResultItem[] = [];
  const demoted: RadarResultItem[] = [];

  for (const item of items) {
    const gate = applyQualityGate(item);
    if (!gate.passed) continue;
    if (gate.demoted) {
      demoted.push({ ...item, radarScore: item.radarScore * 0.6 });
    } else {
      passed.push(item);
    }
  }

  return [...passed, ...demoted];
}
