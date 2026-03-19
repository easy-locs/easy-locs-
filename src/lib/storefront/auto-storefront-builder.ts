/**
 * Auto Storefront Builder
 * Creates storefront pages for imported merchants automatically.
 */
import { supabase } from "@/integrations/supabase/client";

function generateSlug(name: string, city: string): string {
  const base = `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export async function autoCreateStorefront(params: {
  merchantProfileId: string;
  merchantName: string;
  city: string;
  countryCode: string;
  category?: string;
  userId: string;
  orgId: string;
}): Promise<{ shopId: string; slug: string }> {
  // Check if storefront already exists
  const { data: profile } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("shop_id")
    .eq("id", params.merchantProfileId)
    .maybeSingle();

  if (profile?.shop_id) {
    const { data: shop } = await (supabase as any)
      .from("storefront_pages")
      .select("id, public_slug")
      .eq("id", profile.shop_id)
      .maybeSingle();
    if (shop) return { shopId: shop.id, slug: shop.public_slug };
  }

  const slug = generateSlug(params.merchantName, params.city);

  const { data: shop, error } = await (supabase as any)
    .from("storefront_pages")
    .insert({
      name: params.merchantName,
      public_slug: slug,
      city: params.city,
      country: params.countryCode,
      status: "coming_soon",
      user_id: params.userId,
      org_id: params.orgId,
      vertical: params.category ?? "food",
      metadata_json: { auto_generated: true, source: "auto_storefront_builder" },
    } as any)
    .select("id, public_slug")
    .single();

  if (error) throw error;

  // Link to merchant profile
  await (supabase as any)
    .from("merchant_onboarding_profiles")
    .update({ shop_id: shop.id } as any)
    .eq("id", params.merchantProfileId);

  return { shopId: shop.id, slug: shop.public_slug };
}
