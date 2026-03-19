/**
 * Scalable Dubai restaurant importer — v2
 * Inserts 300+ restaurants into:
 *   - merchant_onboarding_sources
 *   - merchant_onboarding_profiles
 *   - menu_items
 *   - storefront_pages
 * All marked as unclaimed / coming_soon.
 * Now properly links storefront_pages.merchant_profile_id.
 */
import { supabase } from "@/integrations/supabase/client";
import { generateDubaiRestaurants, type GeneratedRestaurant } from "./dubai-restaurant-generator";

export interface ImportProgress {
  total: number;
  current: number;
  imported: number;
  skipped: number;
  errors: string[];
  done: boolean;
}

type ProgressCallback = (p: ImportProgress) => void;

export async function importDubaiRestaurantsV2(
  count: number = 300,
  onProgress?: ProgressCallback
): Promise<ImportProgress> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error("Must be authenticated to import");

  const { data: memberRow } = await (supabase as any)
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const orgId = memberRow?.org_id;
  if (!orgId) throw new Error("No organization found — create one first");

  const restaurants = generateDubaiRestaurants(count);
  const progress: ImportProgress = {
    total: restaurants.length,
    current: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    done: false,
  };

  const BATCH = 10;
  for (let i = 0; i < restaurants.length; i += BATCH) {
    const batch = restaurants.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((r) => importSingleRestaurant(r, userId, orgId))
    );

    for (const res of results) {
      progress.current++;
      if (res.status === "fulfilled") {
        if (res.value === "skipped") progress.skipped++;
        else progress.imported++;
      } else {
        progress.errors.push(res.reason?.message || "Unknown error");
      }
    }

    onProgress?.({ ...progress });
  }

  progress.done = true;
  onProgress?.({ ...progress });
  return progress;
}

async function importSingleRestaurant(
  r: GeneratedRestaurant,
  userId: string,
  orgId: string
): Promise<"imported" | "skipped"> {
  // Check duplicates
  const { data: existing } = await (supabase as any)
    .from("merchant_onboarding_sources")
    .select("id")
    .eq("source_external_id", r.source_external_id)
    .maybeSingle();

  if (existing) return "skipped";

  // 1. Source
  const { data: source, error: srcErr } = await (supabase as any)
    .from("merchant_onboarding_sources")
    .insert({
      source_type: r.source,
      source_name: r.source === "google_maps" ? "Google Maps" : r.source === "deliveroo" ? "Deliveroo" : "Careem",
      source_external_id: r.source_external_id,
      status: "imported",
      payload: { area: r.area, cuisine: r.cuisine_type, rating: r.rating, delivery_min: r.delivery_minutes },
    })
    .select("id")
    .single();
  if (srcErr) throw new Error(`source: ${srcErr.message}`);

  // 2. Merchant profile
  const { data: merchant, error: mErr } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .insert({
      merchant_name: r.merchant_name,
      contact_name: r.contact_name,
      phone: r.phone,
      email: r.email,
      city: r.city,
      area: r.area,
      cuisine_type: r.cuisine_type,
      onboarding_status: "imported_not_claimed",
      activation_mode: "coming_soon",
      source_id: source.id,
    })
    .select("id")
    .single();
  if (mErr) throw new Error(`merchant: ${mErr.message}`);

  // 3. Menu items (price can be null)
  if (r.menu_items.length > 0) {
    const rows = r.menu_items.map((item, idx) => ({
      merchant_profile_id: merchant.id,
      name: item.name,
      price: item.price ?? null,
      currency: "AED",
      description: item.description,
      is_available: true,
      sort_order: idx,
    }));
    const { error: menuErr } = await (supabase as any).from("menu_items").insert(rows);
    if (menuErr) throw new Error(`menu: ${menuErr.message}`);
  }

  // 4. Storefront page — NOW with merchant_profile_id linkage
  const { error: shopErr } = await (supabase as any)
    .from("storefront_pages")
    .insert({
      name: r.merchant_name,
      slug: r.slug,
      org_id: orgId,
      user_id: userId,
      merchant_profile_id: merchant.id, // ← Critical linkage
      entity_type: "fixed_store",
      presence_mode: "pin",
      coverage_mode: "radius",
      coverage_radius_m: 5000,
      city: r.city,
      country: "AE",
      currency: "AED",
      default_currency: "AED",
      contact_phone: r.phone,
      contact_email: r.email,
      description: `${r.cuisine_type} restaurant in ${r.area}, Dubai`,
      tagline: `Authentic ${r.cuisine_type} • ${r.area}`,
      tags: r.tags,
      theme_color: r.theme_color,
      latitude: r.lat,
      longitude: r.lng,
      anchor_lat: r.lat,
      anchor_lng: r.lng,
      rating: r.rating,
      active: false,
      shop_visibility: "coming_soon",
      vertical: "food",
      subcategory: r.category_key,
      seo_title: `${r.merchant_name} — ${r.cuisine_type} Delivery in Dubai`,
      seo_description: `Order ${r.cuisine_type} from ${r.merchant_name} in ${r.area}. Fast delivery in Dubai.`,
    });
  if (shopErr) throw new Error(`storefront: ${shopErr.message}`);

  return "imported";
}
