/**
 * DINO V9 — Autopilot Runner
 * Orchestrates insights → decisions → actions → learning in a single cycle.
 */

import { collectPlatformInsights } from "./insightsCollector";
import { generateActionsFromInsights } from "./decisionEngine";
import { executeDinoActions, type DinoAction } from "./actionEngine";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { DinoMode } from "./types";

export interface AutopilotResult {
  totalActions: number;
  succeeded: number;
  failed: number;
  skipped: number;
  actions: DinoAction[];
}

export async function runAutopilotCycle(mode: DinoMode = "full_auto"): Promise<AutopilotResult> {
  const insights = await collectPlatformInsights();
  const actions = generateActionsFromInsights(insights);
  const executed = await executeDinoActions(actions, mode);

  await recordLearning(executed);

  const succeeded = executed.filter(a => a.result?.success).length;
  const failed = executed.filter(a => a.result && !a.result.success && a.autoExecute).length;
  const skipped = executed.filter(a => !a.autoExecute).length;

  return { totalActions: executed.length, succeeded, failed, skipped, actions: executed };
}

async function recordLearning(actions: DinoAction[]) {
  const events = actions
    .filter(a => a.result)
    .map(a => ({
      event_type: `autopilot_${a.type}`,
      entity_id: a.id,
      entity_type: "action",
      metric: a.type,
      metadata_json: {
        priority: a.priority,
        success: a.result?.success,
        message: a.result?.message,
      } as unknown as Json,
      new_value: a.result?.success ? 1 : 0,
      previous_value: 0,
    }));

  if (events.length > 0) {
    await supabase.from("dino_learning_events").insert(events);
  }
}
