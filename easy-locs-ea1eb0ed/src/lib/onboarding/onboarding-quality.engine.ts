/**
 * Onboarding Quality Score Engine — Computes weighted quality score
 * for a canonical onboarding record.
 */
import type { CanonicalOnboardingRecord, OnboardingQualityResult } from "./types";

export function scoreOnboardingQuality(record: CanonicalOnboardingRecord): OnboardingQualityResult {
  const warnings: string[] = [];
  const missingFields = [...record.missingFields];

  let score = 100;

  if (!record.canonicalName) score -= 20;
  if (!record.address) score -= 20;
  if (record.lat == null || record.lng == null) score -= 20;
  if (record.categories.length === 0) score -= 10;
  if (record.photos.length === 0) {
    score -= 8;
    warnings.push("No photos");
  }

  if (record.vertical === "food" || record.vertical === "grocery") {
    if (record.menuItems.length === 0) {
      score -= 12;
      warnings.push("No menu items");
    }
  }

  if (record.vertical === "hotel") {
    if (record.hotelInventory.length === 0) {
      score -= 12;
      warnings.push("No hotel inventory");
    }
  }

  if (record.vertical === "services") {
    if (record.serviceItems.length === 0) {
      score -= 10;
      warnings.push("No service items");
    }
  }

  score = Math.max(0, score);

  return {
    score,
    missingFields,
    warnings,
    readyToPublish: score >= 75 && missingFields.length <= 1,
  };
}
