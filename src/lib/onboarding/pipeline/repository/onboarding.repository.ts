/**
 * onboarding.repository — Persistence layer for canonical shops.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CanonicalShop } from "../canonical-shop.schema";

export const onboardingRepository = {
  async save(shop: CanonicalShop) {
    const record = {
      id: shop.id,
      name: shop.name,
      city: shop.location.city,
      country: shop.location.country,
      latitude: shop.location.lat,
      longitude: shop.location.lng,
      category: shop.categories[0] || null,
      source: shop.source.provider,
      source_url: shop.source.url || null,
      logo_url: shop.media.logo || null,
      cover_url: shop.media.cover || null,
      menu_json: shop.products.length > 0 ? shop.products : null,
      quality_score: shop.quality.score,
    };
    return (supabase as any).from("auto_discovered_merchants").upsert(record, { onConflict: "id" });
  },
};
