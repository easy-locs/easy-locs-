import { supabase } from "@/integrations/supabase/client";

export async function createIncidentCase(params: {
  incidentType: string;
  severity?: "low" | "medium" | "high" | "critical";
  title: string;
  summary?: string;
  ownerUserId?: string;
}) {
  const { data, error } = await (supabase as any)
    .from("incident_cases")
    .insert({
      incident_type: params.incidentType,
      severity: params.severity ?? "medium",
      title: params.title,
      summary: params.summary ?? null,
      owner_user_id: params.ownerUserId ?? null,
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addIncidentEvent(params: {
  incidentId: string;
  eventType: "created" | "note" | "action" | "escalation" | "resolved";
  body?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await (supabase as any)
    .from("incident_case_events")
    .insert({
      incident_id: params.incidentId,
      event_type: params.eventType,
      body: params.body ?? null,
      metadata_json: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function resolveIncidentCase(incidentId: string) {
  const { data, error } = await (supabase as any)
    .from("incident_cases")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", incidentId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
