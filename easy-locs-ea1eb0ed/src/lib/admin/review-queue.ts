/**
 * Review / Anomaly Queue
 * Centralized anomaly handling for wallet, order, delivery flagged items.
 */
import { db } from "@/services/db";

export interface ReviewQueueItem {
  id: string;
  queueName: string;
  approvalType: string;
  entityType: string;
  entityId: string;
  status: string;
  priority: string | null;
  payload: Record<string, unknown> | null;
  requestedBy: string | null;
  requestedReason: string | null;
  createdAt: string;
}

export async function fetchReviewQueue(status?: string): Promise<ReviewQueueItem[]> {
  let query = db
    .from("approval_queues")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data } = await query;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    queueName: r.queue_name,
    approvalType: r.approval_type,
    entityType: r.entity_type,
    entityId: r.entity_id,
    status: r.status,
    priority: r.priority,
    payload: r.payload,
    requestedBy: r.requested_by,
    requestedReason: r.requested_reason,
    createdAt: r.created_at,
  }));
}

export async function resolveReviewItem(id: string, action: "approve" | "reject" | "escalate", notes?: string) {
  const statusMap = { approve: "approved", reject: "rejected", escalate: "escalated" };

  await db
    .from("approval_queues")
    .update({ status: statusMap[action], resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
    .eq("id", id);

  if (notes) {
    await db("approval_actions").insert({
      queue_id: id,
      action_type: action,
      notes,
    } as any);
  }

  return { ok: true };
}

export async function createReviewEntry(params: {
  entityType: string;
  entityId: string;
  approvalType: string;
  reason?: string;
  priority?: string;
  payload?: Record<string, unknown>;
}) {
  // Idempotent: don't create duplicate pending reviews
  const { data: existing } = await db
    .from("approval_queues")
    .select("id")
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) return existing;

  const { data } = await db
    .from("approval_queues")
    .insert({
      queue_name: "review",
      approval_type: params.approvalType,
      entity_type: params.entityType,
      entity_id: params.entityId,
      status: "pending",
      priority: params.priority ?? "medium",
      requested_reason: params.reason,
      payload: params.payload ?? {},
    } as any)
    .select("id")
    .single();

  return data;
}
