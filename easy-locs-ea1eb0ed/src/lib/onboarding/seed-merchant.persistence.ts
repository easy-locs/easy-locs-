/**
 * Seed Merchant Persistence — Upserts canonical records into seed_merchants.
 */
import { supabase } from "@/integrations/supabase/client";
import type { StorefrontDraftPayload } from "./storefront-output.types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertSeedMerchant(
  entityId: string,
  payload: StorefrontDraftPayload,
) {
  const db = supabase as any;

  const slugBase = slugify(payload.canonical_name || "merchant");
  const slug = `${slugBase}-${entityId.slice(0, 8)}`;

  const row: Record<string, any> = {
    name: payload.canonical_name,
    slug,
    vertical: payload.vertical,
    category: payload.category,
    subcategory: payload.subcategory,

    address: payload.address,
    city: payload.city ?? "Dubai",
    area: payload.district ?? payload.city ?? "Dubai",
    country: payload.country,
    latitude: payload.latitude,
    longitude: payload.longitude,

    phone: payload.phone,
    website: payload.website,

    cover_image: payload.cover_image_url,
    logo_image: payload.logo_url,

    opening_hours: payload.opening_hours_json,
    source_proofs_json: payload.source_proofs_json,
    merge_confidence: payload.merge_confidence,
    missing_fields_json: payload.missing_fields,
    needs_review: payload.needs_review,
    pipeline_stage: payload.publish_visibility === "public" ? "ready" : "needs_review",
    visibility_mode: payload.publish_visibility === "public" ? "live" : "hidden",
    is_open: true,
  };

  // Try update first, then insert
  const { data: existing } = await db
    .from("seed_merchants")
    .select("id, slug")
    .eq("name", payload.canonical_name)
    .eq("city", payload.city ?? "Dubai")
    .limit(1)
    .maybeSingle();

  if (existing) {
    await db
      .from("seed_merchants")
      .update(row)
      .eq("id", existing.id);
    return { id: existing.id, slug: existing.slug };
  }

  const { data, error } = await db
    .from("seed_merchants")
    .insert(row)
    .select("id, slug")
    .single();

  if (error) throw error;
  return data as { id: string; slug: string };
}
