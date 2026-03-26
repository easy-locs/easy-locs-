import { supabase } from "@/integrations/supabase/client";

async function logAction(params: {
  reviewQueueId: string;
  actionType: string;
  actorUserId?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  notes?: string | null;
}) {
  const db = supabase as any;
  await db.from("onboarding_review_actions").insert({
    review_queue_id: params.reviewQueueId,
    action_type: params.actionType,
    actor_user_id: params.actorUserId ?? null,
    before_json: params.beforeJson ?? null,
    after_json: params.afterJson ?? null,
    notes: params.notes ?? null,
  });
}

export async function assignReviewQueueItem(reviewQueueId: string, assignedTo: string, actorUserId?: string) {
  const db = supabase as any;
  const { data: before } = await db.from("onboarding_review_queue").select("*").eq("id", reviewQueueId).single();
  const { data, error } = await db.from("onboarding_review_queue").update({
    assigned_to: assignedTo, review_status: "in_review", updated_at: new Date().toISOString(),
  }).eq("id", reviewQueueId).select("*").single();
  if (error) throw error;
  await logAction({ reviewQueueId, actionType: "assign", actorUserId, beforeJson: before, afterJson: data });
  return data;
}

export async function approveReviewQueueItem(reviewQueueId: string, actorUserId?: string) {
  const db = supabase as any;
  const { data: before } = await db.from("onboarding_review_queue").select("*").eq("id", reviewQueueId).single();
  const { data, error } = await db.from("onboarding_review_queue").update({
    review_status: "approved", final_visibility: "public",
    reviewed_by: actorUserId ?? null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", reviewQueueId).select("*").single();
  if (error) throw error;
  await logAction({ reviewQueueId, actionType: "approve", actorUserId, beforeJson: before, afterJson: data });
  return data;
}

export async function rejectReviewQueueItem(reviewQueueId: string, reason: string, actorUserId?: string) {
  const db = supabase as any;
  const { data: before } = await db.from("onboarding_review_queue").select("*").eq("id", reviewQueueId).single();
  const { data, error } = await db.from("onboarding_review_queue").update({
    review_status: "rejected", review_reason: reason, final_visibility: "draft",
    reviewed_by: actorUserId ?? null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", reviewQueueId).select("*").single();
  if (error) throw error;
  await logAction({ reviewQueueId, actionType: "reject", actorUserId, beforeJson: before, afterJson: data, notes: reason });
  return data;
}

export async function markNeedsRecrawl(reviewQueueId: string, entityId: string, vertical: string, reason: string, actorUserId?: string) {
  const db = supabase as any;
  const { data: before } = await db.from("onboarding_review_queue").select("*").eq("id", reviewQueueId).single();
  const { error: queueError } = await db.from("onboarding_review_queue").update({
    review_status: "needs_recrawl", review_reason: reason, updated_at: new Date().toISOString(),
  }).eq("id", reviewQueueId);
  if (queueError) throw queueError;
  const { data: recrawlJob, error: recrawlError } = await db.from("onboarding_recrawl_jobs").insert({
    entity_id: entityId, vertical, trigger_reason: reason, status: "queued", input_json: { reviewQueueId },
  }).select("*").single();
  if (recrawlError) throw recrawlError;
  await logAction({ reviewQueueId, actionType: "recrawl", actorUserId, beforeJson: before, afterJson: recrawlJob, notes: reason });
  return recrawlJob;
}
