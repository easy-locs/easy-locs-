/**
 * Auto Storefront Builder
 * Creates storefront pages for imported merchants automatically.
 * World-ready: supports full canonical layers (identity, geo, taxonomy, capabilities).
 */
import { db } from "@/services/db";
import { canonicalTaxonomyPayload } from "@/lib/taxonomy/taxonomy-guard";
import { classifyBusiness, type ClassificationInput } from "@/lib/taxonomy/classification-engine";

function generateSlug(name: string, city: string): string {
  const base = `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export interface AutoStorefrontParams {
  merchantProfileId: string;
  merchantName: string;
  city: string;
  countryCode: string;
  category?: string;
  userId: string;
  orgId: string;
  // Taxonomy
  vertical?: string;
  cluster?: string;
  subcategory?: string;
  tags?: string[];
  serviceModes?: string[];
  // Geography
  cityCode?: string;
  districtCode?: string;
  districtName?: string;
  coverageType?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  // World-readiness
  defaultLanguage?: string;
  timezone?: string;
  currency?: string;
  openingHours?: Record<string, any>;
  // Capabilities
  capWallet?: boolean;
  capQr?: boolean;
  capChat?: boolean;
  capCall?: boolean;
  capBooking?: boolean;
  capDelivery?: boolean;
  capSubscription?: boolean;
}

export async function autoCreateStorefront(params: AutoStorefrontParams): Promise<{ shopId: string; slug: string }> {
  // Check if storefront already exists
  const { data: profile } = await db
    .from("merchant_onboarding_profiles")
    .select("shop_id")
    .eq("id", params.merchantProfileId)
    .maybeSingle();

  if (profile?.shop_id) {
    const { data: shop } = await db
      .from("storefront_pages")
      .select("id, slug")
      .eq("id", profile.shop_id)
      .maybeSingle();
    if (shop) return { shopId: shop.id, slug: shop.slug };
  }

  const slug = generateSlug(params.merchantName, params.city);

  // ── Intelligent Classification Engine ──
  const classificationInput: ClassificationInput = {
    businessName: params.merchantName,
    sourceCategory: params.category,
    sourceSubcategory: params.subcategory,
    tags: params.tags,
  };
  const classification = classifyBusiness(classificationInput);

  // Use explicit vertical if provided, otherwise use engine result
  const resolvedVertical = params.vertical ?? classification.canonical_vertical;

  const insertPayload: Record<string, any> = {
    name: params.merchantName,
    slug,
    city: params.city,
    country: params.countryCode,
    visibility_mode: "coming_soon",
    user_id: params.userId,
    org_id: params.orgId,
    vertical: resolvedVertical,
    metadata_json: { auto_generated: true, source: "auto_storefront_builder" },
    source_type: "import_ai",
    source_confidence: classification.confidence_score,
    readiness_status: "draft",
    is_auto_generated: true,
    is_claimed: false,
    has_photo: false,
    has_menu: false,
    products_count: 0,
    // Classification engine fields
    classification_confidence: classification.confidence_score,
    classification_reason: classification.classification_reason,
    classification_version: classification.classification_version,
    classification_signals: classification.source_signals_used,
    requires_review: classification.requires_review,
    last_classified_at: new Date().toISOString(),
  };

  // Canonical taxonomy
  const tax = canonicalTaxonomyPayload(params.vertical ?? params.category, params.cluster, params.subcategory);
  if (tax.cluster) insertPayload.cluster = tax.cluster;

  // Taxonomy (nullable/safe)
  if (params.subcategory) insertPayload.subcategory = params.subcategory;
  if (params.tags?.length) insertPayload.tags = params.tags;

  // Geography
  if (params.cityCode) insertPayload.city_code = params.cityCode;
  if (params.districtCode) insertPayload.district_code = params.districtCode;
  if (params.districtName) insertPayload.region = params.districtName;
  if (params.coverageType) insertPayload.coverage_type = params.coverageType;
  if (params.latitude != null) insertPayload.latitude = params.latitude;
  if (params.longitude != null) insertPayload.longitude = params.longitude;
  if (params.address) insertPayload.address = params.address;

  // World-readiness
  if (params.defaultLanguage) insertPayload.default_language = params.defaultLanguage;
  if (params.timezone) insertPayload.timezone = params.timezone;
  if (params.currency) insertPayload.currency = params.currency;
  if (params.openingHours) insertPayload.opening_hours = params.openingHours;

  // Capabilities
  if (params.capWallet != null) insertPayload.cap_wallet = params.capWallet;
  if (params.capQr != null) insertPayload.cap_qr = params.capQr;
  if (params.capChat != null) insertPayload.cap_chat = params.capChat;
  if (params.capCall != null) insertPayload.cap_call = params.capCall;
  if (params.capBooking != null) insertPayload.cap_booking = params.capBooking;
  if (params.capDelivery != null) insertPayload.cap_delivery = params.capDelivery;

  const { data: shop, error } = await db
    .from("storefront_pages")
    .insert(insertPayload)
    .select("id, slug")
    .single();

  if (error) throw error;

  // Link to merchant profile
  await db
    .from("merchant_onboarding_profiles")
    .update({ shop_id: shop.id } as any)
    .eq("id", params.merchantProfileId);

  return { shopId: shop.id, slug: shop.slug };
}
