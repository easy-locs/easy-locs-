/**
 * Approval Queue Engine — Processes pending approval requests and auto-expires stale ones.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const EXPIRE_DAYS = 7;

export async function runApprovalQueueCheck(limit = 50) {
  const cutoff = new Date(Date.now() - EXPIRE_DAYS * 86400_000).toISOString();

  // Expire stale pending approvals
  const { data: stale } = await db
    .from("approval_queues")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .limit(limit);

  let expired = 0;
  for (const a of stale ?? []) {
    await db.from("approval_queues").update({
      status: "expired",
      resolved_at: new Date().toISOString(),
    }).eq("id", a.id);
    expired++;
  }

  const { count: pending } = await db
    .from("approval_queues")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return { expired, pendingCount: pending ?? 0 };
}
