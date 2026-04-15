/**
 * persistence.storefront.create_or_update — Creates or updates storefront pages.
 * ONE thing: upsert into storefront_pages.
 */
import { db } from "@/services/db";
import type { StorefrontPayload } from "../contracts";

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function createOrUpdateStorefront(
  entityId: string,
  payload: StorefrontPayload,
  visibilityMode: string,
): Promise<{ id: string; slug: string; status: string; visibility: string }> {
  
  const slug = `${slugify(payload.canonical_name || "merchant")}-${entityId.slice(0, 8)}`;
  const readinessStatus = payload.publish_visibility === "public" ? "ready" : "draft";

  const row: Record<string, any> = {
    name: payload.canonical_name,
    slug,
    vertical: payload.vertical,
    category: payload.category,
    subcategory: payload.subcategory,
    description: payload.ai_description ?? payload.description,
    ai_description: payload.ai_description,
    seo_title: payload.seo_title,
    seo_description: payload.seo_description,
    seo_keywords: payload.seo_keywords,
    address: payload.address,
    city: payload.city,
    region: payload.district,
    country: payload.country,
    latitude: payload.latitude,
    longitude: payload.longitude,
    phone: payload.phone,
    email: payload.email,
    website: payload.website,
    opening_hours: payload.opening_hours_json,
    source_proofs_json: payload.source_proofs_json,
    merge_confidence: payload.merge_confidence,
    missing_fields_json: payload.missing_fields,
    needs_review: payload.needs_review,
    visibility_mode: visibilityMode,
    readiness_status: readinessStatus,
    cover_auto_url: payload.cover_image_url ?? null,
    logo_auto_url: payload.logo_url ?? null,
    cover_image: payload.cover_image_url ?? null,
    gallery_images: payload.gallery_urls ?? [],
    menu_items_json: payload.menu_items_json ?? null,
    is_auto_generated: true,
    is_claimed: false,
    has_photo: (payload.gallery_urls?.length ?? 0) > 0 || !!payload.cover_image_url,
    has_menu: (payload.menu_items_json?.length ?? 0) > 0,
    products_count: payload.menu_items_json?.length ?? 0,
    source_type: "import_ai",
    source_confidence: payload.merge_confidence,
    cover_source: "aggregator",
  };

  const { data: existing } = await db
    .from("storefront_pages")
    .select("id, slug")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await db("storefront_pages").update(row).eq("id", existing.id);
    if (error) throw error;
    return { id: existing.id, slug: existing.slug, status: readinessStatus, visibility: visibilityMode };
  }

  const { data, error } = await db("storefront_pages").insert(row).select("id, slug").single();
  if (error) throw error;
  return { id: data.id, slug: data.slug, status: readinessStatus, visibility: visibilityMode };
}
