/**
 * seo.repository — All DB ops for SEO pages (city, category, provider).
 */
import { supabase } from "@/integrations/supabase/client";

// ── Marketplace services (public RPC) ──
export async function fetchPublicMarketplaceServices(params: Record<string, any> = {}) {
  const { data } = await supabase.rpc("get_public_marketplace_services", params);
  return data ?? [];
}

export async function fetchPublicMarketplaceProviders(params: Record<string, any> = {}) {
  const { data } = await supabase.rpc("get_public_marketplace_providers", params);
  return data ?? [];
}

// ── Real estate listings (public RPC) ──
export async function fetchPublicRealEstateListings(params: Record<string, any> = {}) {
  const { data } = await supabase.rpc("get_public_real_estate_listings", params);
  return data ?? [];
}

// ── Public listings ──
export async function fetchPublicListings(limit = 20) {
  const { data } = await supabase.from("public_listings").select("*").eq("active", true).limit(limit);
  return data ?? [];
}

export async function fetchPublicListingsForCity(limit = 12) {
  const { data } = await supabase
    .from("public_listings")
    .select("id,title,slug,price_per_night,max_guests,min_nights,property_id")
    .eq("active", true)
    .limit(limit);
  return data ?? [];
}

// ── Concierge services by city/category ──
export async function fetchConciergeServicesByCityCategory(city: string, category: string) {
  const { data } = await supabase
    .from("concierge_services")
    .select("id,title,description,category,city,country,price,currency,photo_urls,booking_slug,active")
    .eq("active", true)
    .eq("city", city)
    .eq("category", category)
    .limit(10);
  return data ?? [];
}

// ── Properties for explore preview ──
export async function fetchPropertiesByIds(ids: string[]) {
  const { data } = await supabase
    .from("properties")
    .select("id, label, city, country, photos")
    .in("id", ids);
  return data ?? [];
}
