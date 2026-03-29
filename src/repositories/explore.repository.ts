/**
 * explore.repository — Public explore/landing page data fetching.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getPublicRealEstateListings(limit = 6) {
  const { data } = await supabase.rpc("get_public_real_estate_listings", { p_limit: limit });
  return data || [];
}

export async function getPublicSeasonalListings(limit = 6) {
  const { data } = await supabase.from("public_listings").select("*").eq("active", true).order("created_at", { ascending: false }).limit(limit);
  return data || [];
}

export async function getPublicMarketplaceServices(params?: { _category?: string | null; _country?: string | null }) {
  const { data } = await supabase.rpc("get_public_marketplace_services", params || {});
  return data || [];
}

export async function getPublicRealEstateListingsFiltered(params: Record<string, any>) {
  const { data, error } = await supabase.rpc("get_public_real_estate_listings", params);
  return { data: data || [], error };
}

export async function getListingProperties(propertyIds: string[]) {
  const { data } = await supabase.rpc("get_public_listing_properties", { p_property_ids: propertyIds });
  return data || [];
}

export async function getListingProperty(listingId: string) {
  const { data } = await supabase.rpc("get_listing_property", { p_listing_id: listingId });
  return data;
}

export async function getRealEstateShowcase(slug: string) {
  const { data } = await supabase.rpc("get_real_estate_showcase", { p_slug: slug });
  return data || [];
}

export async function insertRealEstateLead(payload: Record<string, any>) {
  const { data } = await (supabase as any).from("real_estate_leads").insert(payload).select("id").single();
  return data;
}
