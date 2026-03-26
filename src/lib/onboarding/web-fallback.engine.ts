/**
 * Web Fallback Engine — Completes missing fields from official website / Google Business
 * ONLY after primary sources have been consumed. Never replaces existing data.
 */
import type { OnboardingVertical } from "./source-policy.engine";
import type { CanonicalMerchantRecord } from "./missing-fields.engine";
import { detectMissingFields } from "./missing-fields.engine";
import { getFallbackSources } from "./source-policy.engine";

export interface FallbackPlan {
  vertical: OnboardingVertical;
  entityId: string;
  fieldsToFetch: string[];
  fallbackSources: string[];
  reason: string;
}

/**
 * Determine what fields need web fallback enrichment.
 * Returns null if entity is already complete.
 */
export function buildFallbackPlan(record: CanonicalMerchantRecord): FallbackPlan | null {
  const { missingRequired, missingRecommended, isPublishReady, completenessScore } =
    detectMissingFields(record);

  // If fully complete, no fallback needed
  if (isPublishReady && missingRecommended.length === 0) return null;

  const fieldsToFetch = [...missingRequired, ...missingRecommended];
  const sources = getFallbackSources(record.vertical);

  return {
    vertical: record.vertical,
    entityId: record.entity_id,
    fieldsToFetch,
    fallbackSources: sources,
    reason: isPublishReady
      ? `publish_ready but missing ${missingRecommended.length} recommended fields (score=${completenessScore})`
      : `blocked: missing ${missingRequired.length} required fields`,
  };
}

/**
 * Apply fallback data to a record — only fills in missing fields, never overwrites.
 */
export function applyFallbackData(
  record: CanonicalMerchantRecord,
  fallbackData: Partial<CanonicalMerchantRecord>
): CanonicalMerchantRecord {
  const updated = { ...record };

  for (const [key, value] of Object.entries(fallbackData)) {
    if (key === "entity_id" || key === "vertical") continue;
    const current = (updated as any)[key];
    const isEmpty =
      current == null ||
      current === "" ||
      (Array.isArray(current) && current.length === 0);

    if (isEmpty && value != null && value !== "") {
      (updated as any)[key] = value;
    }
  }

  return updated;
}
