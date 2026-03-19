/**
 * Orchestration event logger — persists events to dino_learning_events.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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
    const { error } = await supabase.from("dino_learning_events").insert({
      event_type: params.eventType,
      entity_id: params.entityId,
      entity_type: params.entityType,
      metric: params.metric ?? "orchestration",
      metadata_json: (params.metadata ?? {}) as Json,
      new_value: params.newValue ?? 0,
      previous_value: params.previousValue ?? 0,
    });

    if (error) {
      console.error("[orchestration] log failed", error);
    }
  } catch (err) {
    console.error("[orchestration] unexpected log error", err);
  }
}
