import { supabase } from "@/integrations/supabase/client";

export async function upsertStealthRoute(params: {
  workspaceId?: string;
  identityId: string;
  routeType: "push" | "websocket" | "email" | "sms" | "inapp" | "proxy";
  endpoint?: string;
  endpointHash?: string;
  stealthLevel?: "standard" | "stealth" | "ghost";
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("stealth_notification_routes")
    .insert({
      workspace_id: params.workspaceId ?? null,
      identity_id: params.identityId,
      route_type: params.routeType,
      endpoint: params.endpoint ?? null,
      endpoint_hash: params.endpointHash ?? null,
      stealth_level: params.stealthLevel ?? "standard",
      is_active: true,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function queueStealthNotification(params: {
  workspaceId?: string;
  identityId?: string;
  routeId?: string;
  notificationType: "message" | "call" | "payment" | "alert" | "system";
  title?: string;
  body?: string;
  maskedPreview?: string;
  stealthMode?: "normal" | "masked" | "silent" | "proxy";
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("stealth_notifications")
    .insert({
      workspace_id: params.workspaceId ?? null,
      identity_id: params.identityId ?? null,
      route_id: params.routeId ?? null,
      notification_type: params.notificationType,
      title: params.title ?? null,
      body: params.body ?? null,
      masked_preview: params.maskedPreview ?? null,
      stealth_mode: params.stealthMode ?? "masked",
      delivery_status: "queued",
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markStealthNotificationDelivered(notificationId: string) {
  const { data, error } = await supabase
    .from("stealth_notifications")
    .update({
      delivery_status: "delivered",
      delivered_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
