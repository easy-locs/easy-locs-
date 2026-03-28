/**
 * Shared orchestration utilities — notification creation + order status update.
 * Single responsibility: DB write helpers used by all domain handlers.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function createNotification(params: {
  actorType: "user" | "pro" | "driver" | "system";
  actorId?: string;
  channel?: "push" | "email" | "sms";
  templateKey: string;
  payload?: Record<string, unknown>;
}) {
  const { error } = await db.from("app_notifications").insert({
    user_id: params.actorId ?? null,
    scope: "global",
    category: params.channel ?? "system",
    title: params.templateKey,
    body: JSON.stringify(params.payload ?? {}),
    severity: "info",
    metadata: { actorType: params.actorType, ...(params.payload ?? {}) },
  });
  if (error) console.error("[orchestration] notification error", error);
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) console.error("[orchestration] updateOrderStatus error", error);
}
