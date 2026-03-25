/**
 * Automation Workflow Engine — Processes pending automation workflows.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runAutomationWorkflows(limit = 20) {
  const { data: pending } = await db
    .from("automation_workflows")
    .select("id, workflow_type, entity_id, entity_type, status, current_step, steps_json, retry_count")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .limit(limit);

  let processed = 0, failed = 0, completed = 0;
  for (const wf of pending ?? []) {
    processed++;
    const steps = Array.isArray(wf.steps_json) ? wf.steps_json : [];
    const totalSteps = steps.length || 1;

    if (wf.current_step >= totalSteps) {
      await db.from("automation_workflows").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", wf.id);
      completed++;
    } else {
      // Advance to next step
      await db.from("automation_workflows").update({
        current_step: wf.current_step + 1,
        executed_at: new Date().toISOString(),
        status: wf.current_step + 1 >= totalSteps ? "completed" : "in_progress",
      }).eq("id", wf.id);
      completed++;
    }
  }

  return { processed, completed, failed };
}
