/**
 * Team workspace management — create workspaces and add members.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createWorkspace(params: {
  orgId: string;
  name: string;
  workspaceType?: "operations" | "agency" | "shop" | "property" | "support";
  createdBy?: string | null;
}) {
  const { data, error } = await supabase
    .from("team_workspaces" as any)
    .insert({
      org_id: params.orgId,
      name: params.name,
      workspace_type: params.workspaceType ?? "operations",
      created_by: params.createdBy ?? null,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addWorkspaceMember(params: {
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "manager" | "agent" | "support" | "finance" | "viewer";
  permissions?: string[];
}) {
  const { error } = await supabase
    .from("team_workspace_members" as any)
    .insert({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      role: params.role,
      permissions: params.permissions ?? [],
    } as any);

  if (error) throw error;
  return { ok: true };
}
