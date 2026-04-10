/**
 * saved-search.repository — Canonical DB access for saved_searches table.
 * Replaces direct db("saved_searches") calls in savedSearchStore.ts.
 */
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import type { ListingSearchFilters } from "@/lib/types/search";

const db = supabase as any;

export type SavedSearchRow = {
  id: string;
  user_id: string;
  orbit_id: string;
  name: string;
  filters: ListingSearchFilters;
  created_at: string;
};

/**
 * Fetch all saved searches for a user, newest first.
 */
export async function fetchSavedSearches(userId: string): Promise<SavedSearchRow[]> {
  const { data, error } = await db
    .from("saved_searches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[saved-search.repository] fetchSavedSearches failed:", error);
    return [];
  }

  return (data ?? []) as SavedSearchRow[];
}

/**
 * Insert a new saved search.
 * Returns the persisted row on success, null on error.
 */
export async function createSavedSearch(payload: {
  id: string;
  userId: string;
  orbitId: string;
  name: string;
  filters: ListingSearchFilters;
}): Promise<SavedSearchRow | null> {
  const { data, error } = await db
    .from("saved_searches")
    .insert({
      id: payload.id,
      user_id: payload.userId,
      orbit_id: payload.orbitId,
      name: payload.name,
      filters: payload.filters,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[saved-search.repository] createSavedSearch failed:", error);
    return null;
  }

  return data as SavedSearchRow;
}

/**
 * Delete a saved search by ID.
 * Returns true on success, false on error.
 */
export async function deleteSavedSearch(id: string): Promise<boolean> {
  const { error } = await db
    .from("saved_searches")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[saved-search.repository] deleteSavedSearch failed:", error);
    return false;
  }

  return true;
}
