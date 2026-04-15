import { db } from "./db";
import type {
  MerchantRecord,
  StorefrontPage,
  CatalogCategory,
  MenuItem,
  OrderRecord,
  OrderSummaryRow,
  ReviewRecord,
  PromoRecord,
  ProductRecord,
  MerchantSummary,
  MerchantAnalytics,
  OnboardingProfile,
} from "./merchant.types";


export const merchantService = {
  async fetchMerchantById(merchantId: string): Promise<MerchantRecord | null> {
    const { data, error } = await db("seed_merchants")
      .select("id, name, slug, description, logo_url, banner_url, city, country, vertical, currency, user_id, active, created_at, updated_at")
      .eq("id", merchantId)
      .maybeSingle() as { data: MerchantRecord | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async updateMerchant(merchantId: string, patch: Partial<MerchantRecord>, ownerId?: string) {
    let q = db("seed_merchants")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", merchantId);
    if (ownerId) q = q.eq("user_id", ownerId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchStorefrontBySlugOrId(slugOrId: string): Promise<StorefrontPage | null> {
    const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const col = isUuid ? "id" : "slug";
    const { data, error } = await db("storefront_pages")
      .select("id, name, slug, description, logo_url, banner_url, city, address, rating, reviews_count, vertical, currency, country, contact_phone, active, user_id")
      .eq(col, slugOrId)
      .maybeSingle() as { data: StorefrontPage | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchCategories(shopId: string): Promise<CatalogCategory[]> {
    const { data, error } = await db("storefront_catalog_categories")
      .select("id, shop_id, name, sort_order, active")
      .eq("shop_id", shopId)
      .order("sort_order") as { data: CatalogCategory[] | null; error: unknown };
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

  async fetchMenuItems(merchantId: string, limit = 500): Promise<MenuItem[]> {
    const { data, error } = await db("menu_items")
      .select("id, name, description, price, image_url, category, is_available, sort_order, merchant_id, shop_id")
      .eq("merchant_id", merchantId)
      .limit(limit) as { data: MenuItem[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchShopMenuItems(shopId: string): Promise<MenuItem[]> {
    const { data, error } = await db("menu_items")
      .select("id, name, description, price, image_url, category, is_available")
      .eq("shop_id", shopId)
      .eq("is_available", true)
      .order("sort_order", { ascending: true }) as { data: MenuItem[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async insertStorefrontOrder(payload: Record<string, unknown>): Promise<OrderSummaryRow | null> {
    const { data, error } = await db("storefront_orders")
      .insert(payload)
      .select("id, status")
      .single() as { data: OrderSummaryRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async updateMenuItem(itemId: string, patch: Partial<MenuItem>, merchantId?: string) {
    let q = db("menu_items")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", itemId);
    if (merchantId) q = q.eq("merchant_id", merchantId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchProducts(merchantId: string, opts?: { orderBy?: string; limit?: number; offset?: number }): Promise<ProductRecord[]> {
    let q = db("seed_products")
      .select("id, name, description, price, image_url, category, is_available, stock_quantity, merchant_id, created_at")
      .eq("merchant_id", merchantId);
    if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: true });
    const limit = opts?.limit ?? 50;
    q = q.limit(limit);
    if (opts?.offset) q = q.range(opts.offset, opts.offset + limit - 1);
    const { data, error } = await q as { data: ProductRecord[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateProduct(productId: string, patch: Partial<ProductRecord>, merchantId?: string) {
    let q = db("seed_products")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", productId);
    if (merchantId) q = q.eq("merchant_id", merchantId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchOrders(merchantId: string, opts?: { statuses?: string[]; orderBy?: string; limit?: number; offset?: number }): Promise<OrderRecord[]> {
    let q = db("orders")
      .select("id, total_amount, status, created_at, merchant_id, customer_user_id, currency")
      .eq("merchant_id", merchantId);
    if (opts?.statuses?.length) q = q.in("status", opts.statuses);
    if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: false });
    const limit = opts?.limit ?? 50;
    q = q.limit(limit);
    if (opts?.offset) q = q.range(opts.offset, opts.offset + limit - 1);
    const { data, error } = await q as { data: OrderRecord[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchOrdersSelect(merchantId: string, columns: string, opts?: { limit?: number }): Promise<OrderRecord[]> {
    let q = db("orders")
      .select(columns)
      .eq("merchant_id", merchantId);
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q as { data: OrderRecord[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateOrder(orderId: string, patch: Partial<OrderRecord>, merchantId?: string) {
    let q = db("orders")
      .update(patch)
      .eq("id", orderId);
    if (merchantId) q = q.eq("merchant_id", merchantId);
    const { error } = await q;
    if (error) throw error;
  },

  async fetchReviews(merchantId: string, limit = 100): Promise<ReviewRecord[]> {
    const { data, error } = await db("reviews")
      .select("id, merchant_id, rating, comment, merchant_reply, customer_name, created_at, updated_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: ReviewRecord[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async updateReviewReply(reviewId: string, reply: string | null) {
    const { error } = await db("reviews")
      .update({ merchant_reply: reply, updated_at: new Date().toISOString() })
      .eq("id", reviewId);
    if (error) throw error;
  },

  async fetchPromos(merchantId: string): Promise<PromoRecord[]> {
    const { data, error } = await db("seed_merchant_promos")
      .select("id, merchant_id, title, description, discount_type, discount_value, is_active, created_at, updated_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false }) as { data: PromoRecord[] | null; error: unknown };
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

  async fetchMerchantSummary(merchantId: string, opts?: { ordersLimit?: number; productsLimit?: number }): Promise<MerchantSummary> {
    const ordersLimit = opts?.ordersLimit ?? 200;
    const productsLimit = opts?.productsLimit ?? 200;
    const [merchantRes, ordersRes, productsRes, promosRes] = await Promise.all([
      db("seed_merchants").select("id, name, slug, logo_url, city, country, vertical, currency, active").eq("id", merchantId).maybeSingle(),
      db("orders").select("id, total_amount, status").eq("merchant_id", merchantId).limit(ordersLimit),
      db("seed_products").select("id, is_available, stock_quantity").eq("merchant_id", merchantId).limit(productsLimit),
      db("seed_merchant_promos").select("id, is_active").eq("merchant_id", merchantId).limit(100),
    ]);
    if (merchantRes.error) throw merchantRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (productsRes.error) throw productsRes.error;
    if (promosRes.error) throw promosRes.error;
    return {
      merchant: merchantRes.data as MerchantRecord | null,
      orders: (ordersRes.data ?? []) as OrderSummaryRow[],
      products: (productsRes.data ?? []) as ProductRecord[],
      promos: (promosRes.data ?? []) as PromoRecord[],
    };
  },

  async fetchMerchantAnalytics(merchantId: string): Promise<MerchantAnalytics> {
    const [ordersRes, reviewsRes, promosRes] = await Promise.all([
      db("orders").select("id, total_amount, status, created_at").eq("merchant_id", merchantId).order("created_at", { ascending: false }).limit(500),
      db("reviews").select("id, rating, comment, created_at").eq("merchant_id", merchantId).order("created_at", { ascending: false }).limit(200),
      db("seed_merchant_promos").select("id, title, is_active, discount_type, discount_value, created_at").eq("merchant_id", merchantId).limit(100),
    ]);
    if (ordersRes.error) throw ordersRes.error;
    if (reviewsRes.error) throw reviewsRes.error;
    if (promosRes.error) throw promosRes.error;
    return {
      orders: (ordersRes.data ?? []) as OrderRecord[],
      reviews: (reviewsRes.data ?? []) as ReviewRecord[],
      promos: (promosRes.data ?? []) as PromoRecord[],
    };
  },

  async fetchDailySalesOrders(merchantId: string, limit = 500): Promise<OrderRecord[]> {
    const { data, error } = await db("orders")
      .select("id, total_amount, status, created_at")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: OrderRecord[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchCustomerOrders(merchantId: string, limit = 1000): Promise<OrderRecord[]> {
    const { data, error } = await db("orders")
      .select("customer_user_id, total_amount, status, created_at")
      .eq("merchant_id", merchantId)
      .limit(limit) as { data: OrderRecord[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchCustomerInsightOrders(merchantId: string, limit = 2000): Promise<OrderRecord[]> {
    const { data, error } = await db("orders")
      .select("id, customer_user_id, total_amount, status, created_at")
      .eq("merchant_id", merchantId)
      .limit(limit) as { data: OrderRecord[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchKitchenDisplayItems(merchantId: string): Promise<MenuItem[]> {
    const { data, error } = await db("menu_items")
      .select("id, name, description, price, image_url, category, is_available, sort_order, merchant_id")
      .eq("merchant_id", merchantId) as { data: MenuItem[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchMerchantFinanceTransactions(userId: string) {
    const { data, error } = await db("unified_wallet_transactions")
      .select("id, type, amount, currency, status, sender_id, recipient_id, description, created_at")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(200) as { data: Record<string, unknown>[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchOnboardingProfile(userId: string): Promise<OnboardingProfile | null> {
    const { data, error } = await db("merchant_onboarding_profiles")
      .select("id, user_id, business_name, vertical, city, country, status, step, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle() as { data: OnboardingProfile | null; error: unknown };
    if (error) throw error;
    return data;
  },
};
