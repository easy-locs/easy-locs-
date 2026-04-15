import { db } from "@/services/db";
import { C2C_CATEGORY_TREE } from "@/lib/c2c/c2c-category-tree";

export interface C2CListingRow {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  subcategory: string | null;
  custom_attributes: Record<string, string | number | boolean | null>;
  price_type: string;
  delivery_option: string;
  condition: string;
  city: string;
  quartier: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  slug: string | null;
  photo_urls: string[];
  status: string;
  active: boolean;
  user_id: string;
  provider_id: string;
  view_count: number;
  favorite_count: number;
  created_at: string;
  listing_expires_at: string | null;
  brand?: string;
  model?: string;
}

export interface C2COfferRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  message: string | null;
  status: string;
  counter_amount: number | null;
  counter_message: string | null;
  expires_at: string | null;
  deal_id: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

const C2C_CATEGORIES = [
  ...C2C_CATEGORY_TREE.map(c => c.key),
  "c2c_vehicles", "c2c_electronics", "c2c_fashion", "c2c_home",
  "c2c_sports", "c2c_misc", "automotive", "electronics", "fashion", "other",
  "classified_c2c",
];

export const c2cRepo = {
  async listWithCursor(opts: {
    category?: string;
    subcategory?: string;
    condition?: string;
    priceMin?: number;
    priceMax?: number;
    query?: string;
    cursorCreatedAt?: string;
    cursorId?: string;
    limit?: number;
    sortBy?: string;
    userLat?: number;
    userLng?: number;
    radiusKm?: number;
  }) {
    const limit = opts.limit ?? 30;
    let q = db
      .from("marketplace_services")
      .select("id, title, description, price, currency, category, subcategory, custom_attributes, price_type, delivery_option, condition, city, quartier, country, lat, lng, slug, photo_urls, status, active, user_id, provider_id, view_count, favorite_count, created_at, listing_expires_at, brand, model")
      .eq("active", true)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (opts.category && opts.category !== "all") {
      q = q.eq("category", opts.category);
    } else {
      q = q.in("category", C2C_CATEGORIES);
    }

    if (opts.subcategory) q = q.eq("subcategory", opts.subcategory);
    if (opts.condition && opts.condition !== "all") q = q.eq("condition", opts.condition);
    if (opts.priceMin != null) q = q.gte("price", opts.priceMin);
    if (opts.priceMax != null) q = q.lte("price", opts.priceMax);

    if (opts.userLat != null && opts.userLng != null && opts.radiusKm) {
      const latDelta = opts.radiusKm / 111.0;
      const lngDelta = opts.radiusKm / (111.0 * Math.cos((opts.userLat * Math.PI) / 180));
      q = q
        .gte("lat", opts.userLat - latDelta)
        .lte("lat", opts.userLat + latDelta)
        .gte("lng", opts.userLng - lngDelta)
        .lte("lng", opts.userLng + lngDelta);
    }

    if (opts.query) {
      q = q.or(`title.ilike.%${opts.query}%,description.ilike.%${opts.query}%`);
    }

    if (opts.cursorCreatedAt && opts.cursorId) {
      q = q.or(`created_at.lt.${opts.cursorCreatedAt},and(created_at.eq.${opts.cursorCreatedAt},id.lt.${opts.cursorId})`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as C2CListingRow[];
  },

  async fullTextSearch(query: string, opts?: { category?: string; limit?: number }) {
    const tsQuery = query.split(/\s+/).filter(Boolean).join(" & ");
    let q = db
      .from("marketplace_services")
      .select("id, title, description, price, currency, category, subcategory, condition, city, quartier, lat, lng, slug, photo_urls, status, user_id, view_count, favorite_count, created_at, listing_expires_at, brand, model, custom_attributes, price_type, delivery_option, country, active, provider_id")
      .eq("active", true)
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, { type: "plain", config: "french" })
      .limit(opts?.limit ?? 50);

    if (opts?.category && opts.category !== "all") {
      q = q.eq("category", opts.category);
    }

    const { data, error } = await q;
    if (error) {
      const fallback = await this.listWithCursor({ query, category: opts?.category, limit: opts?.limit });
      return fallback;
    }
    return (data ?? []) as C2CListingRow[];
  },

  async getDetail(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const column = isUuid ? "id" : "slug";
    const { data, error } = await db
      .from("marketplace_services")
      .select("*, marketplace_providers(id, display_name, user_id, is_verified, created_at, trust_level)")
      .eq(column, idOrSlug)
      .maybeSingle();
    return { data, error };
  },

  async create(listing: Partial<C2CListingRow>) {
    const { data, error } = await db
      .from("marketplace_services")
      .insert(listing as Record<string, unknown>)
      .select()
      .single();
    if (error) throw error;
    return data as C2CListingRow;
  },

  async update(id: string, patch: Partial<C2CListingRow>) {
    const { data, error } = await db
      .from("marketplace_services")
      .update(patch as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as C2CListingRow;
  },

  async markSold(id: string) {
    const { error } = await db
      .from("marketplace_services")
      .update({ status: "sold", active: false })
      .eq("id", id);
    if (error) throw error;

    await db
      .from("c2c_offers")
      .update({ status: "declined" })
      .eq("listing_id", id)
      .eq("status", "pending");
  },

  async getSimilarListings(listing: { subcategory?: string; category: string; price: number; id: string }, limit = 6) {
    let q = db
      .from("marketplace_services")
      .select("id, title, price, currency, photo_urls, city, condition, created_at, lat, lng, slug")
      .eq("active", true)
      .eq("status", "published")
      .neq("id", listing.id)
      .gte("price", listing.price * 0.5)
      .lte("price", listing.price * 1.5)
      .limit(limit);

    if (listing.subcategory) {
      q = q.eq("subcategory", listing.subcategory);
    } else {
      q = q.eq("category", listing.category);
    }

    const { data } = await q;
    return data ?? [];
  },

  async getPriceStats(subcategory: string, priceRange?: { min: number; max: number }) {
    let q = db
      .from("marketplace_services")
      .select("price")
      .eq("active", true)
      .eq("status", "published")
      .eq("subcategory", subcategory);

    if (priceRange) {
      q = q.gte("price", priceRange.min).lte("price", priceRange.max);
    }

    const { data } = await q;
    if (!data || data.length === 0) return null;

    const prices = data.map((d: { price: number }) => d.price).sort((a: number, b: number) => a - b);
    return {
      count: prices.length,
      avg: prices.reduce((s: number, p: number) => s + p, 0) / prices.length,
      median: prices[Math.floor(prices.length / 2)],
      min: prices[0],
      max: prices[prices.length - 1],
    };
  },

  async getSellerStats(userId: string) {
    const [activeRes, soldRes, reviewsRes] = await Promise.all([
      db.from("marketplace_services").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("active", true).eq("status", "published"),
      db.from("marketplace_services").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "sold"),
      db.from("c2c_reviews").select("rating, comment, created_at, reviewer_id").eq("seller_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);

    const reviews = (reviewsRes.data ?? []) as Array<{ rating: number; comment: string | null; created_at: string; reviewer_id: string }>;
    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    return {
      activeListings: activeRes.count ?? 0,
      soldListings: soldRes.count ?? 0,
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
      reviews,
    };
  },

  async createOffer(offer: {
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    currency: string;
    message?: string;
    expires_at?: string;
  }) {
    const { data, error } = await db
      .from("c2c_offers")
      .insert(offer)
      .select()
      .single();
    if (error) throw error;
    return data as C2COfferRow;
  },

  async updateOffer(offerId: string, patch: Partial<C2COfferRow>) {
    const { data, error } = await db
      .from("c2c_offers")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", offerId)
      .select()
      .single();
    if (error) throw error;
    return data as C2COfferRow;
  },

  async getOffer(offerId: string) {
    const { data, error } = await db
      .from("c2c_offers")
      .select("*")
      .eq("id", offerId)
      .maybeSingle();
    if (error) throw error;
    return data as C2COfferRow | null;
  },

  async getOffersForListing(listingId: string) {
    const { data } = await db
      .from("c2c_offers")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });
    return (data ?? []) as C2COfferRow[];
  },

  async getOffersForSeller(sellerId: string) {
    const { data } = await db
      .from("c2c_offers")
      .select("*, marketplace_services(id, title, photo_urls, price, currency)")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  },

  async getOffersForBuyer(buyerId: string) {
    const { data } = await db
      .from("c2c_offers")
      .select("*, marketplace_services(id, title, photo_urls, price, currency)")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  },

  async createReport(report: {
    listing_id: string;
    reporter_id: string;
    reason: string;
    details?: string;
  }) {
    const { error } = await db.from("c2c_reports").insert(report);
    if (error) throw error;
  },

  async createReview(review: {
    listing_id: string;
    reviewer_id: string;
    seller_id: string;
    offer_id?: string;
    rating: number;
    comment?: string;
  }) {
    const { error } = await db.from("c2c_reviews").insert(review);
    if (error) throw error;
  },

  async getMyListings(userId: string, status?: string) {
    let q = db
      .from("marketplace_services")
      .select("id, title, description, price, currency, category, subcategory, condition, city, photo_urls, status, active, view_count, favorite_count, created_at, listing_expires_at, slug, price_type, delivery_option")
      .eq("user_id", userId)
      .in("category", C2C_CATEGORIES)
      .order("created_at", { ascending: false })
      .limit(100);

    if (status === "active") q = q.eq("active", true).eq("status", "published");
    else if (status === "draft") q = q.eq("status", "draft");
    else if (status === "sold") q = q.eq("status", "sold");
    else if (status === "expired") q = q.eq("status", "archived").eq("active", false);
    else if (status === "archived") q = q.eq("active", false);

    const { data } = await q;
    return data ?? [];
  },

  async getSellerReviews(sellerId: string) {
    const { data } = await db
      .from("c2c_reviews")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  },

  async incrementViewCount(id: string, current: number) {
    await db.from("marketplace_services").update({ view_count: current + 1 }).eq("id", id);
  },
};
