import { db } from "@/services/db";

const ACTIVE_STATUSES = [
  "paid", "confirmed", "preparing", "ready_for_pickup",
  "driver_search", "driver_assigned", "picked_up", "on_the_way",
] as const;

const ARCHIVED_STATUSES = ["completed", "delivered", "cancelled", "refunded"] as const;
const REORDER_STATUSES = ["completed", "delivered"] as const;

export async function fetchActiveOrders(userId: string, limit = 100) {
  const { data, error } = await db("orders")
    .select("*")
    .eq("customer_user_id", userId)
    .in("status", [...ACTIVE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countActiveOrders(userId: string) {
  const { count, error } = await db("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_user_id", userId)
    .in("status", [...ACTIVE_STATUSES]);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchArchivedOrders(userId: string, limit = 300) {
  const { data, error } = await db("orders")
    .select("*")
    .eq("customer_user_id", userId)
    .in("status", [...ARCHIVED_STATUSES])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrderReceipts(userId: string, limit = 200) {
  const { data, error } = await db("orders")
    .select("id,total_amount,currency,status,created_at,payment_status")
    .eq("customer_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchReorderCandidates(userId: string, limit = 50) {
  const { data, error } = await db("orders")
    .select("*")
    .eq("customer_user_id", userId)
    .in("status", [...REORDER_STATUSES])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrderById(orderId: string) {
  const { data, error } = await db("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchSpendingHistory(userId: string, limit = 1000) {
  const { data, error } = await db("orders")
    .select("total_amount,status,created_at,currency")
    .eq("customer_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
