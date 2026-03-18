/**
 * Predictive dispatch — Pre-checkout driver matching and scoring.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createDispatchPrediction(params: {
  workspaceId?: string;
  contextType: "order" | "ride" | "marketplace_checkout";
  contextId: string;
  buyerId?: string;
  sellerId?: string;
  candidateDrivers?: Array<{
    driverId: string;
    distanceKm?: number;
    etaMinutes?: number;
    score?: number;
  }>;
  predictedFee?: number;
  predictedEtaMinutes?: number;
  confidence?: number;
  metadata?: Record<string, any>;
}) {
  const { data: job, error } = await supabase
    .from("dispatch_prediction_jobs")
    .insert({
      workspace_id: params.workspaceId ?? null,
      context_type: params.contextType,
      context_id: params.contextId,
      buyer_id: params.buyerId ?? null,
      seller_id: params.sellerId ?? null,
      predicted_driver_count: params.candidateDrivers?.length ?? 0,
      predicted_eta_minutes: params.predictedEtaMinutes ?? null,
      predicted_fee: params.predictedFee ?? null,
      confidence: params.confidence ?? null,
      status: "predicted",
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;

  if (params.candidateDrivers?.length) {
    const payload = params.candidateDrivers.map((d) => ({
      prediction_job_id: job.id,
      driver_id: d.driverId,
      distance_km: d.distanceKm ?? null,
      eta_minutes: d.etaMinutes ?? null,
      score: d.score ?? null,
      status: "candidate",
    }));

    const { error: candidateError } = await supabase
      .from("dispatch_candidate_drivers")
      .insert(payload);

    if (candidateError) throw candidateError;
  }

  return job;
}

export async function pingDispatchCandidates(predictionJobId: string) {
  const { data: candidates, error } = await supabase
    .from("dispatch_candidate_drivers")
    .select("*")
    .eq("prediction_job_id", predictionJobId)
    .order("score", { ascending: false });

  if (error) throw error;

  const topCandidates = (candidates ?? []).slice(0, 5);

  for (const driver of topCandidates) {
    await supabase
      .from("dispatch_candidate_drivers")
      .update({ status: "pinged" })
      .eq("id", driver.id);
  }

  await supabase
    .from("dispatch_prediction_jobs")
    .update({ status: "queued" })
    .eq("id", predictionJobId);

  return topCandidates;
}

export async function acceptDispatchCandidate(candidateId: string) {
  const { data: candidate, error } = await supabase
    .from("dispatch_candidate_drivers")
    .update({ status: "accepted" })
    .eq("id", candidateId)
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("dispatch_candidate_drivers")
    .update({ status: "rejected" })
    .eq("prediction_job_id", candidate.prediction_job_id)
    .neq("id", candidateId)
    .in("status", ["candidate", "pinged"]);

  await supabase
    .from("dispatch_prediction_jobs")
    .update({ status: "assigned" })
    .eq("id", candidate.prediction_job_id);

  return candidate;
}
