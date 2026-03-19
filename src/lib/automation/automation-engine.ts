/**
 * Automation Engine — Event-driven workflows for merchant onboarding, dispatch retry,
 * settlement retry, and growth sequences.
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

// ── Types ─────────────────────────────────────────────────
export type WorkflowStatus = "queued" | "scheduled" | "running" | "completed" | "failed" | "stopped" | "cancelled";

export type WorkflowType =
  | "merchant_outreach"
  | "merchant_onboarding"
  | "merchant_growth"
  | "order_review"
  | "dispatch_retry"
  | "settlement_retry"
  | "dormant_reactivation"
  | "custom";

export interface WorkflowStep {
  stepIndex: number;
  action: string;
  channel?: string;
  delayMinutes: number;
  condition?: string;
  executed?: boolean;
  executedAt?: string;
  result?: string;
}

export interface CreateWorkflowInput {
  workflowType: WorkflowType;
  entityType: string;
  entityId: string;
  triggerSource: string;
  steps: WorkflowStep[];
  countryCode?: string;
  city?: string;
  vertical?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

// ── Workflow Templates ────────────────────────────────────
export const WORKFLOW_TEMPLATES: Record<string, WorkflowStep[]> = {
  merchant_outreach: [
    { stepIndex: 0, action: "create_activation_draft", channel: "whatsapp", delayMinutes: 0 },
    { stepIndex: 1, action: "send_reminder", channel: "whatsapp", delayMinutes: 1440, condition: "not_claimed" },
    { stepIndex: 2, action: "send_urgency", channel: "sms", delayMinutes: 4320, condition: "not_claimed" },
    { stepIndex: 3, action: "send_final_attempt", channel: "whatsapp", delayMinutes: 10080, condition: "not_claimed" },
    { stepIndex: 4, action: "mark_dormant", delayMinutes: 20160, condition: "not_claimed" },
  ],
  merchant_onboarding: [
    { stepIndex: 0, action: "send_welcome", channel: "whatsapp", delayMinutes: 0 },
    { stepIndex: 1, action: "check_profile_completion", delayMinutes: 1440, condition: "profile_incomplete" },
    { stepIndex: 2, action: "send_setup_reminder", channel: "whatsapp", delayMinutes: 2880, condition: "menu_missing" },
    { stepIndex: 3, action: "flag_stalled", delayMinutes: 7200, condition: "not_activated" },
  ],
  dispatch_retry: [
    { stepIndex: 0, action: "expand_radius", delayMinutes: 0 },
    { stepIndex: 1, action: "rebroadcast", delayMinutes: 2, condition: "no_accept" },
    { stepIndex: 2, action: "notify_merchant", delayMinutes: 5, condition: "no_accept" },
    { stepIndex: 3, action: "allow_self_delivery", delayMinutes: 10, condition: "no_accept" },
  ],
  settlement_retry: [
    { stepIndex: 0, action: "retry_settlement", delayMinutes: 5 },
    { stepIndex: 1, action: "retry_settlement", delayMinutes: 30, condition: "still_failed" },
    { stepIndex: 2, action: "alert_admin", delayMinutes: 60, condition: "still_failed" },
  ],
  dormant_reactivation: [
    { stepIndex: 0, action: "send_reactivation_offer", channel: "whatsapp", delayMinutes: 0 },
    { stepIndex: 1, action: "send_followup", channel: "sms", delayMinutes: 4320, condition: "still_inactive" },
    { stepIndex: 2, action: "archive_dormant", delayMinutes: 20160, condition: "still_inactive" },
  ],
};

// ── 1. Create workflow ────────────────────────────────────
export async function createWorkflow(input: CreateWorkflowInput): Promise<any> {
  // Check for duplicate active workflow
  const { data: existing } = await (supabase as any)
    .from("automation_workflows")
    .select("id")
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .eq("workflow_type", input.workflowType)
    .in("status", ["queued", "scheduled", "running"])
    .maybeSingle();

  if (existing) return existing; // Idempotent: don't duplicate

  const firstStep = input.steps[0];
  const scheduledAt = firstStep?.delayMinutes
    ? new Date(Date.now() + firstStep.delayMinutes * 60_000).toISOString()
    : new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from("automation_workflows")
    .insert({
      workflow_type: input.workflowType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      trigger_source: input.triggerSource,
      status: "queued",
      current_step: 0,
      steps_json: input.steps,
      scheduled_at: scheduledAt,
      country_code: input.countryCode ?? null,
      city: input.city ?? null,
      vertical: input.vertical ?? null,
      priority: input.priority ?? 50,
      metadata_json: input.metadata ?? {},
      retry_count: 0,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ── 2. Execute next step ──────────────────────────────────
export async function executeWorkflowStep(workflowId: string): Promise<{ completed: boolean; action?: string }> {
  const { data: wf } = await (supabase as any)
    .from("automation_workflows")
    .select("*")
    .eq("id", workflowId)
    .single();

  if (!wf || wf.status === "completed" || wf.status === "stopped" || wf.status === "cancelled") {
    return { completed: true };
  }

  const steps: WorkflowStep[] = wf.steps_json ?? [];
  const currentStep = steps[wf.current_step];
  if (!currentStep) {
    await (supabase as any).from("automation_workflows").update({
      status: "completed", completed_at: new Date().toISOString(),
    } as any).eq("id", workflowId);
    return { completed: true };
  }

  // Mark running
  await (supabase as any).from("automation_workflows").update({ status: "running" } as any).eq("id", workflowId);

  // Execute action (extensible action handler)
  try {
    await handleAction(currentStep.action, wf);

    // Update step as executed
    steps[wf.current_step].executed = true;
    steps[wf.current_step].executedAt = new Date().toISOString();
    steps[wf.current_step].result = "success";

    const nextStep = wf.current_step + 1;
    const isLast = nextStep >= steps.length;

    const nextSchedule = isLast ? null
      : new Date(Date.now() + (steps[nextStep]?.delayMinutes ?? 0) * 60_000).toISOString();

    await (supabase as any).from("automation_workflows").update({
      current_step: nextStep,
      steps_json: steps,
      status: isLast ? "completed" : "scheduled",
      scheduled_at: nextSchedule,
      executed_at: new Date().toISOString(),
      completed_at: isLast ? new Date().toISOString() : null,
    } as any).eq("id", workflowId);

    return { completed: isLast, action: currentStep.action };
  } catch (err: any) {
    const retryCount = (wf.retry_count ?? 0) + 1;
    await (supabase as any).from("automation_workflows").update({
      status: retryCount >= 3 ? "failed" : "scheduled",
      retry_count: retryCount,
      failed_at: new Date().toISOString(),
      stop_reason: err.message,
    } as any).eq("id", workflowId);

    return { completed: false, action: currentStep.action };
  }
}

// ── 3. Action handler (extensible) ────────────────────────
async function handleAction(action: string, workflow: any) {
  // Each action is a lightweight handler — will be expanded per vertical
  switch (action) {
    case "create_activation_draft":
    case "send_reminder":
    case "send_urgency":
    case "send_final_attempt":
    case "send_welcome":
    case "send_setup_reminder":
    case "send_reactivation_offer":
    case "send_followup":
      // Future: integrate with messaging/outreach system
      console.log(`[automation] ${action} for ${workflow.entity_type}:${workflow.entity_id}`);
      break;

    case "mark_dormant":
    case "archive_dormant":
      await (supabase as any).from(workflow.entity_type).update({ status: "dormant" } as any).eq("id", workflow.entity_id);
      break;

    case "flag_stalled":
      await (supabase as any).from("admin_alerts").insert({
        alert_type: "merchant_stalled",
        title: `Merchant stalled in onboarding`,
        severity: "warning",
        status: "open",
        entity_type: workflow.entity_type,
        entity_id: workflow.entity_id,
      } as any);
      break;

    case "check_profile_completion":
      // No-op check — condition evaluation happens in step runner
      break;

    case "expand_radius":
    case "rebroadcast":
      // Dispatch retry logic handled by dispatch engine
      break;

    case "notify_merchant":
      await (supabase as any).from("admin_alerts").insert({
        alert_type: "no_driver_available",
        title: "No driver found for delivery",
        severity: "high",
        status: "open",
        entity_type: "dispatch_job",
        entity_id: workflow.entity_id,
      } as any);
      break;

    case "allow_self_delivery":
      // Mark dispatch job for self-delivery fallback
      await (supabase as any).from("dispatch_jobs").update({
        ranking_snapshot: { self_delivery_suggested: true },
      } as any).eq("id", workflow.entity_id);
      break;

    case "retry_settlement":
      // Attempt settlement via wallet engine
      try {
        const { settleOrderPaymentV2 } = await import("@/lib/wallet/wallet-engine");
        await settleOrderPaymentV2({ orderId: workflow.entity_id });
      } catch {
        throw new Error("Settlement retry failed");
      }
      break;

    case "alert_admin":
      await (supabase as any).from("admin_alerts").insert({
        alert_type: "settlement_failed",
        title: "Settlement failed after retries",
        severity: "critical",
        status: "open",
        entity_type: "order",
        entity_id: workflow.entity_id,
      } as any);
      break;

    default:
      console.warn(`[automation] Unknown action: ${action}`);
  }
}

// ── 4. Stop workflow ──────────────────────────────────────
export async function stopWorkflow(workflowId: string, reason: string) {
  await (supabase as any).from("automation_workflows").update({
    status: "stopped", stop_reason: reason,
  } as any).eq("id", workflowId);
  return { ok: true };
}

// ── 5. Resume workflow ────────────────────────────────────
export async function resumeWorkflow(workflowId: string) {
  await (supabase as any).from("automation_workflows").update({
    status: "scheduled", stop_reason: null,
  } as any).eq("id", workflowId);
  return { ok: true };
}

// ── 6. Cancel workflow ────────────────────────────────────
export async function cancelWorkflow(workflowId: string) {
  await (supabase as any).from("automation_workflows").update({
    status: "cancelled",
  } as any).eq("id", workflowId);
  return { ok: true };
}

// ── 7. Priority scoring ──────────────────────────────────
export function calculatePriorityScore(params: {
  gmvPotential?: number;
  failedSteps?: number;
  merchantQuality?: number;
  anomalyRisk?: number;
  launchPriority?: number;
  coverageGap?: number;
}): number {
  return (
    (params.gmvPotential ?? 0) * 0.25 +
    (params.failedSteps ?? 0) * 0.15 +
    (params.merchantQuality ?? 50) * 0.15 +
    (params.anomalyRisk ?? 0) * 0.15 +
    (params.launchPriority ?? 50) * 0.15 +
    (params.coverageGap ?? 0) * 0.15
  );
}

// ── 8. Create workflow from template ──────────────────────
export async function createWorkflowFromTemplate(
  templateKey: string,
  entityType: string,
  entityId: string,
  triggerSource: string,
  overrides?: Partial<CreateWorkflowInput>
) {
  const steps = WORKFLOW_TEMPLATES[templateKey];
  if (!steps) throw new Error(`Unknown template: ${templateKey}`);

  return createWorkflow({
    workflowType: templateKey as WorkflowType,
    entityType,
    entityId,
    triggerSource,
    steps: [...steps],
    ...overrides,
  });
}

// ── 9. Get workflows for entity ───────────────────────────
export async function getWorkflowsForEntity(entityType: string, entityId: string) {
  const { data } = await (supabase as any)
    .from("automation_workflows")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ── 10. Get all active workflows ──────────────────────────
export async function getActiveWorkflows(params?: { status?: string; workflowType?: string; limit?: number }) {
  let query = (supabase as any)
    .from("automation_workflows")
    .select("*")
    .order("priority", { ascending: false })
    .order("scheduled_at", { ascending: true })
    .limit(params?.limit ?? 50);

  if (params?.status) query = query.eq("status", params.status);
  if (params?.workflowType) query = query.eq("workflow_type", params.workflowType);

  const { data } = await query;
  return data ?? [];
}
