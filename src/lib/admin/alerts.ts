import { supabase } from "@/integrations/supabase/client";

export async function createAdminAlert(params: {
  alertType: string;
  severity?: "low" | "medium" | "high" | "critical";
  title: string;
  body?: string;
  contextType?: string;
  contextId?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await (supabase as any)
    .from("admin_alerts")
    .insert({
      alert_type: params.alertType,
      severity: params.severity ?? "medium",
      title: params.title,
      body: params.body ?? null,
      context_type: params.contextType ?? null,
      context_id: params.contextId ?? null,
      metadata_json: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function acknowledgeAdminAlert(alertId: string) {
  const { data, error } = await (supabase as any)
    .from("admin_alerts")
    .update({ status: "acknowledged" })
    .eq("id", alertId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function resolveAdminAlert(alertId: string) {
  const { data, error } = await (supabase as any)
    .from("admin_alerts")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listAdminAlerts() {
  const { data, error } = await (supabase as any)
    .from("admin_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data ?? [];
}
