/**
 * discovery.repository — DB ops for saved listings and category subscriptions.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Saved Listings ──
export async function fetchSavedListings(userId: string) {
  const { data } = await (supabase as any)
    .from("saved_listings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function insertSavedListing(record: Record<string, any>) {
  await (supabase as any).from("saved_listings").insert(record);
}

export async function removeSavedListing(userId: string, listingType: string, listingId: string) {
  await (supabase as any)
    .from("saved_listings")
    .delete()
    .eq("user_id", userId)
    .eq("listing_type", listingType)
    .eq("listing_id", listingId);
}

// ── Category Subscriptions ──
export async function fetchCategorySubscriptions(userId: string) {
  const { data } = await (supabase as any)
    .from("category_subscriptions")
    .select("*")
    .eq("user_id", userId);
  return data ?? [];
}

export async function insertCategorySubscription(record: Record<string, any>) {
  await (supabase as any).from("category_subscriptions").insert(record);
}

export async function removeCategorySubscription(userId: string, category: string) {
  await (supabase as any)
    .from("category_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("category", category);
}
