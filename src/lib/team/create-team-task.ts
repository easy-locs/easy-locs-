/**
 * Team task engine — create and manage team tasks.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createTeamTask(params: {
  workspaceId: string;
  assignedTo?: string | null;
  taskType: string;
  title: string;
  description?: string;
  contextType?: string;
  contextId?: string | null;
  priority?: "low" | "medium" | "high" | "critical";
  createdBy?: string | null;
}) {
  const { data, error } = await supabase
    .from("team_tasks" as any)
    .insert({
      workspace_id: params.workspaceId,
      assigned_to: params.assignedTo ?? null,
      task_type: params.taskType,
      title: params.title,
      description: params.description ?? null,
      context_type: params.contextType ?? null,
      context_id: params.contextId ?? null,
      priority: params.priority ?? "medium",
      created_by: params.createdBy ?? null,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
