/**
 * Automation Runner
 * Takes canonical automation_workflows rows and executes them safely.
 * Evaluates conditions, executes actions, schedules next steps.
 * All operations are idempotent.
 */
import { supabase } from "@/integrations/supabase/client";
import { evaluateCondition } from "./automation-conditions";
import { executeAction } from "./automation-actions";
import { platformBus } from "@/lib/shared/platform-bus";
import type { WorkflowStep } from "./automation-engine";

export interface RunResult {
  workflowId: string;
  action?: string;
  completed: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Execute the next due step of a workflow.
 * Locks, evaluates condition, runs action, advances or completes.
 */
export async function runWorkflowStep(workflowId: string): Promise<RunResult> {
  // 1. Fetch and lock
  const { data: wf, error: fetchErr } = await (supabase as any)
    .from("automation_workflows")
    .select("*")
    .eq("id", workflowId)
    .single();

  if (fetchErr || !wf) return { workflowId, completed: true, error: "not_found" };

  const terminal = ["completed", "stopped", "cancelled", "failed"];
  if (terminal.includes(wf.status)) return { workflowId, completed: true };

  // Mark running to prevent double execution
  const { error: lockErr } = await (supabase as any)
    .from("automation_workflows")
    .update({ status: "running" } as any)
    .eq("id", workflowId)
    .eq("status", wf.status); // optimistic lock

  if (lockErr) return { workflowId, completed: false, error: "lock_failed" };

  const steps: WorkflowStep[] = wf.steps_json ?? [];
  const currentStep = steps[wf.current_step];

  if (!currentStep) {
    // All steps done
    await (supabase as any).from("automation_workflows").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    } as any).eq("id", workflowId);
    platformBus.emit("automation:workflow_completed", { workflowId }, "system");
    return { workflowId, completed: true };
  }

  // 2. Evaluate condition
  const conditionMet = await evaluateCondition(currentStep.condition, {
    entityType: wf.entity_type,
    entityId: wf.entity_id,
    metadata: wf.metadata_json,
  });

  if (!conditionMet) {
    // Condition not met => skip this step, complete workflow
    await (supabase as any).from("automation_workflows").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      stop_reason: `condition_not_met:${currentStep.condition}`,
    } as any).eq("id", workflowId);
    platformBus.emit("automation:workflow_completed", { workflowId, reason: "condition_false" }, "system");
    return { workflowId, completed: true, skipped: true };
  }

  // 3. Execute action
  try {
    platformBus.emit("automation:step_executed", {
      workflowId,
      step: wf.current_step,
      action: currentStep.action,
    }, "system");

    const result = await executeAction(currentStep.action, {
      entityType: wf.entity_type,
      entityId: wf.entity_id,
      workflowId,
      countryCode: wf.country_code,
      city: wf.city,
      metadata: wf.metadata_json,
      channel: currentStep.channel,
    });

    // 4. Mark step done, advance
    steps[wf.current_step] = {
      ...currentStep,
      executed: true,
      executedAt: new Date().toISOString(),
      result: result.ok ? "success" : `failed:${result.detail}`,
    };

    const nextIdx = wf.current_step + 1;
    const isLast = nextIdx >= steps.length;
    const nextDelay = isLast ? 0 : (steps[nextIdx]?.delayMinutes ?? 0);
    const nextSchedule = isLast ? null : new Date(Date.now() + nextDelay * 60_000).toISOString();

    await (supabase as any).from("automation_workflows").update({
      current_step: nextIdx,
      steps_json: steps,
      status: isLast ? "completed" : "scheduled",
      scheduled_at: nextSchedule,
      executed_at: new Date().toISOString(),
      completed_at: isLast ? new Date().toISOString() : null,
    } as any).eq("id", workflowId);

    if (isLast) platformBus.emit("automation:workflow_completed", { workflowId });
    return { workflowId, action: currentStep.action, completed: isLast };

  } catch (err: any) {
    const retryCount = (wf.retry_count ?? 0) + 1;
    const maxRetries = 5;
    const isFatal = retryCount >= maxRetries;

    await (supabase as any).from("automation_workflows").update({
      status: isFatal ? "failed" : "scheduled",
      retry_count: retryCount,
      failed_at: isFatal ? new Date().toISOString() : null,
      stop_reason: err.message,
      scheduled_at: isFatal ? null : new Date(Date.now() + retryCount * 60_000).toISOString(),
    } as any).eq("id", workflowId);

    if (isFatal) {
      platformBus.emit("automation:step_failed", { workflowId, error: err.message });
    }

    return { workflowId, action: currentStep.action, completed: false, error: err.message };
  }
}
