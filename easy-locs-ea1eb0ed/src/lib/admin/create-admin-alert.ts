/**
 * create-admin-alert — Persist platform alerts for ops dashboard.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createAdminAlert(params: {
  alertType: string;
  severity?: "low" | "medium" | "high" | "critical";
  title: string;
  body?: string;
  contextType?: string;
  contextId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from("admin_alerts" as any)
    .insert({
      alert_type: params.alertType,
      severity: params.severity ?? "medium",
      title: params.title,
      body: params.body ?? null,
      context_type: params.contextType ?? null,
      context_id: params.contextId ?? null,
      metadata_json: params.metadata ?? {},
    } as any);

  if (error) throw error;
  return { ok: true };
}
