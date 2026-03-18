import { supabase } from "@/integrations/supabase/client";

export async function createSalesSequence(params: {
  workspaceId?: string;
  sequenceName: string;
  audienceType?: "merchant" | "driver" | "user";
  channel: "whatsapp" | "sms" | "email" | "push";
  isPersonalized?: boolean;
}) {
  const { data, error } = await supabase
    .from("sales_ai_sequences")
    .insert({
      workspace_id: params.workspaceId ?? null,
      sequence_name: params.sequenceName,
      audience_type: params.audienceType ?? "merchant",
      channel: params.channel,
      is_personalized: params.isPersonalized ?? true,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addSalesSequenceStep(params: {
  sequenceId: string;
  stepOrder: number;
  delayHours?: number;
  stepType: "intro" | "followup" | "objection" | "offer" | "close";
  template: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("sales_ai_sequence_steps")
    .insert({
      sequence_id: params.sequenceId,
      step_order: params.stepOrder,
      delay_hours: params.delayHours ?? 0,
      step_type: params.stepType,
      template: params.template,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function activateSalesSequence(sequenceId: string) {
  const { data, error } = await supabase
    .from("sales_ai_sequences")
    .update({ status: "active" })
    .eq("id", sequenceId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function startSalesSequenceRun(params: {
  sequenceId: string;
  leadId: string;
  nextRunAt?: string;
}) {
  const { data, error } = await supabase
    .from("sales_ai_sequence_runs")
    .insert({
      sequence_id: params.sequenceId,
      lead_id: params.leadId,
      current_step_order: 0,
      status: "queued",
      next_run_at: params.nextRunAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
