import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";

const assignmentLocks = new Map<string, number>();
const LOCK_TTL_MS = 10_000;

function acquireLock(jobId: string): boolean {
  const now = Date.now();
  const existing = assignmentLocks.get(jobId);

  if (existing && now - existing < LOCK_TTL_MS) {
    return false;
  }

  assignmentLocks.set(jobId, now);
  return true;
}

function releaseLock(jobId: string) {
  assignmentLocks.delete(jobId);
}

export async function resolveConflict(
  jobId: string,
  offerId: string,
  riderId: string,
): Promise<boolean> {
  if (!acquireLock(jobId)) {
    return false;
  }

  try {
    const { data: offer } = await supabase
      .from("mobility_job_offers")
      .select("id, job_id, status, rider_user_id")
      .eq("id", offerId)
      .maybeSingle();

    if (!offer) return false;
    if ((offer as any).status !== "pending") return false;
    if ((offer as any).rider_user_id !== riderId) return false;
    if ((offer as any).job_id !== jobId) return false;

    const { data: alreadyAccepted } = await supabase
      .from("mobility_job_offers")
      .select("id")
      .eq("job_id", jobId)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();

    if (alreadyAccepted) {
      return false;
    }

    const { data: riderBusy } = await supabase
      .from("mobility_jobs")
      .select("id")
      .eq("rider_user_id", riderId)
      .in("status", ["accepted", "rider_arriving_pickup", "picked_up", "in_progress"])
      .limit(1)
      .maybeSingle();

    if (riderBusy) {
      await supabase
        .from("mobility_job_offers")
        .update({ status: "expired", responded_at: new Date().toISOString() } as any)
        .eq("id", offerId);
      return false;
    }

    const { data: acceptedRows, error: acceptError } = await supabase
      .from("mobility_job_offers")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      } as any)
      .eq("id", offerId)
      .eq("status", "pending")
      .eq("job_id", jobId)
      .select("id");

    if (acceptError || !acceptedRows?.length) return false;

    const { data: jobRows, error: jobError } = await supabase
      .from("mobility_jobs")
      .update({
        status: "accepted",
        rider_user_id: riderId,
        accepted_at: new Date().toISOString(),
      } as any)
      .eq("id", jobId)
      .in("status", ["searching", "offered"])
      .select("id");

    if (jobError || !jobRows?.length) {
      await supabase
        .from("mobility_job_offers")
        .update({ status: "pending" } as any)
        .eq("id", offerId);
      return false;
    }

    await supabase
      .from("mobility_job_offers")
      .update({
        status: "expired",
        responded_at: new Date().toISOString(),
      } as any)
      .eq("job_id", jobId)
      .eq("status", "pending");

    await supabase
      .from("rider_presence")
      .update({ is_available: false } as any)
      .eq("user_id", riderId);

    await supabase
      .from("mobility_dispatch_runs")
      .update({
        status: "assigned",
        updated_at: new Date().toISOString(),
      } as any)
      .eq("job_id", jobId)
      .eq("status", "running");

    void eventBus.emit("dispatch.conflict_resolved", {
      jobId,
      offerId,
      riderId,
      outcome: "assigned",
    });

    return true;
  } finally {
    releaseLock(jobId);
  }
}

export function cleanupLocks() {
  const now = Date.now();
  for (const [key, ts] of assignmentLocks.entries()) {
    if (now - ts > LOCK_TTL_MS) {
      assignmentLocks.delete(key);
    }
  }
}
