/**
 * To Storefront Payload — Transforms a canonical onboarding record into a storefront draft payload.
 */
import type { CanonicalOnboardingRecord } from "./types";
import type { StorefrontDraftPayload } from "./storefront-output.types";
import { mapToCanonicalTaxonomy } from "./taxonomy-mapper.engine";

export function toStorefrontDraftPayload(
  record: CanonicalOnboardingRecord,
  publishVisibility: "draft" | "public",
): StorefrontDraftPayload {
  const taxonomy = mapToCanonicalTaxonomy(record);

  const photos = record.photos ?? [];
  const logo = photos[0] ?? null;
  const cover = photos[1] ?? photos[0] ?? null;
  const gallery = photos.slice(0, 12);

  return {
    canonical_name: record.canonicalName ?? "",
    vertical: taxonomy.vertical,
    category: taxonomy.category,
    subcategory: taxonomy.subcategory,

    description: null,
    address: record.address,
    city: record.city,
    district: record.district,
    country: record.country,
    latitude: record.lat,
    longitude: record.lng,

    phone: record.phone,
    website: record.website,
    opening_hours_json: record.openingHours,

    logo_url: logo,
    cover_image_url: cover,
    gallery_urls: gallery,

    menu_items_json: record.menuItems,
    hotel_inventory_json: record.hotelInventory,
    service_items_json: record.serviceItems,

    source_proofs_json: record.sourceProofs as Record<string, unknown>[],
    merge_confidence: record.mergeConfidence,
    missing_fields: record.missingFields,
    needs_review: record.needsReview,
    publish_visibility: publishVisibility,
  };
}
