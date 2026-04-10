import { db } from "./db";


export interface OrderRow {
  id: string;
  user_id: string;
  shop_id: string | null;
  status: string;
  total: number;
  currency: string;
  items: unknown[];
  created_at: string;
  updated_at: string | null;
}

export const orderService = {
  async fetchByUser(userId: string, limit = 50) {
    const { data, error } = await db("orders")
      .select("id, status, order_type, total_amount, currency, created_at, notes, merchant_profile_id")
      .eq("customer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchById(orderId: string, userId: string) {
    const { data, error } = await db("orders")
      .select("*")
      .eq("id", orderId)
      .eq("customer_user_id", userId)
      .maybeSingle() as { data: OrderRow | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async updateStatus(orderId: string, userId: string, status: string) {
    const { error } = await db("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("customer_user_id", userId);
    if (error) throw error;
  },

  async fetchByShop(shopId: string, limit = 50) {
    const { data, error } = await db("orders")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: OrderRow[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },
};
