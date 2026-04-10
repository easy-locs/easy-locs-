import { db } from "./db";


export const merchantService = {
  async fetchMerchantById(merchantId: string) {
    const { data, error } = await db("seed_merchants")
      .select("*")
      .eq("id", merchantId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async updateMerchant(merchantId: string, patch: Record<string, unknown>, ownerId?: string) {
    let q = db("seed_merchants")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", merchantId);
    if (ownerId) q = q.eq("user_id", ownerId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchStorefrontBySlugOrId(slugOrId: string) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const col = isUuid ? "id" : "slug";
    const { data, error } = await db("storefront_pages")
      .select("id, name, slug, description, logo_url, banner_url, city, address, rating, reviews_count, vertical, currency, country, contact_phone, active, user_id")
      .eq(col, slugOrId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchCategories(shopId: string) {
    const { data, error } = await db("storefront_catalog_categories")
      .select("*")
      .eq("shop_id", shopId)
      .order("sort_order") as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async insertCategory(shopId: string, name: string, sortOrder: number) {
    const { error } = await db("storefront_catalog_categories")
      .insert({ shop_id: shopId, name, sort_order: sortOrder, active: true });
    if (error) throw error;
  },

  async renameCategory(categoryId: string, name: string) {
    const { error } = await db("storefront_catalog_categories")
      .update({ name })
      .eq("id", categoryId);
    if (error) throw error;
  },

  async deleteCategory(categoryId: string) {
    const { error } = await db("storefront_catalog_categories")
      .delete()
      .eq("id", categoryId);
    if (error) throw error;
  },

  async toggleCategory(categoryId: string, active: boolean) {
    const { error } = await db("storefront_catalog_categories")
      .update({ active: !active })
      .eq("id", categoryId);
    if (error) throw error;
  },

  async fetchMenuItems(merchantId: string, limit = 500) {
    const { data, error } = await db("menu_items")
      .select("*")
      .eq("merchant_id", merchantId)
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchShopMenuItems(shopId: string) {
    const { data, error } = await db("menu_items")
      .select("id, name, description, price, image_url, category, is_available")
      .eq("shop_id", shopId)
      .eq("is_available", true)
      .order("sort_order", { ascending: true }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async insertStorefrontOrder(payload: Record<string, unknown>) {
    const { data, error } = await db("storefront_orders")
      .insert(payload)
      .select("id, status")
      .single() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async updateMenuItem(itemId: string, patch: Record<string, unknown>, merchantId?: string) {
    let q = db("menu_items")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    if (merchantId) q = q.eq("merchant_id", merchantId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchProducts(merchantId: string, opts?: { orderBy?: string; limit?: number }) {
    let q = db("seed_products")
      .select("*")
      .eq("merchant_id", merchantId);
    if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: true });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateProduct(productId: string, patch: Record<string, unknown>, merchantId?: string) {
    let q = db("seed_products")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", productId);
    if (merchantId) q = q.eq("merchant_id", merchantId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchOrders(merchantId: string, opts?: { statuses?: string[]; orderBy?: string; limit?: number }) {
    let q = db("orders")
      .select("*")
      .eq("merchant_id", merchantId);
    if (opts?.statuses?.length) q = q.in("status", opts.statuses);
    if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: false });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchOrdersSelect(merchantId: string, columns: string, opts?: { limit?: number }) {
    let q = db("orders")
      .select(columns)
      .eq("merchant_id", merchantId);
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateOrder(orderId: string, patch: Record<string, unknown>, merchantId?: string) {
    let q = db("orders")
      .update(patch)
      .eq("id", orderId);
    if (merchantId) q = q.eq("merchant_id", merchantId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchReviews(merchantId: string, limit = 100) {
    const { data, error } = await db("reviews")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateReviewReply(reviewId: string, reply: string | null) {
    const { error } = await db("reviews")
      .update({ merchant_reply: reply, updated_at: new Date().toISOString() })
      .eq("id", reviewId);
    if (error) throw error;
  },

  async fetchPromos(merchantId: string) {
    const { data, error } = await db("seed_merchant_promos")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async insertPromo(merchantId: string, promo: Record<string, unknown>) {
    const { error } = await db("seed_merchant_promos")
      .insert({ merchant_id: merchantId, ...promo, is_active: true });
    if (error) throw error;
  },

  async togglePromo(promoId: string, isActive: boolean, merchantId?: string) {
    let q = db("seed_merchant_promos")
      .update({ is_active: !isActive, updated_at: new Date().toISOString() })
      .eq("id", promoId);
    if (merchantId) q = q.eq("merchant_id", merchantId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchMerchantSummary(merchantId: string) {
    const [merchantRes, ordersRes, productsRes, promosRes] = await Promise.all([
      db("seed_merchants").select("*").eq("id", merchantId).maybeSingle(),
      db("orders").select("id,total_amount,status").eq("merchant_id", merchantId).limit(1000),
      db("seed_products").select("id,is_available,stock_quantity").eq("merchant_id", merchantId).limit(2000),
      db("seed_merchant_promos").select("id,is_active").eq("merchant_id", merchantId).limit(500),
    ]);
    if (merchantRes.error) throw merchantRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (productsRes.error) throw productsRes.error;
    if (promosRes.error) throw promosRes.error;
    return {
      merchant: merchantRes.data,
      orders: (ordersRes.data ?? []) as any[],
      products: (productsRes.data ?? []) as any[],
      promos: (promosRes.data ?? []) as any[],
    };
  },

  async fetchMerchantAnalytics(merchantId: string) {
    const [ordersRes, reviewsRes, promosRes] = await Promise.all([
      db("orders").select("id,total_amount,status,created_at").eq("merchant_id", merchantId).limit(1000),
      db("reviews").select("*").eq("merchant_id", merchantId).limit(1000),
      db("seed_merchant_promos").select("*").eq("merchant_id", merchantId).limit(1000),
    ]);
    if (ordersRes.error) throw ordersRes.error;
    if (reviewsRes.error) throw reviewsRes.error;
    if (promosRes.error) throw promosRes.error;
    return { orders: ordersRes.data ?? [], reviews: reviewsRes.data ?? [], promos: promosRes.data ?? [] };
  },

  async fetchDailySalesOrders(merchantId: string, limit = 500) {
    const { data, error } = await db("orders")
      .select("id,total_amount,status,created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchCustomerOrders(merchantId: string, limit = 1000) {
    const { data, error } = await db("orders")
      .select("customer_user_id,total_amount,status,created_at")
      .eq("merchant_id", merchantId)
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchCustomerInsightOrders(merchantId: string, limit = 2000) {
    const { data, error } = await db("orders")
      .select("id,customer_user_id,total_amount,status,created_at")
      .eq("merchant_id", merchantId)
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchKitchenDisplayItems(merchantId: string) {
    const { data, error } = await db("menu_items")
      .select("*")
      .eq("merchant_id", merchantId) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchMerchantFinanceTransactions(userId: string) {
    const { data, error } = await db("unified_wallet_transactions")
      .select("*")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(500) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchOnboardingProfile(userId: string) {
    const { data, error } = await db("merchant_onboarding_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },
};
