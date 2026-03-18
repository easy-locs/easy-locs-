/**
 * Moderation — flag messages for review.
 */
import { supabase } from "@/integrations/supabase/client";

export async function flagMessageModeration(params: {
  userId?: string | null;
  threadId?: string | null;
  messageId?: string | null;
  eventType: "spam" | "abuse" | "fraud" | "unsafe_content" | "impersonation";
  severity?: "low" | "medium" | "high" | "critical";
  actionTaken?: "flagged" | "muted" | "restricted" | "hidden" | "blocked";
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from("moderation_events" as any)
    .insert({
      user_id: params.userId ?? null,
      thread_id: params.threadId ?? null,
      message_id: params.messageId ?? null,
      event_type: params.eventType,
      severity: params.severity ?? "medium",
      action_taken: params.actionTaken ?? "flagged",
      metadata_json: params.metadata ?? {},
    } as any);

  if (error) throw error;
  return { ok: true };
}
