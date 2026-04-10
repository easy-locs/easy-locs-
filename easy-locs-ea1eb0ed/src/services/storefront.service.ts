import { db } from "./db";


export const storefrontService = {
  async fetchPageById(id: string, select = "*") {
    const { data, error } = await db("storefront_pages")
      .select(select)
      .eq("id", id)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchPageBySlug(slug: string, select = "*") {
    const { data, error } = await db("storefront_pages")
      .select(select)
      .eq("slug", slug)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchPageBySlugOrId(slugOrId: string, select = "*") {
    const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const col = isUuid ? "id" : "slug";
    const { data, error } = await db("storefront_pages")
      .select(select)
      .eq(col, slugOrId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchPagesByUser(userId: string, select = "id, name, slug, logo_url, description, published, vertical, city, created_at") {
    const { data, error } = await db("storefront_pages")
      .select(select)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchActiveShopByUser(userId: string) {
    const { data, error } = await db("storefront_pages")
      .select("id, name")
      .eq("user_id", userId)
      .eq("active", true)
      .limit(1)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchUserIdBySlug(slug: string) {
    const { data, error } = await db("storefront_pages")
      .select("user_id, name")
      .eq("slug", slug)
      .neq("route_status", "broken")
      .maybeSingle() as { data: { user_id: string; name: string } | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchFeaturedFood(queryModifier?: (q: any) => any, limit = 8) {
    let q = db("storefront_pages")
      .select("id, name, slug, banner_url, logo_url, subcategory, city, rating, region")
      .eq("vertical", "food")
      .order("display_priority", { ascending: false })
      .limit(limit);
    if (queryModifier) q = queryModifier(q);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchNearbyFood(queryModifier?: (q: any) => any, limit = 10) {
    let q = db("storefront_pages")
      .select("id, name, slug, banner_url, logo_url, subcategory, city, rating, region")
      .eq("vertical", "food")
      .order("ranking_score", { ascending: false })
      .limit(limit);
    if (queryModifier) q = queryModifier(q);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchByCity(cityName: string, queryModifier?: (q: any) => any, limit = 100) {
    let q = db("storefront_pages")
      .select("id, name, slug, city, vertical, category, display_priority")
      .ilike("city", cityName)
      .order("display_priority", { ascending: false, nullsFirst: false })
      .order("ranking_score", { ascending: false })
      .limit(limit);
    if (queryModifier) q = queryModifier(q);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchFavoritePages(ids: string[], queryModifier?: (q: any) => any) {
    if (ids.length === 0) return [];
    let q = db("storefront_pages")
      .select("id, name, slug, vertical, category, subcategory, city, address, region, rating, reviews_count, banner_url, logo_url, display_priority")
      .in("id", ids);
    if (queryModifier) q = queryModifier(q);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchCuisineRestaurants(queryModifier?: (q: any) => any, limit = 30) {
    let q = db("storefront_pages")
      .select("id, name, slug, city, vertical, subcategory, description, latitude, longitude, rating, display_priority")
      .order("display_priority", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (queryModifier) q = queryModifier(q);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchRestaurantDetail(slugOrId: string) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const col = isUuid ? "id" : "slug";
    const { data, error } = await db("storefront_pages")
      .select("id, name, slug, vertical, category, subcategory, city, address, region, rating, reviews_count, banner_url, logo_url, latitude, longitude, contact_phone, contact_email, contact_whatsapp, website_url, opening_hours")
      .eq(col, slugOrId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchCatalogItems(shopId: string) {
    const { data, error } = await db("catalog_items")
      .select("*, storefront_catalog_categories(name)")
      .eq("shop_id", shopId)
      .eq("available", true)
      .order("sort_order") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchCatalogItemById(itemId: string) {
    const { data, error } = await db("catalog_items")
      .select("*, storefront_pages!catalog_items_shop_id_fkey(id, slug, name, logo_url, currency)")
      .eq("id", itemId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchCatalogCategories(shopId: string) {
    const { data, error } = await db("storefront_catalog_categories")
      .select("*")
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("sort_order") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchStorefrontOrder(orderId: string, select = "id, status, payment_status, created_at, notes, total, currency, shop_id, fulfillment_type, updated_at, storefront_order_items(*), storefront_pages!storefront_orders_shop_id_fkey(name, slug, logo_url)") {
    const { data, error } = await db("storefront_orders")
      .select(select)
      .eq("id", orderId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchStorefrontOrdersByShopAndBuyer(shopId: string, buyerId: string, statuses?: string[], limit = 5) {
    let q = db("storefront_orders")
      .select("id, status, total, currency, created_at, table_code")
      .eq("shop_id", shopId)
      .eq("buyer_id", buyerId);
    if (statuses?.length) q = q.in("status", statuses);
    q = q.order("created_at", { ascending: false }).limit(limit);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchPageOwnerUserId(pageId: string) {
    const { data, error } = await db("storefront_pages")
      .select("user_id")
      .eq("id", pageId)
      .maybeSingle() as { data: { user_id: string } | null; error: unknown };
    if (error) throw error;
    return data?.user_id ?? null;
  },

  async fetchMenuItemsByShop(shopId: string) {
    const { data, error } = await db("menu_items")
      .select("*")
      .eq("shop_id", shopId)
      .eq("available", true)
      .order("sort_order", { ascending: true }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async insertPage(payload: Record<string, unknown>) {
    const { data, error } = await db("storefront_pages")
      .insert(payload)
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async insertProducts(rows: Record<string, unknown>[]) {
    const { error } = await db("products").insert(rows);
    if (error) throw error;
  },

  async bulkUpdateVisibility(mode: string) {
    const { error } = await db("storefront_pages")
      .update({ visibility_mode: mode })
      .eq("visibility_mode", "coming_soon");
    if (error) throw error;
  },
};
