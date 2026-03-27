import { supabase } from "@/integrations/supabase/client";

export type AppNotificationInput = {
  userId: string;
  scope?: "global" | "orbit" | "wallet" | "dashboard" | "booking" | "radar";
  category?: string;
  title: string;
  body?: string;
  route?: string;
  icon?: string;
  severity?: "info" | "success" | "warning" | "critical";
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function createAppNotification(input: AppNotificationInput) {
  const { error } = await (supabase as any).from("app_notifications").insert({
    user_id: input.userId,
    scope: input.scope ?? "global",
    category: input.category ?? "general",
    title: input.title,
    body: input.body ?? null,
    route: input.route ?? null,
    icon: input.icon ?? null,
    severity: input.severity ?? "info",
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await (supabase as any)
    .from("app_notifications")
    .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (error) throw error;
}

export async function dismissNotification(notificationId: string) {
  const { error } = await (supabase as any)
    .from("app_notifications")
    .update({ dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (error) throw error;
}
