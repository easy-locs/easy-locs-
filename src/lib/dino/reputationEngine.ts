/**
 * DINO V20 — Universal Reputation Engine
 * Cross-service trust scoring: fulfillment, disputes, speed, consistency, feedback.
 * 
 * SCHEMA NOTES:
 *  - reviews: has `reviewer_user_id` (NOT `user_id`)
 *  - support_tickets: has `requester_user_id` (NOT `user_id`)
 *  - orders: has `customer_user_id`
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ReputationFactors {
  fulfillmentQuality: number;
  disputeRate: number;
  responseSpeed: number;
  consistency: number;
  feedbackScore: number;
  totalInteractions: number;
}

const WEIGHTS = {
  fulfillment: 0.30,
  disputes: 0.20,
  speed: 0.15,
  consistency: 0.15,
  feedback: 0.20,
};

/** Compute overall reputation score from individual factors (0-100) */
export function computeOverallScore(f: ReputationFactors): number {
  const disputePenalty = Math.max(0, 100 - f.disputeRate * 100);
  const raw =
    f.fulfillmentQuality * WEIGHTS.fulfillment +
    disputePenalty * WEIGHTS.disputes +
    f.responseSpeed * WEIGHTS.speed +
    f.consistency * WEIGHTS.consistency +
    f.feedbackScore * WEIGHTS.feedback;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

/** Gather reputation signals from all services for a user */
export async function gatherReputationFactors(userId: string): Promise<ReputationFactors> {
  const [ordersRes, disputesRes, reviewsRes, driverRes] = await Promise.all([
    supabase.from("orders").select("id, status").eq("customer_user_id", userId).limit(500),
    supabase.from("support_tickets").select("id").eq("requester_user_id", userId).eq("ticket_type", "dispute"),
    supabase.from("reviews").select("rating").eq("reviewer_user_id", userId).limit(200),
    supabase.from("driver_profiles").select("acceptance_rate, jobs_completed, reliability_score").eq("user_id", userId).maybeSingle(),
  ]);

  const orders = ordersRes.data ?? [];
  const totalOrders = orders.length || 1;
  const completedOrders = orders.filter(o => o.status === "delivered" || o.status === "completed").length;
  const disputes = disputesRes.data?.length ?? 0;
  const reviews = reviewsRes.data ?? [];

  // Fulfillment quality: % of orders completed successfully
  const fulfillmentQuality = (completedOrders / totalOrders) * 100;

  // Dispute rate: fraction of interactions that became disputes
  const disputeRate = totalOrders > 0 ? disputes / totalOrders : 0;

  // Response speed proxy: driver acceptance rate or default
  const responseSpeed = driverRes.data?.acceptance_rate ?? 70;

  // Consistency: driver reliability score or derived from orders
  const driverJobs = driverRes.data?.jobs_completed ?? 0;
  const consistency = driverRes.data?.reliability_score
    ? driverRes.data.reliability_score
    : (completedOrders > 0 ? (completedOrders / totalOrders) * 100 : 70);

  // Feedback: average review rating normalized to 0-100
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.rating ?? 3), 0) / reviews.length
    : 3;
  const feedbackScore = (avgRating / 5) * 100;

  return {
    fulfillmentQuality,
    disputeRate,
    responseSpeed,
    consistency,
    feedbackScore,
    totalInteractions: totalOrders + (driverRes.data?.completed_deliveries ?? 0),
  };
}

/** Recompute and persist reputation for a user */
export async function recomputeReputation(userId: string) {
  const factors = await gatherReputationFactors(userId);
  const overall = computeOverallScore(factors);

  const payload = {
    user_id: userId,
    overall_score: overall,
    fulfillment_quality: Math.round(factors.fulfillmentQuality),
    dispute_rate: Math.round(factors.disputeRate * 100),
    response_speed: Math.round(factors.responseSpeed),
    consistency: Math.round(factors.consistency),
    feedback_score: Math.round(factors.feedbackScore),
    total_interactions: factors.totalInteractions,
    last_computed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("universal_reputation_scores")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;

  // Log learning event
  await supabase.from("dino_learning_events").insert({
    event_type: "reputation_recomputed",
    entity_id: userId,
    entity_type: "user",
    metric: "overall_score",
    new_value: overall,
    previous_value: 0,
  });

  return data;
}

/** Apply reputation effects: downgrade bad actors, boost top performers */
export async function applyReputationEffects(userId: string, score: number) {
  if (score < 25) {
    await supabase.from("admin_alerts").insert({
      alert_type: "low_reputation",
      severity: "high",
      status: "open",
      title: `User ${userId.slice(0, 8)} reputation critically low (${score})`,
      entity_id: userId,
      entity_type: "user",
    });
  }

  if (score >= 85) {
    await supabase.from("dino_learning_events").insert({
      event_type: "reputation_boost",
      entity_id: userId,
      entity_type: "user",
      metric: "trust_boost",
      new_value: score,
      previous_value: 0,
    });
  }
}
