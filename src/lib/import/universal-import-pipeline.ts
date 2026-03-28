/**
 * universal-import-pipeline — Universal data import pipeline.
 * Source → Adapter → Normalize → Validate → Quality → Dedup → Enrich → Save → Emit
 * Single orchestrator, zero source logic in UI.
 */
import type { CanonicalShop } from "@/lib/onboarding/pipeline/canonical-shop.schema";
import { deliverooAdapter } from "@/lib/onboarding/pipeline/adapters/deliveroo.adapter";
import { talabatAdapter } from "@/lib/onboarding/pipeline/adapters/talabat.adapter";
import { webAdapter } from "@/lib/onboarding/pipeline/adapters/web.adapter";
import { careemAdapter } from "@/lib/onboarding/pipeline/adapters/careem.adapter";
import { noonAdapter } from "@/lib/onboarding/pipeline/adapters/noon.adapter";
import { platformBus } from "@/lib/shared/platform-bus";

export type ImportSource = "deliveroo" | "talabat" | "careem" | "noon" | "web" | "manual" | "internal";

const ADAPTERS: Record<string, (raw: any) => Promise<CanonicalShop>> = {
  deliveroo: deliverooAdapter,
  talabat: talabatAdapter,
  careem: careemAdapter,
  noon: noonAdapter,
  web: webAdapter,
};

export interface ImportResult {
  canonical: CanonicalShop;
  source: ImportSource;
  qualityScore: number;
  isDuplicate: boolean;
  conflicts: string[];
}

/** Validate required fields */
function validate(shop: CanonicalShop): string[] {
  const missing: string[] = [];
  if (!shop.name?.trim()) missing.push("name");
  if (!shop.location?.lat || !shop.location?.lng) missing.push("geo");
  if (!shop.location?.city) missing.push("city");
  if (!shop.categories?.length) missing.push("categories");
  return missing;
}

/** Compute quality score 0–100 */
function scoreQuality(shop: CanonicalShop): number {
  let score = 0;
  if (shop.name) score += 15;
  if (shop.location?.lat && shop.location?.lng) score += 20;
  if (shop.location?.address) score += 10;
  if (shop.location?.city) score += 5;
  if (shop.categories?.length) score += 10;
  if (shop.products?.length) score += 15;
  if (shop.media?.logo) score += 5;
  if (shop.media?.cover) score += 5;
  if (shop.media?.gallery?.length) score += 5;
  if (shop.hours?.length) score += 5;
  if (shop.delivery?.fee !== undefined) score += 5;
  return Math.min(100, score);
}

/** Simple dedup check by name + lat/lng proximity */
function checkDuplicate(shop: CanonicalShop, existing: CanonicalShop[]): boolean {
  const nameNorm = shop.name.toLowerCase().trim();
  return existing.some(e => {
    const nameMatch = e.name.toLowerCase().trim() === nameNorm;
    if (!nameMatch) return false;
    const dist = Math.abs(e.location.lat - shop.location.lat) + Math.abs(e.location.lng - shop.location.lng);
    return dist < 0.001; // ~100m proximity
  });
}

/** Run the full import pipeline for a single entity */
export async function runImportPipeline(
  source: ImportSource,
  rawData: any,
  existingEntities: CanonicalShop[] = [],
): Promise<ImportResult> {
  // 1. Adapt
  const adapter = ADAPTERS[source];
  if (!adapter) throw new Error(`No adapter for source: ${source}`);
  const canonical = await adapter(rawData);

  // 2. Validate
  const missing = validate(canonical);
  canonical.quality = { score: 0, missingFields: missing };

  // 3. Quality score
  const qualityScore = scoreQuality(canonical);
  canonical.quality.score = qualityScore;

  // 4. Dedup
  const isDuplicate = checkDuplicate(canonical, existingEntities);

  // 5. Conflicts (field-level)
  const conflicts: string[] = [];
  if (isDuplicate) {
    conflicts.push("name_geo_duplicate");
  }

  // 6. Emit event
  platformBus.emit("import:entity_processed", {
    source,
    entityId: canonical.id,
    qualityScore,
    isDuplicate,
    conflicts,
  }, "system");

  return { canonical, source, qualityScore, isDuplicate, conflicts };
}

/** Batch import */
export async function runBatchImport(
  source: ImportSource,
  rawItems: any[],
  existingEntities: CanonicalShop[] = [],
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const raw of rawItems) {
    try {
      const result = await runImportPipeline(source, raw, existingEntities);
      results.push(result);
      if (!result.isDuplicate) {
        existingEntities.push(result.canonical);
      }
    } catch (err) {
      console.error(`[import] Failed for source=${source}`, err);
    }
  }
  platformBus.emit("import:batch_completed", {
    source,
    total: rawItems.length,
    imported: results.filter(r => !r.isDuplicate).length,
    duplicates: results.filter(r => r.isDuplicate).length,
  }, "system");
  return results;
}
