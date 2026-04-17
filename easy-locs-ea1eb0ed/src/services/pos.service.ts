import { db } from "./db";


import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export const posService = {
  async fetchSellerShop(userId: string) {
    const { data, error } = await cFrom("storefront_pages")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle() as { data: { id: string } | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchCatalogItems(shopId: string, limit = 50) {
    const { data, error } = await cFrom("catalog_items")
      .select("id, title, price, currency, photo_url, stock_quantity, available")
      .eq("shop_id", shopId)
      .eq("available", true)
      .order("sort_order", { ascending: true })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchOrgMembership(userId: string) {
    const { data, error } = await cFrom("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle() as { data: { org_id: string } | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async createStorefrontOrder(order: Record<string, unknown>) {
    const { data, error } = await cFrom("storefront_orders")
      .insert(order)
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };
    if (error) throw error;
    return data!;
  },

  async insertStorefrontOrderItems(items: Record<string, unknown>[]) {
    const { error } = await cFrom("storefront_order_items").insert(items);
    if (error) throw error;
  },

  async updateStorefrontOrderStatus(orderId: string, updates: Record<string, unknown>) {
    const { error } = await cFrom("storefront_orders")
      .update(updates)
      .eq("id", orderId);
    if (error) throw error;
  },

  async fetchMenuItems(merchantProfileId: string) {
    const { data, error } = await cFrom("menu_items")
      .select("*")
      .eq("merchant_profile_id", merchantProfileId)
      .order("sort_order", { ascending: true }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchRecentOrders(merchantProfileId: string, limit = 10) {
    const { data, error } = await cFrom("orders")
      .select("id, status, payment_status, wallet_status, total_amount, currency, created_at")
      .eq("merchant_profile_id", merchantProfileId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async createOrder(order: Record<string, unknown>) {
    const { data, error } = await cFrom("orders")
      .insert(order)
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };
    if (error) throw error;
    return data!;
  },

  async createPosOrder(posOrder: Record<string, unknown>) {
    const { error } = await cFrom("pos_orders").insert(posOrder);
    if (error) throw error;
  },

  async insertOrderItems(items: Record<string, unknown>[]) {
    const { error } = await cFrom("order_items").insert(items);
    if (error) throw error;
  },
};
