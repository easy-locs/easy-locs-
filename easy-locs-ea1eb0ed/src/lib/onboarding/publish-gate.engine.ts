/**
 * Publish Gate Engine — Final validation before an entity becomes visible.
 * Enforces vertical-specific minimum requirements.
 */
import type {
  CanonicalOnboardingRecord,
  OnboardingQualityResult,
  PublishGateResult,
} from "./types";

export function evaluatePublishGate(
  record: CanonicalOnboardingRecord,
  quality: OnboardingQualityResult,
): PublishGateResult {
  const reasons: string[] = [];

  if (!record.canonicalName) reasons.push("Missing name");
  if (!record.address) reasons.push("Missing address");
  if (record.lat == null || record.lng == null) reasons.push("Missing coordinates");
  if (record.categories.length === 0) reasons.push("Missing categories");

  if (record.vertical === "food" || record.vertical === "grocery") {
    if (record.menuItems.length === 0) reasons.push("Missing menu");
  }

  if (record.vertical === "hotel") {
    if (record.photos.length === 0) reasons.push("Missing photos");
  }

  const allowed = quality.readyToPublish && reasons.length === 0;

  return {
    allowed,
    reasons,
    targetVisibility: allowed ? "public" : "draft",
  };
}
