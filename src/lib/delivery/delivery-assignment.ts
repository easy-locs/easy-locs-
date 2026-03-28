/**
 * delivery-assignment — Atomic unit: assign/reassign driver to delivery job.
 * Single responsibility: driver assignment write + validation.
 */
import { supabase } from "@/integrations/supabase/client";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[DELIVERY][${step}] ${phase}:`, payload ?? {});
};

export interface AssignInput {
  jobId: string;
  driverUserId: string;
  assignedBy: string;
}

export async function assignDriver(input: AssignInput): Promise<{ success: boolean; error?: string }> {
  const flow = startFlow("delivery", "assign_driver");
  trace("assign", "input", input);

  // Check job exists and is assignable
  const checkStep = addStep(flow, "check_job");
  const { data: job, error: jobErr } = await (supabase as any)
    .from("mobility_jobs")
    .select("id, status, driver_user_id")
    .eq("id", input.jobId)
    .maybeSingle();

  if (jobErr || !job) {
    failStep(flow, checkStep, jobErr?.message ?? "job_not_found");
    endFlow(flow, "failed");
    return { success: false, error: "Job not found" };
  }

  if (job.driver_user_id && job.driver_user_id !== input.driverUserId) {
    failStep(flow, checkStep, "already_assigned");
    endFlow(flow, "failed");
    return { success: false, error: "Job already assigned to another driver" };
  }
  completeStep(flow, checkStep);

  // Write assignment
  const writeStep = addStep(flow, "write_assignment");
  const { error } = await (supabase as any)
    .from("mobility_jobs")
    .update({
      driver_user_id: input.driverUserId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", input.jobId);

  if (error) {
    failStep(flow, writeStep, error.message);
    endFlow(flow, "failed");
    return { success: false, error: error.message };
  }

  completeStep(flow, writeStep);
  endFlow(flow, "success");
  trace("assign", "output", { success: true });
  return { success: true };
}
