/**
 * Storefront Persistence — Upserts canonical records into storefront_pages.
 */
import { supabase } from "@/integrations/supabase/client";
import type { StorefrontDraftPayload } from "./storefront-output.types";

export async function upsertStorefrontPage(
  entityId: string,
  slug: string,
  payload: StorefrontDraftPayload,
  userId?: string,
  orgId?: string,
) {
  const db = supabase as any;

  const visibilityMode = payload.publish_visibility === "public" ? "live" : "coming_soon";
  const readinessStatus = payload.publish_visibility === "public" ? "ready" : "draft";

  const row: Record<string, any> = {
    name: payload.canonical_name,
    slug,
    vertical: payload.vertical,
    category: payload.category,
    subcategory: payload.subcategory,

    description: payload.description,
    address: payload.address,
    city: payload.city,
    region: payload.district,
    country: payload.country,
    latitude: payload.latitude,
    longitude: payload.longitude,

    phone: payload.phone,
    website: payload.website,

    opening_hours: payload.opening_hours_json,

    source_proofs_json: payload.source_proofs_json,
    merge_confidence: payload.merge_confidence,
    missing_fields_json: payload.missing_fields,
    needs_review: payload.needs_review,

    visibility_mode: visibilityMode,
    readiness_status: readinessStatus,
    is_auto_generated: true,
    is_claimed: false,
    has_photo: (payload.gallery_urls?.length ?? 0) > 0,
    has_menu: (payload.menu_items_json?.length ?? 0) > 0,
    products_count: payload.menu_items_json?.length ?? 0,
    source_type: "import_ai",
    source_confidence: payload.merge_confidence,
  };

  if (userId) row.user_id = userId;
  if (orgId) row.org_id = orgId;

  // Check if storefront already exists for this slug
  const { data: existing } = await db
    .from("storefront_pages")
    .select("id, slug")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("storefront_pages")
      .update(row)
      .eq("id", existing.id);
    if (error) throw error;
    return {
      id: existing.id,
      slug: existing.slug,
      status: readinessStatus,
      shop_visibility: visibilityMode,
    };
  }

  const { data, error } = await db
    .from("storefront_pages")
    .insert(row)
    .select("id, slug")
    .single();

  if (error) throw error;
  return {
    id: data.id as string,
    slug: data.slug as string,
    status: readinessStatus,
    shop_visibility: visibilityMode,
  };
}
