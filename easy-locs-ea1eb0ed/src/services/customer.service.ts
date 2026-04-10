import { db } from "./db";


export const customerService = {
  async fetchLoyaltyAccount(userId: string) {
    const { data, error } = await db("loyalty_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchCustomerOrders(userId: string, limit = 100) {
    const { data, error } = await db("orders")
      .select("id,total_amount,status,created_at,currency")
      .eq("customer_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchPublicProfile(userId: string) {
    const { data, error } = await db("profiles")
      .select("id, display_name, avatar_url, username, bio, city, country")
      .eq("id", userId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchWalletTransaction(txnId: string) {
    const { data, error } = await db("unified_wallet_transactions")
      .select("id, amount, currency, context_type, status, created_at, sender_id, recipient_id")
      .eq("id", txnId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },

  async fetchOrderById(orderId: string) {
    const { data, error } = await db("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle() as { data: unknown | null; error: unknown };
    if (error) throw error;
    return data;
  },
};
