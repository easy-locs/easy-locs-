import { smartDispatch, handleOfferResponse, handleRideComplete, startSmartDispatchCron } from "./smart-dispatch-controller";
import { sendRiderStatusMessage } from "./dispatch-orbit-bridge";
import { updateDriverStats } from "./dispatch-learning-engine";
import { isValidTransition } from "./status-machine";
import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import type { UnifiedMobilityJobInput } from "./unified-mobility.types";

interface JobStatusRow {
  status: string;
  rider_user_id: string | null;
}

export async function orchestrateUnifiedMobility(job: UnifiedMobilityJobInput) {
  return smartDispatch(job);
}

export async function acceptRideOffer(
  jobId: string,
  offerId: string,
  riderId: string,
) {
  return handleOfferResponse(jobId, offerId, riderId, "accept");
}

export async function rejectRideOffer(
  jobId: string,
  offerId: string,
  riderId: string,
) {
  return handleOfferResponse(jobId, offerId, riderId, "reject");
}

export async function advanceRideStatus(
  jobId: string,
  newStatus: string,
  riderId?: string,
) {
  const { data: job } = await db
    .from("mobility_jobs")
    .select("status, rider_user_id")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) throw new Error("Job not found");

  const typedJob = job as JobStatusRow;
  const currentStatus = typedJob.status;

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
  }

  const update: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "picked_up") {
    update.picked_up_at = new Date().toISOString();
  }
  if (newStatus === "completed") {
    update.completed_at = new Date().toISOString();
  }

  await db
    .from("mobility_jobs")
    .update(update as Record<string, unknown>)
    .eq("id", jobId);

  void sendRiderStatusMessage(jobId, newStatus);

  if (newStatus === "completed") {
    void handleRideComplete(jobId);
    const effectiveRiderId = riderId ?? typedJob.rider_user_id;
    if (effectiveRiderId) {
      void updateDriverStats(effectiveRiderId, jobId);
    }
  }

  platformBus.emit("ride:status_changed", {
    jobId,
    from: currentStatus,
    to: newStatus,
  }, "tracking");

  return { jobId, previousStatus: currentStatus, newStatus };
}

let dispatchSystemInitialized = false;

export function initDispatchSystem() {
  if (dispatchSystemInitialized) return;
  dispatchSystemInitialized = true;
  startSmartDispatchCron(5000);
}
