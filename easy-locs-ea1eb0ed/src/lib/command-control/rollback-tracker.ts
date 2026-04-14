import { db } from "@/services/db";
import { logAuditEvent } from "./audit-log";
import type { RollbackPoint } from "./types";

export async function createRollbackPoint(params: {
  change_type: string;
  change_id: string;
  git_tag?: string;
  git_commit_sha?: string;
  deployment_id?: string;
  description: string;
}): Promise<RollbackPoint | null> {
  const { data, error } = await db("rollback_points")
    .insert({
      change_type: params.change_type,
      change_id: params.change_id,
      git_tag: params.git_tag || null,
      git_commit_sha: params.git_commit_sha || null,
      deployment_id: params.deployment_id || null,
      description: params.description,
      can_rollback: true,
      rolled_back: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[rollback-tracker] Failed to create rollback point:", error);
    return null;
  }

  await logAuditEvent({
    event_type: "rollback_point_created",
    actor_type: "system",
    action: `Created rollback point for ${params.change_type}:${params.change_id}`,
    target_type: params.change_type,
    target_id: params.change_id,
    rollback_tag: params.git_tag,
    details: { description: params.description, deployment_id: params.deployment_id },
  });

  return data as RollbackPoint;
}

export async function rollback(rollbackPointId: string, triggeredBy: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { data: point, error: findErr } = await db("rollback_points")
    .select("*")
    .eq("id", rollbackPointId)
    .single();

  if (findErr || !point) {
    return { success: false, error: "Rollback point not found" };
  }

  if (!point.can_rollback) {
    return { success: false, error: "This rollback point is not available for rollback" };
  }

  if (point.rolled_back) {
    return { success: false, error: "Already rolled back" };
  }

  await db("rollback_points")
    .update({
      rolled_back: true,
      rolled_back_at: new Date().toISOString(),
    })
    .eq("id", rollbackPointId);

  await logAuditEvent({
    event_type: "rollback_executed",
    actor_type: "human",
    actor_name: triggeredBy,
    action: `Rolled back ${point.change_type}:${point.change_id}`,
    target_type: point.change_type,
    target_id: point.change_id,
    rollback_tag: point.git_tag,
    details: {
      description: point.description,
      git_commit_sha: point.git_commit_sha,
      deployment_id: point.deployment_id,
    },
  });

  return { success: true };
}

export async function getRollbackHistory(limit = 20): Promise<RollbackPoint[]> {
  const { data, error } = await db("rollback_points")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []) as RollbackPoint[];
}
