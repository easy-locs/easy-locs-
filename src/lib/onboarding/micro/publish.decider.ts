/**
 * Publish Decider — MIGRATED to import-engine.
 * Delegates to the canonical quality scorer and publish gate.
 */
import type { CanonicalOnboardingRecord } from "../types";
import { scoreQuality, evaluatePublishGate, type CanonicalEntity } from "@/lib/import-engine";
import type { PublishDecision } from "./pipeline.types";

/** Convert a CanonicalOnboardingRecord to a CanonicalEntity for the engine */
function toCanonicalEntity(record: CanonicalOnboardingRecord): CanonicalEntity {
  return {
    entityId: record.entityId,
    vertical: record.vertical as any,
    status: "draft",
    canonicalName: record.canonicalName,
    branchName: null,
    slug: null,
    description: null,
    taxonomy: { family: "unknown", category: record.categories?.[0] ?? "general", subcategory: "general", tags: record.categories ?? [], confidence: 50 },
    address: record.address,
    city: record.city ?? null,
    district: null,
    country: null,
    lat: record.lat ?? null,
    lng: record.lng ?? null,
    phone: record.phone ?? null,
    website: null,
    menuItems: record.menuItems ?? [],
    hotelInventory: record.hotelInventory ?? [],
    serviceItems: record.serviceItems ?? [],
    photos: record.photos ?? [],
    logoUrl: null,
    rating: null,
    reviewCount: null,
    openingHours: null,
    seoTitle: null,
    seoDescription: null,
    sourceProofs: [],
    mergeConfidence: 0.5,
    missingFields: record.missingFields ?? [],
    needsReview: record.needsReview ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function decidePublish(record: CanonicalOnboardingRecord): PublishDecision {
  const entity = toCanonicalEntity(record);
  const quality = scoreQuality(entity);
  const gate = evaluatePublishGate(entity, quality);

  return {
    entityId: record.entityId,
    allowed: gate.allowed,
    targetVisibility: gate.allowed ? "public" : "draft",
    reasons: gate.reasons,
    qualityScore: quality.score,
  };
}
