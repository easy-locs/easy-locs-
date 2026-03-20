import { supabase } from "@/integrations/supabase/client";

export async function queueNotification(params: {
  actorType: "user" | "pro" | "system" | "admin";
  actorId?: string | null;
  channel?: "push" | "email" | "sms";
  templateKey: string;
  payload?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("dino_notifications")
    .insert({
      actor_type: params.actorType,
      actor_id: params.actorId ?? null,
      channel: params.channel ?? "push",
      template_key: params.templateKey,
      payload_json: (params.payload ?? {}) as any,
      status: "pending",
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listNotificationQueue(limit = 100) {
  const { data, error } = await supabase
    .from("dino_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function markNotificationStatus(params: {
  notificationId: string;
  status: "pending" | "sent" | "failed";
}) {
  const { data, error } = await supabase
    .from("dino_notifications")
    .update({
      status: params.status,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.notificationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function triggerOrderUpdateNotifications(limit = 50) {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, customer_user_id, status, total_amount, currency")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const results: Array<{ orderId: string; ok: boolean; error?: string }> = [];

  for (const row of orders ?? []) {
    try {
      await queueNotification({
        actorType: "user",
        actorId: (row as any).customer_user_id ?? null,
        channel: "push",
        templateKey: "order_status_update",
        payload: {
          orderId: row.id,
          status: (row as any).status,
          totalAmount: Number((row as any).total_amount ?? 0),
          currency: (row as any).currency ?? "AED",
        },
      });
      results.push({ orderId: row.id, ok: true });
    } catch (err: any) {
      results.push({ orderId: row.id, ok: false, error: err.message || "Notification failed" });
    }
  }

  return results;
}
