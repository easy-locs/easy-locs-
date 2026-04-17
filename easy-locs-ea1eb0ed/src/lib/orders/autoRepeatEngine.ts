import { db } from "@/services/db";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function listAutoRepeatOrders(userId: string) {
  const { data, error } = await cFrom("auto_repeat_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAutoRepeatOrder(params: {
  userId: string;
  orderId: string;
  frequency: "daily" | "weekly" | "monthly";
  enabled?: boolean;
}) {
  const { data, error } = await cFrom("auto_repeat_orders")
    .insert({
      user_id: params.userId,
      source_order_id: params.orderId,
      frequency: params.frequency,
      enabled: params.enabled ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function toggleAutoRepeatOrder(id: string, enabled: boolean) {
  const { data, error } = await cFrom("auto_repeat_orders")
    .update({
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAutoRepeatOrder(id: string) {
  const { error } = await cFrom("auto_repeat_orders")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}
