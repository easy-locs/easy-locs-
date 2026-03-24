/**
 * Orchestration event logger — persists events to activity_logs (canonical).
 */
import { supabase } from "@/integrations/supabase/client";

export async function logOrchestrationEvent(params: {
  eventType: string;
  entityId: string;
  entityType: string;
  metric?: string;
  metadata?: Record<string, unknown>;
  newValue?: number;
  previousValue?: number;
}) {
  try {
    const { error } = await (supabase as any).from("activity_logs").insert({
      id: crypto.randomUUID(),
      action: params.eventType,
      entity_id: params.entityId,
      entity_type: params.entityType,
      metadata: {
        metric: params.metric ?? "orchestration",
        newValue: params.newValue ?? 0,
        previousValue: params.previousValue ?? 0,
        ...(params.metadata ?? {}),
      },
    });
    if (error) console.error("[orchestration] log failed", error);
  } catch (err) {
    console.error("[orchestration] unexpected log error", err);
  }
}
