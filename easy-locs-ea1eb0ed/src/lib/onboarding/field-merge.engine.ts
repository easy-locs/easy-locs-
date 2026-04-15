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

const FIELD_PRIORITY: Record<string, Record<string, SourceName[]>> = {
  food: {
    canonicalName: ["official_web", "deliveroo", "talabat", "careem", "noon", "google_business"],
    address: ["google_business", "official_web", "deliveroo", "talabat", "careem"],
    phone: ["official_web", "google_business"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business", "deliveroo", "talabat", "careem"],
    menuItems: ["deliveroo", "talabat", "careem", "noon", "official_web"],
    photos: ["official_web", "deliveroo", "talabat", "careem"],
  },
  grocery: {
    canonicalName: ["official_web", "talabat", "careem", "noon", "google_business"],
    address: ["google_business", "official_web", "talabat", "careem", "noon"],
    phone: ["official_web", "google_business"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business", "talabat", "careem", "noon"],
    menuItems: ["talabat", "careem", "noon", "official_web"],
    photos: ["official_web", "talabat", "careem", "noon"],
  },
  hotel: {
    canonicalName: ["official_web", "booking", "expedia", "govoyage", "google_business"],
    address: ["booking", "expedia", "official_web", "google_business"],
    phone: ["official_web", "google_business"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web"],
    hotelInventory: ["booking", "expedia", "govoyage", "official_web"],
    photos: ["official_web", "booking", "expedia", "govoyage"],
  },
  stay: {
    canonicalName: ["official_web", "booking", "expedia", "govoyage", "google_business"],
    address: ["booking", "expedia", "official_web", "google_business"],
    phone: ["official_web", "google_business"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web"],
    hotelInventory: ["booking", "expedia", "govoyage", "official_web"],
    photos: ["official_web", "booking", "expedia", "govoyage"],
  },
  services: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business", "trusted_directory"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business", "trusted_directory"],
    serviceItems: ["official_web", "trusted_directory"],
    photos: ["official_web", "google_business", "trusted_directory"],
  },
  property: {
    canonicalName: ["crm_import", "property_portal", "official_web"],
    address: ["crm_import", "property_portal", "official_web", "google_business"],
    phone: ["crm_import", "official_web", "google_business"],
    email: ["crm_import", "official_web", "google_business"],
    website: ["official_web"],
    photos: ["crm_import", "property_portal", "official_web"],
  },
  healthcare: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business", "trusted_directory"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  beauty: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business", "trusted_directory"],
    website: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  shops: {
    canonicalName: ["official_web", "google_business"],
    address: ["google_business", "official_web"],
    phone: ["official_web", "google_business"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  retail: {
    canonicalName: ["official_web", "google_business", "noon"],
    address: ["google_business", "official_web", "noon"],
    phone: ["official_web", "google_business"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business", "noon"],
  },
  mobility: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  experiences: {
    canonicalName: ["official_web", "google_business", "booking"],
    address: ["google_business", "official_web", "booking"],
    phone: ["official_web", "google_business"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business", "booking"],
  },
  utility: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  education: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  finance: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  delivery: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  events: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
  flight: {
    canonicalName: ["official_web", "google_business"],
    address: ["google_business", "official_web"],
    phone: ["official_web", "google_business"],
    email: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
  },
};

const RESOLUTION_PARAMS = new Set(["w", "h", "width", "height", "size", "resize", "fit", "crop", "quality", "q", "dpr"]);

function buildPhotoDedupeKey(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const meaningfulParams = new URLSearchParams();
    parsed.searchParams.forEach((value, key) => {
      if (RESOLUTION_PARAMS.has(key.toLowerCase())) {
        meaningfulParams.set(key.toLowerCase(), value);
      }
    });
    meaningfulParams.sort();
    const paramStr = meaningfulParams.toString();
    const base = `${parsed.origin}${parsed.pathname}`.toLowerCase();
    return paramStr ? `${base}?${paramStr}` : base;
  } catch {
    return url.replace(/[?#].*$/, "").trim().toLowerCase();
  }
}

function mergeAllPhotos(
  records: SourceEntityRecord[],
  orderedSources: SourceName[],
): { value: string[]; proof: SourceEvidence[] } {
  const seen = new Set<string>();
  const merged: string[] = [];
  const proofs: SourceEvidence[] = [];

  const sortedRecords = [...records].sort((a, b) => {
    const aIdx = orderedSources.indexOf(a.source as SourceName);
    const bIdx = orderedSources.indexOf(b.source as SourceName);
    const aPri = aIdx === -1 ? orderedSources.length : aIdx;
    const bPri = bIdx === -1 ? orderedSources.length : bIdx;
    return aPri - bPri;
  });

  for (const record of sortedRecords) {
    const photos = record.photos;
    if (!photos || !Array.isArray(photos) || photos.length === 0) continue;

    let addedFromSource = false;
    for (const url of photos) {
      const key = buildPhotoDedupeKey(url);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(url);
      addedFromSource = true;
    }

    if (addedFromSource) {
      proofs.push({
        source: record.source as SourceName,
        field: "photos",
        value: photos,
        confidence: 0.9,
        fetchedAt: new Date().toISOString(),
        url: record.sourceUrl ?? null,
      });
    }
  }

  return { value: merged, proof: proofs };
}

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
  const priorities: Record<string, SourceName[]> = FIELD_PRIORITY[vertical] ?? {};

  const name = firstByPriority<string>(records, "name", priorities.canonicalName ?? []);
  const address = firstByPriority<string>(records, "address", priorities.address ?? []);
  const phone = firstByPriority<string>(records, "phone", priorities.phone ?? []);
  const email = firstByPriority<string>(records, "email", priorities.email ?? []);
  const website = firstByPriority<string>(records, "website", priorities.website ?? []);
  const openingHours = firstByPriority<Record<string, unknown>>(records, "openingHours", priorities.openingHours ?? []);
  const menuItems = firstByPriority<Array<Record<string, unknown>>>(records, "menuItems", priorities.menuItems ?? []);
  const hotelInventory = firstByPriority<Array<Record<string, unknown>>>(records, "hotelInventory", priorities.hotelInventory ?? []);
  const serviceItems = firstByPriority<Array<Record<string, unknown>>>(records, "serviceItems", priorities.serviceItems ?? []);
  const photos = mergeAllPhotos(records, priorities.photos ?? []);

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
    ...name.proof, ...address.proof, ...phone.proof, ...email.proof, ...website.proof,
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
    email: email.value,
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
