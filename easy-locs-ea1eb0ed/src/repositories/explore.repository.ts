/**
 * explore.repository — Public explore/landing page data fetching.
 */
import { db } from "@/services/db";
import { assertNoMockData, assertNoMockTitle } from "@/lib/guards/mock-data-guard";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
function guardListings(rows: Array<{ id?: string; title?: string }>): void {
  for (const row of rows) {
    if (row.id) assertNoMockData(row.id, "explore-listing-id");
    if (row.title) assertNoMockTitle(row.title, "explore-listing-title");
  }
}

export async function getPublicRealEstateListings(limit = 6) {
  const { data } = await cRpc("get_public_real_estate_listings", { p_limit: limit });
  const rows = data || [];
  guardListings(rows);
  return rows;
}

export async function getPublicSeasonalListings(limit = 6) {
  const { data } = await cFrom("public_listings").select("*").eq("active", true).order("created_at", { ascending: false }).limit(limit);
  const rows = data || [];
  guardListings(rows);
  return rows;
}

export async function getPublicMarketplaceServices(params?: { _category?: string | null; _country?: string | null }) {
  const { data } = await cRpc("get_public_marketplace_services", params || {});
  const rows = data || [];
  guardListings(rows);
  return rows;
}

export async function getPublicRealEstateListingsFiltered(params: Record<string, any>) {
  const { data, error } = await cRpc("get_public_real_estate_listings", params);
  return { data: data || [], error };
}

export async function getListingProperties(propertyIds: string[]) {
  const { data } = await cRpc("get_public_listing_properties", { p_property_ids: propertyIds });
  return data || [];
}

export async function getListingProperty(listingId: string) {
  const { data } = await cRpc("get_listing_property", { p_listing_id: listingId });
  return data;
}

export async function getRealEstateShowcase(slug: string) {
  const { data } = await cRpc("get_real_estate_showcase", { p_slug: slug });
  return data || [];
}

export async function insertRealEstateLead(payload: Record<string, any>) {
  const { data } = await cFrom("real_estate_leads").insert(payload).select("id").single();
  return data;
}

export async function fetchPublicListingBySlug(slug: string) {
  const { data } = await cFrom("public_listings").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  return data;
}
