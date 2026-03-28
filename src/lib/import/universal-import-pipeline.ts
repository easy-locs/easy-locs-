/**
 * universal-import-pipeline — MIGRATED to src/lib/import-engine.
 * This file now delegates entirely to the canonical import engine.
 * Zero legacy logic remains.
 */
import {
  runImportEngine,
  type ImportResult,
  type SourceEntityRecord,
  type Vertical,
  type CanonicalEntity,
} from "@/lib/import-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export type ImportSource = "deliveroo" | "talabat" | "careem" | "noon" | "web" | "manual" | "internal";

/** Adapter: map legacy source name to canonical SourceName */
function mapSource(source: ImportSource): SourceEntityRecord["source"] {
  const MAP: Record<ImportSource, SourceEntityRecord["source"]> = {
    deliveroo: "deliveroo",
    talabat: "talabat",
    careem: "careem",
    noon: "noon",
    web: "official_web",
    manual: "official_web",
    internal: "official_web",
  };
  return MAP[source] ?? "official_web";
}

export interface LegacyImportResult {
  canonical: CanonicalEntity;
  source: ImportSource;
  qualityScore: number;
  isDuplicate: boolean;
  conflicts: string[];
}

/** Run a single entity through the canonical import engine */
export async function runImportPipeline(
  source: ImportSource,
  rawData: any,
  existingEntities: CanonicalEntity[] = [],
): Promise<LegacyImportResult> {
  const vertical: Vertical = rawData?.vertical ?? "food";
  const record: SourceEntityRecord = {
    source: mapSource(source),
    sourceEntityId: rawData?.id ?? crypto.randomUUID(),
    vertical,
    name: rawData?.name ?? null,
    address: rawData?.address ?? rawData?.location?.address ?? null,
    city: rawData?.city ?? rawData?.location?.city ?? null,
    country: rawData?.country ?? rawData?.location?.country ?? null,
    lat: rawData?.lat ?? rawData?.location?.lat ?? null,
    lng: rawData?.lng ?? rawData?.location?.lng ?? null,
    phone: rawData?.phone ?? null,
    website: rawData?.website ?? null,
    categories: rawData?.categories ?? (rawData?.category ? [rawData.category] : []),
    subcategories: rawData?.subcategories ?? (rawData?.subcategory ? [rawData.subcategory] : []),
    photos: rawData?.images ?? rawData?.photos ?? [],
    menuItems: rawData?.menuItems ?? rawData?.products ?? [],
    hotelInventory: rawData?.hotelInventory ?? [],
    serviceItems: rawData?.serviceItems ?? [],
    rating: rawData?.rating ?? null,
    reviewCount: rawData?.reviews_count ?? rawData?.reviewCount ?? null,
    description: rawData?.description ?? null,
    sourceUrl: rawData?.sourceUrl ?? rawData?.url ?? null,
  };

  const result = runImportEngine({ vertical }, [record]);
  const entity = result.entities[0];
  const quality = result.qualityReports.get(entity.entityId)!;

  platformBus.emit("import:entity_processed", {
    source,
    entityId: entity.entityId,
    qualityScore: quality.score,
    isDuplicate: false,
    conflicts: [],
  }, "system");

  return {
    canonical: entity,
    source,
    qualityScore: quality.score,
    isDuplicate: false,
    conflicts: [],
  };
}

/** Batch import */
export async function runBatchImport(
  source: ImportSource,
  rawItems: any[],
): Promise<LegacyImportResult[]> {
  const results: LegacyImportResult[] = [];
  for (const raw of rawItems) {
    try {
      const r = await runImportPipeline(source, raw);
      results.push(r);
    } catch (err) {
      console.error(`[import] Failed for source=${source}`, err);
    }
  }
  platformBus.emit("import:batch_completed", {
    source,
    total: rawItems.length,
    imported: results.length,
    duplicates: 0,
  }, "system");
  return results;
}
