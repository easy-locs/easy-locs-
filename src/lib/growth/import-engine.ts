import { supabase } from "@/integrations/supabase/client";
import {
  buildMerchantSearchKey,
  dedupeStrings,
  safeText,
  slugify,
} from "@/lib/growth/helpers";
import type { ImportedMerchantRecord } from "@/lib/growth/types";
import { resolveTransactionCurrency } from "@/lib/currency";

export async function importMerchantRecord(input: ImportedMerchantRecord) {
  const dedupeKey = buildMerchantSearchKey({
    merchantName: input.merchantName,
    city: input.city,
    countryCode: input.countryCode,
    phone: input.phone,
  });

  // Check existing source
  const { data: existingSource } = await (supabase as any)
    .from("merchant_onboarding_sources")
    .select("id, source_external_id")
    .eq("source_type", input.sourceType)
    .eq("source_external_id", input.sourceExternalId)
    .maybeSingle();

  if (existingSource) {
    return { status: "duplicate" as const, sourceId: existingSource.id };
  }

  // Check existing profile by dedupe key
  const { data: existingProfile } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("id, merchant_name")
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (existingProfile) {
    return { status: "duplicate" as const, merchantProfileId: existingProfile.id };
  }

  // Create source record
  const { data: source, error: sourceErr } = await (supabase as any)
    .from("merchant_onboarding_sources")
    .insert({
      source_type: input.sourceType,
      source_name: input.sourceName ?? input.sourceType,
      source_external_id: input.sourceExternalId,
      status: "imported",
      payload: input,
    })
    .select("id")
    .single();

  if (sourceErr) throw sourceErr;

  // Create merchant profile
  const { data: merchant, error: merchantErr } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .insert({
      merchant_name: input.merchantName,
      name_ar: safeText(input.merchantNameAr),
      phone: safeText(input.phone),
      email: safeText(input.email),
      city: input.city,
      area: safeText(input.area),
      cuisine_type: safeText(input.cuisineType),
      website: safeText(input.website),
      description: safeText(input.description),
      description_ar: safeText(input.descriptionAr),
      source_id: source.id,
      source_status: "imported",
      onboarding_status: "imported_not_claimed",
      activation_mode: "coming_soon",
      country: input.countryCode,
      dedupe_key: dedupeKey,
      vertical: input.vertical,
      tags: dedupeStrings(input.tags ?? []),
      rating: input.rating ?? null,
      review_count: input.reviewCount ?? null,
      latitude: input.lat ?? null,
      longitude: input.lng ?? null,
      cover_image_url: safeText(input.coverImageUrl),
      logo_image_url: safeText(input.logoImageUrl),
    } as any)
    .select("*")
    .single();

  if (merchantErr) throw merchantErr;

  const currency = resolveTransactionCurrency({
    explicitCurrency: null,
    merchantCurrency: null,
    storefrontCurrency: null,
    countryCode: input.countryCode,
  });

  // Generate unique slug
  const baseSlug = slugify(`${input.merchantName}-${input.city}`);
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const { data: exists } = await (supabase as any)
      .from("storefront_pages")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!exists) break;
    i += 1;
    slug = `${baseSlug}-${i}`;
  }

  // Create storefront page (use service-role style insert via `as any`)
  const { error: storefrontErr } = await (supabase as any)
    .from("storefront_pages")
    .insert({
      merchant_profile_id: merchant.id,
      name: input.merchantName,
      slug,
      city: input.city,
      country: input.countryCode,
      currency,
      default_currency: currency,
      latitude: input.lat ?? null,
      longitude: input.lng ?? null,
      active: false,
      shop_visibility: "coming_soon",
      vertical: input.vertical,
      subcategory: input.cuisineType ?? null,
      contact_phone: safeText(input.phone),
      contact_email: safeText(input.email),
      description: safeText(input.description) ?? `${input.merchantName} in ${input.city}`,
      tagline: input.vertical === "food"
        ? `Order ${input.cuisineType ?? "food"} in ${input.city}`
        : `${input.merchantName} in ${input.city}`,
      tags: dedupeStrings(input.tags ?? []),
      seo_title: `${input.merchantName} | ${input.city} | Easy-Locs`,
      seo_description: `Discover ${input.merchantName} in ${input.city} on Easy-Locs.`,
    } as any);

  if (storefrontErr) throw storefrontErr;

  // Import menu items
  if ((input.menuItems ?? []).length > 0) {
    const rows = (input.menuItems ?? []).map((item, index) => ({
      merchant_profile_id: merchant.id,
      name: item.name,
      name_ar: safeText(item.nameAr),
      description: safeText(item.description),
      description_ar: safeText(item.descriptionAr),
      category: safeText(item.category),
      image_url: safeText(item.photoUrl),
      price: item.price ?? null,
      currency: item.currency ?? currency,
      is_available: true,
      sort_order: index,
    }));

    const { error: menuErr } = await (supabase as any)
      .from("menu_items")
      .insert(rows);

    if (menuErr) throw menuErr;
  }

  return {
    status: "imported" as const,
    merchantProfileId: merchant.id,
    sourceId: source.id,
  };
}

export async function importMerchantBatch(records: ImportedMerchantRecord[]) {
  const summary = {
    total: records.length,
    imported: 0,
    duplicate: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const record of records) {
    try {
      const result = await importMerchantRecord(record);
      if (result.status === "imported") summary.imported += 1;
      else summary.duplicate += 1;
    } catch (e: any) {
      summary.failed += 1;
      summary.errors.push(
        `${record.merchantName} (${record.city}): ${e.message ?? "unknown"}`
      );
    }
  }

  return summary;
}
