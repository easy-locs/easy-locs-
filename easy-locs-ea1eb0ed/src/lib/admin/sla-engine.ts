/**
 * SLA engine — start and complete SLA tracking events.
 */
import { supabase } from "@/integrations/supabase/client";

export async function startSLA(params: {
  contextType: string;
  contextId?: string | null;
  slaType: string;
  targetSeconds: number;
}) {
  const { data, error } = await supabase
    .from("ops_sla_events" as any)
    .insert({
      context_type: params.contextType,
      context_id: params.contextId ?? null,
      sla_type: params.slaType,
      target_seconds: params.targetSeconds,
      elapsed_seconds: 0,
      sla_status: "running",
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function completeSLA(id: string, createdAt?: string | null, targetSeconds?: number) {
  const elapsedSeconds = createdAt
    ? Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 1000))
    : 0;

  const status = targetSeconds != null && elapsedSeconds > targetSeconds ? "breached" : "met";

  const { error } = await supabase
    .from("ops_sla_events" as any)
    .update({ elapsed_seconds: elapsedSeconds, sla_status: status, updated_at: new Date().toISOString() } as any)
    .eq("id", id);

  if (error) throw error;
  return { ok: true, elapsedSeconds, status };
}
