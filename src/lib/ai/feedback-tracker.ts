/**
 * AI Feedback Tracker — records user behavior signals per entity.
 */
import { supabase } from "@/integrations/supabase/client";

type FeedbackEvent =
  | "entity.view"
  | "entity.click"
  | "order.created"
  | "order.completed"
  | "boost.purchased"
  | "message.sent"
  | "favorite.added"
  | "search.performed"
  | "cart.abandoned";

const EVENT_WEIGHTS: Record<FeedbackEvent, number> = {
  "entity.view": 1,
  "entity.click": 3,
  "order.created": 8,
  "order.completed": 12,
  "boost.purchased": 4,
  "message.sent": 2,
  "favorite.added": 5,
  "search.performed": 1,
  "cart.abandoned": -3,
};

export async function trackFeedbackSignal(input: {
  entityId: string;
  entityType?: string;
  eventType: FeedbackEvent;
  userId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, any>;
}) {
  const weight = EVENT_WEIGHTS[input.eventType] ?? 1;

  try {
    await (supabase as any)
      .from("entity_feedback_signals")
      .insert({
        entity_id: input.entityId,
        entity_type: input.entityType ?? "merchant",
        event_type: input.eventType,
        user_id: input.userId ?? null,
        session_id: input.sessionId ?? null,
        weight,
        metadata_json: input.metadata ?? {},
      });
  } catch (e) {
    console.error("[ai-feedback] track error", e);
  }
}
