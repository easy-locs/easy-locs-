/**
 * Merge Engine — Field-level merge using per-vertical source priority.
 * Produces a CanonicalEntity from a cluster of SourceEntityRecords.
 */
import type { CanonicalEntity, SourceEntityRecord, SourceEvidence, Vertical, SourceName, TaxonomyNode } from "../types";
import { getFieldPriority } from "../source-policy/field-priority";
import { mapToTaxonomy } from "../taxonomy/taxonomy-mapper";
import { generateSlug, generateSeoTitle, generateSeoDescription } from "../enrichment/seo-enricher";

export interface MergeHistory {
  field: string;
  chosenSource: string;
  reason: string;
}

function pickByPriority<T>(
  records: SourceEntityRecord[],
  field: keyof SourceEntityRecord,
  vertical: Vertical,
): { value: T | null; proof: SourceEvidence | null } {
  const priority = getFieldPriority(vertical, String(field));

  // Try priority order first
  for (const source of priority) {
    const row = records.find(r => r.source === source && r[field] != null && r[field] !== "");
    if (row) {
      return {
        value: row[field] as T,
        proof: {
          source,
          field: String(field),
          value: row[field],
          confidence: 0.9,
          fetchedAt: new Date().toISOString(),
          url: row.sourceUrl ?? null,
        },
      };
    }
  }

  // Fallback: any source
  const any = records.find(r => r[field] != null && r[field] !== "");
  if (any) {
    return {
      value: any[field] as T,
      proof: {
        source: any.source,
        field: String(field),
        value: any[field],
        confidence: 0.6,
        fetchedAt: new Date().toISOString(),
        url: any.sourceUrl ?? null,
      },
    };
  }

  return { value: null, proof: null };
}

function deduplicateByName(items: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = String(item.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Merge a cluster of source records into a single CanonicalEntity.
 */
export function mergeCluster(records: SourceEntityRecord[], vertical: Vertical): {
  entity: CanonicalEntity;
  history: MergeHistory[];
} {
  const history: MergeHistory[] = [];
  const proofs: SourceEvidence[] = [];

  const pick = <T>(field: keyof SourceEntityRecord): T | null => {
    const result = pickByPriority<T>(records, field, vertical);
    if (result.proof) {
      proofs.push(result.proof);
      history.push({ field: String(field), chosenSource: result.proof.source, reason: "priority" });
    }
    return result.value;
  };

  const canonicalName = pick<string>("name");
  const taxonomy = mapToTaxonomy(records[0]);

  // Merge array fields with dedup
  const allPhotos = [...new Set(records.flatMap(r => r.photos ?? []))];
  const allMenu = deduplicateByName(records.flatMap(r => r.menuItems ?? []));
  const allHotel = records.flatMap(r => r.hotelInventory ?? []);
  const allServices = records.flatMap(r => r.serviceItems ?? []);
  const allCategories = [...new Set(records.flatMap(r => r.categories ?? []))];

  const missingFields = [
    !canonicalName ? "canonicalName" : null,
    !pick<string>("address") ? "address" : null,
    records.every(r => r.lat == null) ? "lat" : null,
    records.every(r => r.lng == null) ? "lng" : null,
    allCategories.length === 0 ? "categories" : null,
  ].filter(Boolean) as string[];

  const now = new Date().toISOString();
  const mergeConfidence = Math.max(0, (100 - missingFields.length * 15)) / 100;

  const entity: CanonicalEntity = {
    entityId: crypto.randomUUID(),
    vertical,
    status: "draft",

    canonicalName,
    branchName: pick<string>("branchName"),
    slug: generateSlug(canonicalName, pick<string>("city")),
    description: pick<string>("description"),

    taxonomy,

    address: pick<string>("address"),
    city: pick<string>("city") ?? records.find(r => r.city)?.city ?? null,
    district: pick<string>("district") ?? records.find(r => r.district)?.district ?? null,
    country: pick<string>("country") ?? records.find(r => r.country)?.country ?? null,
    lat: records.find(r => r.lat != null)?.lat ?? null,
    lng: records.find(r => r.lng != null)?.lng ?? null,

    phone: pick<string>("phone"),
    website: pick<string>("website"),

    menuItems: allMenu,
    hotelInventory: allHotel,
    serviceItems: allServices,

    photos: allPhotos,
    logoUrl: allPhotos[0] ?? null,

    rating: Math.max(...records.map(r => r.rating ?? 0)) || null,
    reviewCount: records.reduce((s, r) => s + (r.reviewCount ?? 0), 0) || null,

    openingHours: pick<Record<string, unknown>>("openingHours"),

    seoTitle: generateSeoTitle(canonicalName, taxonomy),
    seoDescription: generateSeoDescription(canonicalName, taxonomy, pick<string>("city")),

    sourceProofs: proofs,
    mergeConfidence,
    missingFields,
    needsReview: missingFields.length > 0 || mergeConfidence < 0.6,

    createdAt: now,
    updatedAt: now,
  };

  return { entity, history };
}
