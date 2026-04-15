import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import { checkThrottle, ThrottleError } from "@/lib/client-throttle";

const LOCK_TTL_SECONDS = 10;

async function acquireDistributedLock(jobId: string): Promise<boolean> {
  try {
    const { data, error } = await db.rpc("try_claim_dispatch_lock", {
      p_job_id: jobId,
      p_lock_ttl_seconds: LOCK_TTL_SECONDS,
    });
    if (error) {
      console.error("[dispatch-lock] RPC failed, rejecting to prevent race condition", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error("[dispatch-lock] Distributed lock unavailable, rejecting", err);
    return false;
  }
}

export async function resolveConflict(
  jobId: string,
  offerId: string,
  riderId: string,
): Promise<boolean> {
  const throttle = checkThrottle("api:dispatch");
  if (!throttle.allowed) {
    throw new ThrottleError("api:dispatch", throttle.retryAfterMs);
  }

  const locked = await acquireDistributedLock(jobId);
  if (!locked) {
    return false;
  }

  const { data: offer } = await db
    .from("mobility_job_offers")
    .select("id, job_id, status, rider_user_id")
    .eq("id", offerId)
    .maybeSingle();

  if (!offer) return false;
  if ((offer as Record<string, unknown>).status !== "pending") return false;
  if ((offer as Record<string, unknown>).rider_user_id !== riderId) return false;
  if ((offer as Record<string, unknown>).job_id !== jobId) return false;

  const { data: alreadyAccepted } = await db
    .from("mobility_job_offers")
    .select("id")
    .eq("job_id", jobId)
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (alreadyAccepted) {
    return false;
  }

  const { data: riderBusy } = await db
    .from("mobility_jobs")
    .select("id")
    .eq("rider_user_id", riderId)
    .in("status", ["accepted", "rider_arriving_pickup", "picked_up", "in_progress"])
    .limit(1)
    .maybeSingle();

  if (riderBusy) {
    await db
      .from("mobility_job_offers")
      .update({ status: "expired", responded_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", offerId);
    return false;
  }

  const { data: acceptedRows, error: acceptError } = await db
    .from("mobility_job_offers")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", offerId)
    .eq("status", "pending")
    .eq("job_id", jobId)
    .select("id");

  if (acceptError || !acceptedRows?.length) return false;

  const { data: jobRows, error: jobError } = await db
    .from("mobility_jobs")
    .update({
      status: "accepted",
      rider_user_id: riderId,
      accepted_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", jobId)
    .in("status", ["searching", "offered"])
    .select("id");

  if (jobError || !jobRows?.length) {
    await db
      .from("mobility_job_offers")
      .update({ status: "pending" } as Record<string, unknown>)
      .eq("id", offerId);
    return false;
  }

  await db
    .from("mobility_job_offers")
    .update({
      status: "expired",
      responded_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("job_id", jobId)
    .eq("status", "pending");

  await db
    .from("rider_presence")
    .update({ is_available: false } as Record<string, unknown>)
    .eq("user_id", riderId);

  await db
    .from("mobility_dispatch_runs")
    .update({
      status: "assigned",
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("job_id", jobId)
    .eq("status", "running");

  platformBus.emit("dispatch:conflict_resolved", {
    jobId,
    offerId,
    riderId,
    outcome: "assigned",
  }, "system");

  return true;
}
