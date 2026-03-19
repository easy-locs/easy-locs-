/**
 * DINO Notify — Queue notifications for async delivery via edge function worker.
 */

import { supabase } from "@/integrations/supabase/client";

export type NotificationChannel = "email" | "sms" | "whatsapp";

export async function queueNotification(input: {
  actorType: string;
  actorId?: string | null;
  channel: NotificationChannel;
  templateKey: string;
  payload?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("dino_notifications")
    .insert({
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      channel: input.channel,
      template_key: input.templateKey,
      payload_json: input.payload ?? {},
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function queueProReminder(proId: string, templateKey: string, payload: Record<string, unknown> = {}) {
  return queueNotification({
    actorType: "pro",
    actorId: proId,
    channel: "email",
    templateKey,
    payload,
  });
}

export async function queueUserRecovery(userId: string, templateKey: string, payload: Record<string, unknown> = {}) {
  return queueNotification({
    actorType: "user",
    actorId: userId,
    channel: "email",
    templateKey,
    payload,
  });
}
