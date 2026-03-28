/**
 * persistence.storefront.create_or_update — Creates or updates storefront pages.
 * ONE thing: upsert into storefront_pages.
 */
import { supabase } from "@/integrations/supabase/client";
import type { StorefrontPayload } from "../contracts";

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function createOrUpdateStorefront(
  entityId: string,
  payload: StorefrontPayload,
  visibilityMode: string,
): Promise<{ id: string; slug: string; status: string; visibility: string }> {
  const db = supabase as any;
  const slug = `${slugify(payload.canonical_name || "merchant")}-${entityId.slice(0, 8)}`;
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

  const { data: existing } = await db
    .from("storefront_pages")
    .select("id, slug")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from("storefront_pages").update(row).eq("id", existing.id);
    if (error) throw error;
    return { id: existing.id, slug: existing.slug, status: readinessStatus, visibility: visibilityMode };
  }

  const { data, error } = await db.from("storefront_pages").insert(row).select("id, slug").single();
  if (error) throw error;
  return { id: data.id, slug: data.slug, status: readinessStatus, visibility: visibilityMode };
}
