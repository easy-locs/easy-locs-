import { supabase } from "@/integrations/supabase/client";

export async function enqueueApproval(params: {
  workspaceId?: string;
  queueName: string;
  entityType: "risk_case" | "payout" | "refund" | "merchant" | "user" | "driver" | "exchange_order";
  entityId: string;
  approvalType: "manual_review" | "freeze" | "release" | "reject" | "escalate";
  priority?: "low" | "medium" | "high" | "critical";
  requestedBy?: string;
  requestedReason?: string;
  payload?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("approval_queues")
    .insert({
      workspace_id: params.workspaceId ?? null,
      queue_name: params.queueName,
      entity_type: params.entityType,
      entity_id: params.entityId,
      approval_type: params.approvalType,
      priority: params.priority ?? "medium",
      requested_by: params.requestedBy ?? null,
      requested_reason: params.requestedReason ?? null,
      payload: params.payload ?? {},
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function addApprovalAction(params: {
  queueId: string;
  actorId?: string;
  actionType: "approve" | "reject" | "comment" | "escalate";
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("approval_actions")
    .insert({
      queue_id: params.queueId,
      actor_id: params.actorId ?? null,
      action_type: params.actionType,
      notes: params.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function resolveApprovalQueue(params: {
  queueId: string;
  status: "approved" | "rejected" | "escalated";
}) {
  const { data, error } = await supabase
    .from("approval_queues")
    .update({
      status: params.status,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", params.queueId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
