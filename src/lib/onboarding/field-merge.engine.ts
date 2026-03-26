/**
 * Field-Level Merge Engine — Merges data from multiple sources field-by-field.
 * Each field is resolved independently using per-vertical source priority.
 */
import type {
  CanonicalOnboardingRecord,
  SourceEntityRecord,
  SourceEvidence,
  Vertical,
  SourceName,
} from "./types";

const FIELD_PRIORITY: Record<Vertical, Record<string, SourceName[]>> = {
  food: {
    canonicalName: ["official_web", "deliveroo", "talabat", "careem", "noon", "google_business"],
    address: ["google_business", "official_web", "deliveroo", "talabat", "careem"],
    phone: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business", "deliveroo", "talabat", "careem"],
    menuItems: ["deliveroo", "talabat", "careem", "noon", "official_web"],
    photos: ["official_web", "deliveroo", "talabat", "careem"],
  },
  grocery: {
    canonicalName: ["official_web", "talabat", "careem", "noon", "google_business"],
    address: ["google_business", "official_web", "talabat", "careem", "noon"],
    phone: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business", "talabat", "careem", "noon"],
    menuItems: ["talabat", "careem", "noon", "official_web"],
    photos: ["official_web", "talabat", "careem", "noon"],
  },
  hotel: {
    canonicalName: ["official_web", "booking", "expedia", "govoyage", "google_business"],
    address: ["booking", "expedia", "official_web", "google_business"],
    phone: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web"],
    hotelInventory: ["booking", "expedia", "govoyage", "official_web"],
    photos: ["official_web", "booking", "expedia", "govoyage"],
  },
  services: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business", "trusted_directory"],
    serviceItems: ["official_web", "trusted_directory"],
    photos: ["official_web", "google_business", "trusted_directory"],
  },
  property: {
    canonicalName: ["crm_import", "property_portal", "official_web"],
    address: ["crm_import", "property_portal", "official_web", "google_business"],
    phone: ["crm_import", "official_web", "google_business"],
    website: ["official_web"],
    photos: ["crm_import", "property_portal", "official_web"],
  },
};

function firstByPriority<T>(
  records: SourceEntityRecord[],
  field: keyof SourceEntityRecord,
  orderedSources: SourceName[],
): { value: T | null; proof: SourceEvidence[] } {
  for (const source of orderedSources) {
    const row = records.find((r) => r.source === source && r[field] != null);
    if (row && row[field] != null) {
      return {
        value: row[field] as T,
        proof: [{
          source,
          field: String(field),
          value: row[field],
          confidence: 0.9,
          fetchedAt: new Date().toISOString(),
          url: row.sourceUrl ?? null,
        }],
      };
    }
  }
  return { value: null, proof: [] };
}

export function mergeEntityRecords(
  vertical: Vertical,
  records: SourceEntityRecord[],
): CanonicalOnboardingRecord {
  const priorities = FIELD_PRIORITY[vertical];

  const name = firstByPriority<string>(records, "name", priorities.canonicalName ?? []);
  const address = firstByPriority<string>(records, "address", priorities.address ?? []);
  const phone = firstByPriority<string>(records, "phone", priorities.phone ?? []);
  const website = firstByPriority<string>(records, "website", priorities.website ?? []);
  const openingHours = firstByPriority<Record<string, unknown>>(records, "openingHours", priorities.openingHours ?? []);
  const menuItems = firstByPriority<Array<Record<string, unknown>>>(records, "menuItems", priorities.menuItems ?? []);
  const hotelInventory = firstByPriority<Array<Record<string, unknown>>>(records, "hotelInventory", priorities.hotelInventory ?? []);
  const serviceItems = firstByPriority<Array<Record<string, unknown>>>(records, "serviceItems", priorities.serviceItems ?? []);
  const photos = firstByPriority<string[]>(records, "photos", priorities.photos ?? []);

  const city = records.find((r) => r.city)?.city ?? null;
  const district = records.find((r) => r.district)?.district ?? null;
  const country = records.find((r) => r.country)?.country ?? null;
  const lat = records.find((r) => r.lat != null)?.lat ?? null;
  const lng = records.find((r) => r.lng != null)?.lng ?? null;
  const branchName = records.find((r) => r.branchName)?.branchName ?? null;

  const categories = [...new Set(records.flatMap((r) => r.categories ?? []))];
  const subcategories = [...new Set(records.flatMap((r) => r.subcategories ?? []))];

  const rating = records.find((r) => r.rating != null)?.rating ?? null;
  const reviewCount = records.find((r) => r.reviewCount != null)?.reviewCount ?? null;

  const sourceProofs = [
    ...name.proof, ...address.proof, ...phone.proof, ...website.proof,
    ...openingHours.proof, ...menuItems.proof, ...hotelInventory.proof,
    ...serviceItems.proof, ...photos.proof,
  ];

  const missingFields = [
    !name.value ? "canonicalName" : null,
    !address.value ? "address" : null,
    lat == null ? "lat" : null,
    lng == null ? "lng" : null,
    categories.length === 0 ? "categories" : null,
  ].filter(Boolean) as string[];

  const confidenceBase = Math.max(0, 100 - missingFields.length * 15) / 100;

  return {
    entityId: crypto.randomUUID(),
    vertical,
    canonicalName: name.value,
    branchName,
    address: address.value,
    city, district, country, lat, lng,
    phone: phone.value,
    website: website.value,
    categories, subcategories,
    openingHours: openingHours.value,
    menuItems: menuItems.value ?? [],
    hotelInventory: hotelInventory.value ?? [],
    serviceItems: serviceItems.value ?? [],
    photos: photos.value ?? [],
    rating, reviewCount,
    sourceProofs,
    mergeConfidence: confidenceBase,
    missingFields,
    needsReview: missingFields.length > 0,
  };
}
