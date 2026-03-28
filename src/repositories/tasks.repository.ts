/**
 * tasks.repository — All DB operations for Tasks page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchTasksData(orgId: string) {
  const [tasksRes, propsRes, tenantsRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("org_id", orgId).order("due_date", { ascending: true }),
    supabase.from("properties").select("id, label").eq("org_id", orgId),
    supabase.from("tenants").select("id, name").eq("org_id", orgId),
  ]);
  return {
    tasks: (tasksRes.data || []) as any[],
    properties: propsRes.data || [],
    tenants: tenantsRes.data || [],
  };
}

export async function insertTask(payload: Record<string, any>) {
  const { error } = await (supabase as any).from("tasks").insert(payload);
  if (error) throw error;
}

export async function updateTask(taskId: string, payload: Record<string, any>) {
  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function updateTaskStatus(taskId: string, status: string) {
  await supabase.from("tasks").update({ status }).eq("id", taskId);
}
