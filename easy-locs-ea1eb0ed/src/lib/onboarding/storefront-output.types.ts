/**
 * Storefront Output Types — Payload structure for draft/public storefront creation.
 */
export interface StorefrontDraftPayload {
  canonical_name: string;
  vertical: string;
  category: string | null;
  subcategory: string | null;

  description: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;

  phone: string | null;
  website: string | null;
  opening_hours_json: Record<string, unknown> | null;

  logo_url: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];

  menu_items_json: Record<string, unknown>[];
  hotel_inventory_json: Record<string, unknown>[];
  service_items_json: Record<string, unknown>[];

  source_proofs_json: Record<string, unknown>[];
  merge_confidence: number;
  missing_fields: string[];
  needs_review: boolean;
  publish_visibility: "draft" | "public";
}
