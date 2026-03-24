/**
 * Multi-Source Merge Engine
 * When multiple sources exist for the same entity, picks the best value per field.
 * Respects source priority and merchant overrides.
 */
import type { CanonicalShopData } from "./parsers/canonical-format";
import { getSourceConfidence } from "./source-priority-engine";

export interface MergeResult {
  merged: CanonicalShopData;
  field_sources: Record<string, string>; // field → winning source_key
  conflicts: Array<{ field: string; sources: string[]; winner: string }>;
}

/**
 * Field-level priority: which source is best for which data type.
 */
const FIELD_SOURCE_PRIORITY: Record<string, string[]> = {
  // Menu data → food aggregators first
  menu_sections: ["deliveroo", "talabat", "careem", "manual", "onboarding"],
  menu_items: ["deliveroo", "talabat", "careem", "manual", "onboarding"],
  // Ratings → Google is most trusted
  rating: ["google_maps", "google_business", "booking", "deliveroo", "talabat"],
  reviews_count: ["google_maps", "google_business", "booking", "deliveroo", "talabat"],
  // Location → Google is most accurate
  lat: ["google_maps", "google_business", "booking", "deliveroo", "talabat"],
  lng: ["google_maps", "google_business", "booking", "deliveroo", "talabat"],
  address: ["google_maps", "google_business", "booking", "deliveroo"],
  // Images → aggregators have better food photos
  cover_url: ["deliveroo", "talabat", "careem", "booking", "google_maps"],
  images: ["deliveroo", "talabat", "booking", "google_maps"],
  // Hours → Google is most accurate
  hours: ["google_maps", "google_business", "deliveroo", "talabat"],
};

/**
 * Merge multiple canonical datasets for the same entity.
 * Earlier entries in the array are treated as higher priority when no field-specific rule exists.
 */
export function mergeMultipleSources(
  vertical: string,
  sources: Array<{ source_key: string; data: CanonicalShopData }>
): MergeResult {
  if (sources.length === 0) {
    throw new Error("Cannot merge empty source list");
  }
  if (sources.length === 1) {
    const s = sources[0];
    return {
      merged: s.data,
      field_sources: Object.fromEntries(
        Object.keys(s.data).filter(k => (s.data as any)[k] != null).map(k => [k, s.source_key])
      ),
      conflicts: [],
    };
  }

  // Sort by confidence descending
  const sorted = [...sources].sort(
    (a, b) => getSourceConfidence(vertical, b.source_key) - getSourceConfidence(vertical, a.source_key)
  );

  const merged: any = { ...sorted[0].data };
  const field_sources: Record<string, string> = {};
  const conflicts: MergeResult["conflicts"] = [];

  // For each field, pick the best value
  const allKeys = new Set(sorted.flatMap(s => Object.keys(s.data)));

  for (const field of allKeys) {
    const sourcesWithValue = sorted.filter(s => {
      const val = (s.data as any)[field];
      return val != null && val !== "" && !(Array.isArray(val) && val.length === 0);
    });

    if (sourcesWithValue.length === 0) continue;

    // Check field-specific priority
    const fieldPriority = FIELD_SOURCE_PRIORITY[field];
    let winner = sourcesWithValue[0]; // default: highest confidence

    if (fieldPriority) {
      for (const preferred of fieldPriority) {
        const found = sourcesWithValue.find(s => s.source_key === preferred);
        if (found) {
          winner = found;
          break;
        }
      }
    }

    merged[field] = (winner.data as any)[field];
    field_sources[field] = winner.source_key;

    // Track conflicts
    if (sourcesWithValue.length > 1) {
      conflicts.push({
        field,
        sources: sourcesWithValue.map(s => s.source_key),
        winner: winner.source_key,
      });
    }
  }

  return { merged, field_sources, conflicts };
}
