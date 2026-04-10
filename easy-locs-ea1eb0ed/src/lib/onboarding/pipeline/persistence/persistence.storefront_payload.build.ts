/**
 * persistence.storefront_payload.build — Builds storefront-ready payload from pipeline data.
 * ONE thing: transform canonical + governance into DB-ready payload.
 */
import type { StorefrontPayload, GovernanceLayerOutput, MediaLayerOutput, TaxonomyCategoryMapping, GeoResolution } from "../contracts";
import type { CanonicalOnboardingRecord } from "../../types";

export function buildStorefrontPayload(params: {
  record: CanonicalOnboardingRecord;
  governance: GovernanceLayerOutput;
  media: MediaLayerOutput;
  taxonomy: TaxonomyCategoryMapping;
  geo: GeoResolution;
}): StorefrontPayload {
  return {
    canonical_name: params.record.canonicalName ?? "",
    vertical: params.taxonomy.vertical,
    category: params.taxonomy.category,
    subcategory: params.taxonomy.subcategory,
    description: null,
    address: params.record.address,
    city: params.geo.city ?? params.record.city,
    district: params.geo.district ?? params.record.district,
    country: params.geo.countryCode ?? params.record.country,
    latitude: params.geo.lat ?? params.record.lat,
    longitude: params.geo.lng ?? params.record.lng,
    phone: params.record.phone,
    website: params.record.website,
    opening_hours_json: params.record.openingHours,
    logo_url: params.media.selectedLogo,
    cover_image_url: params.media.selectedCover,
    gallery_urls: params.media.gallery,
    menu_items_json: params.record.menuItems,
    hotel_inventory_json: params.record.hotelInventory,
    service_items_json: params.record.serviceItems,
    source_proofs_json: params.record.sourceProofs as unknown as Record<string, unknown>[],
    merge_confidence: params.record.mergeConfidence,
    missing_fields: params.record.missingFields,
    needs_review: params.record.needsReview,
    publish_visibility: params.governance.publishDecision.targetVisibility,
    currency: params.geo.currency,
    timezone: params.geo.timezone,
    language: params.geo.language,
  };
}
