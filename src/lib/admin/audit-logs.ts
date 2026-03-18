import { supabase } from "@/integrations/supabase/client";

export async function logAdminAction(params: {
  workspaceId?: string;
  actionType: string;
  entityType: string;
  entityId: string;
  summary?: string;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await (supabase as any).from("audit_logs").insert({
      action: `${params.actionType}:${params.entityType}:${params.entityId}`,
      user_id: userData.user?.id ?? null,
      org_id: null,
      metadata_json: {
        workspace_id: params.workspaceId ?? null,
        entity_type: params.entityType,
        entity_id: params.entityId,
        summary: params.summary ?? null,
      },
    });
  } catch {
    // non-blocking
  }
}
