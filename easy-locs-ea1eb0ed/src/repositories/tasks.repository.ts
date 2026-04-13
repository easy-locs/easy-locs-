/**
 * tasks.repository — All DB operations for Tasks page.
 */
import { db } from "@/services/db";

export async function fetchTasksData(orgId: string) {
  const [tasksRes, propsRes, tenantsRes] = await Promise.all([
    db("tasks").select("*").eq("org_id", orgId).order("due_date", { ascending: true }),
    db("properties").select("id, label").eq("org_id", orgId),
    db("tenants").select("id, name").eq("org_id", orgId),
  ]);
  return {
    tasks: (tasksRes.data || []) as any[],
    properties: propsRes.data || [],
    tenants: tenantsRes.data || [],
  };
}

export async function insertTask(payload: Record<string, any>) {
  const { error } = await db("tasks").insert(payload);
  if (error) throw error;
}

export async function updateTask(taskId: string, payload: Record<string, any>) {
  const { error } = await db("tasks").update(payload).eq("id", taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const { error } = await db("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function updateTaskStatus(taskId: string, status: string) {
  await db("tasks").update({ status }).eq("id", taskId);
}
