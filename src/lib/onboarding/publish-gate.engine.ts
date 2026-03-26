/**
 * Publish Gate Engine — Final validation before an entity becomes visible.
 * Enforces strict per-vertical minimum requirements.
 * Incomplete or dirty data stays in draft, never published automatically.
 */
import type { OnboardingVertical } from "./source-policy.engine";
import type { CanonicalMerchantRecord } from "./missing-fields.engine";
import { detectMissingFields } from "./missing-fields.engine";

export type PublishDecision = "publish" | "draft" | "needs_review";

export interface PublishGateResult {
  decision: PublishDecision;
  visibility: "public" | "search_only" | "coming_soon" | "hidden";
  reasons: string[];
  qualityScore: number;
  missingFields: string[];
}

/** Minimum photo count per vertical */
const MIN_PHOTOS: Record<OnboardingVertical, number> = {
  food: 1,
  grocery: 1,
  hotel: 3,
  services: 1,
  property: 2,
};

/** Minimum menu/catalog items for food/grocery */
const MIN_MENU_ITEMS: Record<string, number> = {
  food: 3,
  grocery: 0,
};

export function evaluatePublishGate(record: CanonicalMerchantRecord): PublishGateResult {
  const reasons: string[] = [];
  const { missingRequired, completenessScore, isPublishReady } = detectMissingFields(record);

  // Check required fields
  if (!isPublishReady) {
    reasons.push(`missing_required: ${missingRequired.join(", ")}`);
  }

  // Check photos
  const photoCount = record.photos_json?.length ?? 0;
  const minPhotos = MIN_PHOTOS[record.vertical] ?? 1;
  if (photoCount < minPhotos) {
    reasons.push(`photos: ${photoCount}/${minPhotos} minimum`);
  }

  // Check menu for food
  if (record.vertical === "food") {
    const menuCount = record.menu_items_json?.length ?? 0;
    if (menuCount < (MIN_MENU_ITEMS.food ?? 3)) {
      reasons.push(`menu: ${menuCount}/${MIN_MENU_ITEMS.food} minimum items`);
    }
  }

  // Check name quality
  if (!record.canonical_name || record.canonical_name.length < 2) {
    reasons.push("name_too_short");
  }

  // Determine decision
  let decision: PublishDecision;
  let visibility: PublishGateResult["visibility"];

  if (reasons.length === 0 && completenessScore >= 70) {
    decision = "publish";
    visibility = completenessScore >= 85 ? "public" : "search_only";
  } else if (!isPublishReady || reasons.length > 2) {
    decision = "draft";
    visibility = "hidden";
  } else {
    decision = "needs_review";
    visibility = "coming_soon";
  }

  return {
    decision,
    visibility,
    reasons,
    qualityScore: completenessScore,
    missingFields: missingRequired,
  };
}
