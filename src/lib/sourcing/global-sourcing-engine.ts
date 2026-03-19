/**
 * Global Merchant Sourcing Engine
 * Finds and imports merchants from various sources worldwide.
 */
import { supabase } from "@/integrations/supabase/client";

export interface SourcedMerchant {
  name: string;
  category: string;
  cuisine?: string;
  address?: string;
  city: string;
  country: string;
  countryCode: string;
  phone?: string;
  rating?: number;
  lat?: number;
  lng?: number;
  priceRange?: string;
  sourceOrigin: string;
  dataQualityScore: number;
}

/**
 * Import sourced merchants into the database.
 * Deduplicates by name + city.
 */
export async function importSourcedMerchants(merchants: SourcedMerchant[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const m of merchants) {
    // Dedup check
    const { data: existing } = await (supabase as any)
      .from("merchant_onboarding_profiles")
      .select("id")
      .ilike("business_name", m.name)
      .eq("city", m.city)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    await (supabase as any).from("merchant_onboarding_profiles").insert({
      business_name: m.name,
      business_type: m.category,
      city: m.city,
      country_code: m.countryCode,
      status: "imported_not_claimed",
      source_origin: m.sourceOrigin,
      data_quality_score: m.dataQualityScore,
      latitude: m.lat,
      longitude: m.lng,
      business_phone: m.phone,
      metadata_json: {
        cuisine: m.cuisine,
        rating: m.rating,
        priceRange: m.priceRange,
        address: m.address,
      },
    } as any);

    imported++;
  }

  return { imported, skipped };
}

/**
 * Generate merchants from CSV data.
 */
export function parseMerchantCSV(rows: Record<string, string>[]): SourcedMerchant[] {
  return rows.map((r) => ({
    name: r.name ?? r.business_name ?? "Unknown",
    category: r.category ?? r.type ?? "restaurant",
    cuisine: r.cuisine,
    address: r.address,
    city: r.city ?? "Dubai",
    country: r.country ?? "UAE",
    countryCode: r.country_code ?? "AE",
    phone: r.phone,
    rating: r.rating ? parseFloat(r.rating) : undefined,
    lat: r.lat ? parseFloat(r.lat) : undefined,
    lng: r.lng ? parseFloat(r.lng) : undefined,
    priceRange: r.price_range,
    sourceOrigin: "csv_import",
    dataQualityScore: r.name && r.city ? 70 : 40,
  }));
}
