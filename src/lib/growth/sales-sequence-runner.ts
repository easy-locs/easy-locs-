import { supabase } from "@/integrations/supabase/client";

export async function runNextSalesSequenceStep(runId: string) {
  const { data: run, error: runError } = await supabase
    .from("sales_ai_sequence_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError) throw runError;

  const nextStepOrder = Number(run.current_step_order) + 1;

  const { data: step, error: stepError } = await supabase
    .from("sales_ai_sequence_steps")
    .select("*")
    .eq("sequence_id", run.sequence_id)
    .eq("step_order", nextStepOrder)
    .maybeSingle();

  if (stepError) throw stepError;

  if (!step) {
    const { data, error } = await supabase
      .from("sales_ai_sequence_runs")
      .update({
        status: "completed",
        current_step_order: nextStepOrder - 1,
      })
      .eq("id", runId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data: fnData, error: fnError } = await supabase.functions.invoke("generate-sales-step", {
    body: { lead: { id: run.lead_id }, step },
  });

  if (fnError) throw fnError;

  const output = fnData?.output ?? step.template ?? "";
  const nextRunAt = new Date(Date.now() + (Number(step.delay_hours) || 0) * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("sales_ai_sequence_runs")
    .update({
      status: "active",
      current_step_order: nextStepOrder,
      last_output: output,
      next_run_at: nextRunAt,
    })
    .eq("id", runId)
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("sales_ai_activities").insert({
    lead_id: run.lead_id,
    activity_type: "ai_sequence",
    direction: "outbound",
    content: output,
    outcome: "generated",
  });

  return data;
}
