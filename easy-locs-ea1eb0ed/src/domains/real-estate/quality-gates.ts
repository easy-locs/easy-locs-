import type { Property, PropertyQualityScore } from "./canonical-types";

const MIN_PHOTOS = 3;
const MIN_DESCRIPTION_LENGTH = 50;
const MIN_DOCUMENTS_FOR_FULL_SCORE = 3;
const PUBLISH_THRESHOLD = 70;

export function scoreProperty(property: Property, documentCount?: number): PropertyQualityScore {
  const issues: string[] = [];
  const breakdown = { photos: 0, description: 0, address: 0, pricing: 0, taxonomy: 0, documents: 0 };

  if (property.mediaIds.length >= MIN_PHOTOS) {
    breakdown.photos = 100;
  } else if (property.mediaIds.length > 0) {
    breakdown.photos = Math.round((property.mediaIds.length / MIN_PHOTOS) * 100);
    issues.push(`re.quality.min_photos_${MIN_PHOTOS}`);
  } else {
    issues.push("re.quality.no_photos");
  }

  if (property.description && property.description.length >= MIN_DESCRIPTION_LENGTH) {
    breakdown.description = 100;
  } else if (property.description && property.description.length > 0) {
    breakdown.description = Math.round((property.description.length / MIN_DESCRIPTION_LENGTH) * 100);
    issues.push("re.quality.short_description");
  } else {
    issues.push("re.quality.no_description");
  }

  if (property.address.city && property.address.country) {
    breakdown.address = property.address.geoPoint ? 100 : 70;
    if (!property.address.geoPoint) issues.push("re.quality.no_geo");
  } else {
    issues.push("re.quality.incomplete_address");
  }

  if (property.price > 0) {
    breakdown.pricing = 100;
  } else {
    issues.push("re.quality.no_price");
  }

  if (property.propertyType && property.propertyCategory && property.listingType) {
    breakdown.taxonomy = 100;
  } else {
    issues.push("re.quality.incomplete_taxonomy");
  }

  const docCount = documentCount ?? 0;
  if (docCount >= MIN_DOCUMENTS_FOR_FULL_SCORE) {
    breakdown.documents = 100;
  } else if (docCount > 0) {
    breakdown.documents = Math.round((docCount / MIN_DOCUMENTS_FOR_FULL_SCORE) * 100);
    issues.push("re.quality.few_documents");
  } else {
    breakdown.documents = 0;
    issues.push("re.quality.no_documents");
  }

  const weights = { photos: 0.25, description: 0.15, address: 0.2, pricing: 0.2, taxonomy: 0.15, documents: 0.05 };
  const overall = Math.round(
    breakdown.photos * weights.photos +
    breakdown.description * weights.description +
    breakdown.address * weights.address +
    breakdown.pricing * weights.pricing +
    breakdown.taxonomy * weights.taxonomy +
    breakdown.documents * weights.documents
  );

  const canPublish =
    breakdown.photos > 0 &&
    breakdown.pricing === 100 &&
    breakdown.address >= 70 &&
    breakdown.taxonomy === 100 &&
    overall >= PUBLISH_THRESHOLD;

  return { propertyId: property.id, overall, breakdown, issues, canPublish };
}

export function getPublishBlockers(property: Property): string[] {
  const blockers: string[] = [];
  if (property.mediaIds.length === 0) blockers.push("re.quality.no_photos");
  if (property.price <= 0) blockers.push("re.quality.no_price");
  if (!property.address.city || !property.address.country) blockers.push("re.quality.incomplete_address");
  if (!property.propertyType) blockers.push("re.quality.no_type");
  if (!property.propertyCategory) blockers.push("re.quality.no_category");
  if (!property.listingType) blockers.push("re.quality.no_listing_type");
  return blockers;
}
