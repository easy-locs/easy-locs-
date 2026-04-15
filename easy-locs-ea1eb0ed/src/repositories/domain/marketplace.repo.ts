import { domainDb, db } from "@/services/db";
import type { PropertyListingV2 } from "@/domains/shared/canonical-types";

export { fetchMyProvider, insertProvider, updateProvider, fetchPublicProviders } from "@/repositories/marketplace.repository";
export { fetchMyServices, fetchPublicServices, insertService, updateService, deleteService } from "@/repositories/marketplace.repository";
export { fetchProviderReviews, insertReview, checkExistingReview } from "@/repositories/marketplace.repository";
export { fetchMyBookings, insertBooking, fetchBookedDates } from "@/repositories/marketplace.repository";

interface ProviderRow {
  id: string;
  display_name: string | null;
  user_id: string | null;
  created_at: string;
  is_verified: boolean;
}

export const marketplaceRepo = {
  async listPublishedListings(limit = 100): Promise<PropertyListingV2[]> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as PropertyListingV2[];
  },

  async getListingById(id: string): Promise<PropertyListingV2 | null> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as PropertyListingV2 | null;
  },

  async createListing(listing: PropertyListingV2): Promise<PropertyListingV2> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .insert(listing as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return data as PropertyListingV2;
  },

  async updateListing(id: string, patch: Partial<PropertyListingV2>): Promise<PropertyListingV2> {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .update(patch as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as PropertyListingV2;
  },

  async fetchCategories() {
    const { data } = await domainDb.marketplace
      .from("categories")
      .select("*")
      .order("sort_order");
    return data ?? [];
  },

  async fetchFavorites(userId: string) {
    const { data } = await domainDb.marketplace
      .from("favorites")
      .select("*")
      .eq("user_id", userId);
    return data ?? [];
  },

  async listC2CListings(options: {
    category?: string;
    condition?: string;
    limit?: number;
  }) {
    let q = domainDb.marketplace
      .from("listings")
      .select(
        "id, title, description, price, currency, category, city, country, condition, photo_urls, created_at, listing_expires_at, provider_id, user_id, status, listing_type, brand, model, marketplace_providers(is_verified)"
      )
      .eq("active", true)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(options.limit ?? 60);

    if (options.category && options.category !== "all") {
      q = q.eq("category", options.category);
    } else {
      q = q.in("category", [
        "c2c_vehicles", "c2c_electronics", "c2c_fashion", "c2c_home",
        "c2c_sports", "c2c_misc", "automotive", "electronics", "fashion", "other",
      ]);
    }

    if (options.condition && options.condition !== "all") {
      q = q.eq("condition", options.condition);
    }

    const { data } = await q;
    return data || [];
  },

  async getC2CListingDetail(id: string) {
    const { data, error } = await domainDb.marketplace
      .from("listings")
      .select("*, marketplace_providers(id, display_name, user_id, is_verified, created_at)")
      .eq("id", id)
      .eq("active", true)
      .in("category", [
        "c2c_vehicles", "c2c_electronics", "c2c_fashion", "c2c_home",
        "c2c_sports", "c2c_misc", "automotive", "electronics", "fashion", "other",
      ])
      .maybeSingle();
    return { data, error };
  },

  async incrementViewCount(id: string, currentCount: number) {
    await domainDb.marketplace
      .from("listings")
      .update({ view_count: currentCount + 1 })
      .eq("id", id);
  },

  async updatePhotos(listingId: string, photoUrls: string[]) {
    await domainDb.marketplace
      .from("listings")
      .update({ photo_urls: photoUrls })
      .eq("id", listingId);
  },

  async getProvider(providerId: string): Promise<ProviderRow | null> {
    const { data } = await db
      .from("marketplace_providers")
      .select("id, display_name, user_id, created_at, is_verified")
      .eq("id", providerId)
      .maybeSingle();
    return data as ProviderRow | null;
  },

  async countActiveListings(providerId: string): Promise<number> {
    const { count, error } = await domainDb.marketplace
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", providerId)
      .eq("active", true);
    if (error) {
      console.warn("[marketplaceRepo] countActiveListings error:", error.message);
      return 0;
    }
    return count ?? 0;
  },

  async countSoldListings(providerId: string): Promise<number> {
    const { count, error } = await domainDb.marketplace
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", providerId)
      .eq("status", "sold");
    if (error) {
      console.warn("[marketplaceRepo] countSoldListings error:", error.message);
      return 0;
    }
    return count ?? 0;
  },

  async getReviewRatings(providerId: string) {
    const { data } = await domainDb.marketplace
      .from("reviews")
      .select("rating")
      .eq("provider_id", providerId);
    return data ?? [];
  },

  async getProfileName(userId: string): Promise<string | null> {
    const { data } = await domainDb.identity
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();
    return data?.name ?? null;
  },

  async saveSearchAlert(userId: string, orbitId: string, name: string, filters: Record<string, unknown>) {
    await db.from("saved_searches").insert({
      id: `ss_${Date.now()}`,
      user_id: userId,
      orbit_id: orbitId,
      name,
      filters,
    });
  },

  async getUserOrbitId(userId: string): Promise<string | null> {
    const { data } = await domainDb.identity
      .from("profiles")
      .select("id, orbit_id")
      .eq("id", userId)
      .maybeSingle();
    return (data as { id: string; orbit_id?: string } | null)?.orbit_id ?? data?.id ?? null;
  },

  async uploadPhoto(orgId: string, listingId: string, file: File): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${orgId}/listings/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadErr } = await db.storage.from("property-photos").upload(path, file);
    if (uploadErr) return null;
    const { data: urlData } = db.storage.from("property-photos").getPublicUrl(path);
    return urlData.publicUrl;
  },
};
