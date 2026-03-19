/**
 * DINO V9 — Autopilot Runner
 * Orchestrates insights → decisions → actions → learning in a single cycle.
 * Can be called from the dashboard or from the dino-autopilot edge function.
 */

import { collectPlatformInsights } from "./insightsCollector";
import { generateActionsFromInsights } from "./decisionEngine";
import { executeDinoActions, type DinoAction } from "./actionEngine";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AutopilotResult {
  totalActions: number;
  succeeded: number;
  failed: number;
  skipped: number;
  actions: DinoAction[];
}

export async function runAutopilotCycle(): Promise<AutopilotResult> {
  // 1) Collect
  const insights = await collectPlatformInsights();

  // 2) Decide
  const actions = generateActionsFromInsights(insights);

  // 3) Execute
  const executed = await executeDinoActions(actions);

  // 4) Learn
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
      event_type: `autopilot_${a.type}` as string,
      source_module: "autopilot",
      context_json: {
        actionId: a.id,
        priority: a.priority,
        success: a.result?.success,
        message: a.result?.message,
      } as unknown as Json,
      outcome: a.result?.success ? "success" : "failure",
    }));

  if (events.length > 0) {
    await supabase.from("dino_learning_events").insert(events);
  }
}
