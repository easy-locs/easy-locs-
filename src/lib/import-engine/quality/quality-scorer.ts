/**
 * Quality Scorer — 5-dimension quality assessment.
 * Completeness | Media | Location | Catalog | Trust
 */
import type { CanonicalEntity, QualityReport, Vertical } from "../types";

// ─── Required fields per vertical ───
const REQUIRED_FIELDS: Record<Vertical, string[]> = {
  food: ["canonicalName", "address", "lat", "lng", "phone"],
  grocery: ["canonicalName", "address", "lat", "lng"],
  hotel: ["canonicalName", "address", "lat", "lng", "photos"],
  services: ["canonicalName", "address", "lat", "lng", "phone"],
  property: ["canonicalName", "address", "lat", "lng", "photos"],
};

const RECOMMENDED_FIELDS: Record<Vertical, string[]> = {
  food: ["logoUrl", "openingHours", "photos", "menuItems", "description", "seoTitle"],
  grocery: ["logoUrl", "openingHours", "photos", "description"],
  hotel: ["phone", "description", "rating", "logoUrl", "hotelInventory"],
  services: ["logoUrl", "openingHours", "photos", "description", "serviceItems"],
  property: ["description", "photos", "phone"],
};

function isPresent(entity: CanonicalEntity, field: string): boolean {
  const val = (entity as any)[field];
  if (val == null || val === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

export function scoreQuality(entity: CanonicalEntity): QualityReport {
  const details: string[] = [];
  const vertical = entity.vertical;

  // 1. Completeness (0-100)
  const required = REQUIRED_FIELDS[vertical] ?? [];
  const recommended = RECOMMENDED_FIELDS[vertical] ?? [];
  const reqFilled = required.filter(f => isPresent(entity, f)).length;
  const recFilled = recommended.filter(f => isPresent(entity, f)).length;
  const completeness = Math.round(
    ((reqFilled * 2 + recFilled) / (required.length * 2 + recommended.length)) * 100
  );
  if (reqFilled < required.length) {
    details.push(`Missing required: ${required.filter(f => !isPresent(entity, f)).join(", ")}`);
  }

  // 2. Media (0-100)
  const media = Math.min(100, entity.photos.length * 20);
  if (media === 0) details.push("No photos");

  // 3. Location (0-100)
  let location = 0;
  if (entity.lat != null && entity.lng != null) location = 70;
  if (entity.address) location += 15;
  if (entity.city) location += 15;
  if (!entity.lat) details.push("No coordinates");

  // 4. Catalog (0-100)
  const catalogItems = entity.menuItems.length + entity.hotelInventory.length + entity.serviceItems.length;
  const catalog = Math.min(100, catalogItems * 10);
  if (catalogItems === 0) details.push("No catalog items");

  // 5. Trust (0-100)
  let trust = Math.min(100, entity.sourceProofs.length * 25);
  if (entity.rating && entity.rating >= 4) trust = Math.min(100, trust + 20);
  if (entity.reviewCount && entity.reviewCount >= 10) trust = Math.min(100, trust + 10);

  const score = Math.round(
    completeness * 0.30 + media * 0.15 + location * 0.25 + catalog * 0.15 + trust * 0.15
  );

  const readyToPublish = score >= 65 && reqFilled === required.length;

  return { score, completeness, media, location, catalog, trust, details, readyToPublish };
}
