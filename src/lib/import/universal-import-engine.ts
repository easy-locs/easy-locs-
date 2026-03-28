/**
 * Universal Import Engine — DEPRECATED FACADE.
 * ================================================
 * All logic now delegates to src/lib/import-engine (canonical engine).
 * This file exists ONLY for backward compatibility.
 * DO NOT add new logic here. Import from "@/lib/import-engine" directly.
 */
import {
  detectDuplicates as _detectDuplicates,
  computeDedupScore as _computeDedupScore,
  groupByDuplicates as _groupByDuplicates,
  mergeCluster,
  scoreQuality as _scoreQuality,
  type CanonicalEntity,
  type QualityReport,
  type DedupMatch,
  type SourceEntityRecord,
  type Vertical,
} from "@/lib/import-engine";
import type { CanonicalOnboardingRecord } from "@/lib/onboarding/types";

// ─── Re-export canonical types under legacy names ───
export type { DedupMatch, QualityReport };

export interface MergeResult {
  merged: CanonicalOnboardingRecord;
  mergeHistory: Array<{ field: string; chosenSource: string; reason: string }>;
}

// ─── Detect duplicates — delegates to canonical engine ───
export function detectDuplicates(records: SourceEntityRecord[]): DedupMatch[] {
  return _detectDuplicates(records as any);
}

// ─── Merge records — delegates to canonical engine ───
export function mergeRecords(records: SourceEntityRecord[], vertical: Vertical): MergeResult {
  const { entity, history } = mergeCluster(records as any, vertical);
  // Convert CanonicalEntity back to legacy CanonicalOnboardingRecord shape
  const merged: CanonicalOnboardingRecord = {
    entityId: entity.entityId,
    vertical,
    canonicalName: entity.canonicalName ?? "",
    branchName: entity.branchName,
    address: entity.address,
    city: entity.city,
    district: entity.district,
    country: entity.country,
    lat: entity.lat,
    lng: entity.lng,
    phone: entity.phone,
    website: entity.website,
    categories: entity.taxonomy.tags,
    subcategories: [entity.taxonomy.subcategory],
    openingHours: entity.openingHours,
    menuItems: entity.menuItems,
    hotelInventory: entity.hotelInventory,
    serviceItems: entity.serviceItems,
    photos: entity.photos,
    rating: entity.rating,
    reviewCount: entity.reviewCount,
    sourceProofs: entity.sourceProofs.map(p => ({
      source: p.source,
      field: p.field,
      value: p.value,
      confidence: p.confidence,
      fetchedAt: p.fetchedAt,
      url: p.url ?? null,
    })),
    mergeConfidence: entity.mergeConfidence,
    missingFields: entity.missingFields,
    needsReview: entity.needsReview,
  };
  return {
    merged,
    mergeHistory: history.map(h => ({ field: h.field, chosenSource: h.chosenSource, reason: h.reason })),
  };
}

// ─── Score quality — delegates to canonical engine ───
export function scoreQuality(record: CanonicalOnboardingRecord): QualityReport {
  // Build a minimal CanonicalEntity from the legacy record for scoring
  const entity: CanonicalEntity = {
    entityId: record.entityId,
    vertical: record.vertical as any,
    status: "draft",
    canonicalName: record.canonicalName,
    branchName: record.branchName ?? null,
    slug: null,
    description: null,
    taxonomy: { family: "unknown", category: record.categories?.[0] ?? "general", subcategory: "general", tags: record.categories ?? [], confidence: 50 },
    address: record.address ?? null,
    city: record.city ?? null,
    district: record.district ?? null,
    country: record.country ?? null,
    lat: record.lat ?? null,
    lng: record.lng ?? null,
    phone: record.phone ?? null,
    website: record.website ?? null,
    menuItems: record.menuItems ?? [],
    hotelInventory: record.hotelInventory ?? [],
    serviceItems: record.serviceItems ?? [],
    photos: record.photos ?? [],
    logoUrl: null,
    rating: record.rating ?? null,
    reviewCount: record.reviewCount ?? null,
    openingHours: record.openingHours ?? null,
    seoTitle: null,
    seoDescription: null,
    sourceProofs: record.sourceProofs ?? [],
    mergeConfidence: record.mergeConfidence ?? 0.5,
    missingFields: record.missingFields ?? [],
    needsReview: record.needsReview ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return _scoreQuality(entity);
}
