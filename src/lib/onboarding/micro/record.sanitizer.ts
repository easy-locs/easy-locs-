/**
 * Record Sanitizer — Applies all normalization + dedup to a canonical record.
 * ONE responsibility: clean a CanonicalOnboardingRecord before persistence.
 */
import type { CanonicalOnboardingRecord } from "../types";
import { normalizeText, normalizeTextArray } from "./text.normalizer";
import { dedupePhotos } from "./photo.deduplicator";
import { dedupeNamedItems } from "./item.deduplicator";

export function sanitizeCanonicalRecord(record: CanonicalOnboardingRecord): CanonicalOnboardingRecord {
  return {
    ...record,
    canonicalName: normalizeText(record.canonicalName),
    branchName: normalizeText(record.branchName),
    address: normalizeText(record.address),
    city: normalizeText(record.city),
    district: normalizeText(record.district),
    country: normalizeText(record.country),
    photos: dedupePhotos(record.photos),
    categories: normalizeTextArray(record.categories),
    subcategories: normalizeTextArray(record.subcategories),
    menuItems: dedupeNamedItems([...record.menuItems]),
    hotelInventory: dedupeNamedItems([...record.hotelInventory]),
    serviceItems: dedupeNamedItems([...record.serviceItems]),
  };
}
