/**
 * RANKING BATCH RUNNER — Recomputes central ranking for candidates, seeds, merchants.
 * Persists results to current_ranking_state + ranking_snapshots.
 * Enforces coherence gate before allowing high visibility classes.
 */
import { supabase } from "@/integrations/supabase/client";
import { passesCoherenceGate } from "@/lib/engines/coherence-engine";
import {
  computeCentralRank,
  buildRankingInputFromCandidate,
  buildRankingInputFromSeed,
  type RankingResult,
} from "./central-ranking-engine";

async function persistRanking(
  entityId: string,
  entityType: string,
  input: ReturnType<typeof buildRankingInputFromCandidate>,
  result: RankingResult
) {
  // Upsert current state
  await (supabase as any).from("current_ranking_state").upsert({
    entity_id: entityId,
    entity_type: entityType,
    global_rank_score: result.globalRankScore,
    visibility_class: result.visibilityClass,
    claim_ready: result.claimReady,
    boost_ready: result.boostReady,
    ranking_reason_json: { penalties: result.penalties, reasons: result.reasons },
    updated_at: new Date().toISOString(),
  });

  // Append snapshot
  await (supabase as any).from("ranking_snapshots").insert({
    entity_id: entityId,
    entity_type: entityType,
    global_rank_score: result.globalRankScore,
    visibility_class: result.visibilityClass,
    data_quality_score: input.dataQualityScore,
    menu_quality_score: input.menuQualityScore,
    visual_quality_score: input.visualQualityScore,
    geo_confidence_score: input.geoConfidenceScore,
    taxonomy_confidence_score: input.taxonomyConfidenceScore,
    dedup_risk_score: input.dedupRiskScore,
    reputation_score: input.reputationScore,
    conversion_score: input.conversionScore,
    claim_readiness_score: input.claimReadinessScore,
    boost_readiness_score: input.boostReadinessScore,
    freshness_score: input.freshnessScore,
    ranking_reason_json: { penalties: result.penalties, reasons: result.reasons },
  });

  // Sync visibility to onboarding state
  await (supabase as any)
    .from("merchant_onboarding_state")
    .update({ visibility_status: result.visibilityClass })
    .eq("entity_id", entityId);
}

export async function rerankCandidates(limit = 500): Promise<number> {
  const { data: candidates } = await (supabase as any)
    .from("onboarding_shop_candidates")
    .select("*")
    .limit(limit);

  if (!candidates?.length) return 0;

  let updated = 0;
  for (const c of candidates) {
    const input = buildRankingInputFromCandidate(c);
    const result = computeCentralRank(input);
    await persistRanking(c.id, "candidate", input, result);
    updated++;
  }
  return updated;
}

export async function rerankSeeds(limit = 500): Promise<number> {
  const { data: seeds } = await (supabase as any)
    .from("seed_merchants")
    .select("*")
    .limit(limit);

  if (!seeds?.length) return 0;

  let updated = 0;
  for (const s of seeds) {
    const input = buildRankingInputFromSeed(s);
    const result = computeCentralRank(input);
    await persistRanking(s.id, "seed", input, result);
    updated++;
  }
  return updated;
}

export async function rerankAll(): Promise<{ candidates: number; seeds: number }> {
  const candidates = await rerankCandidates();
  const seeds = await rerankSeeds();
  return { candidates, seeds };
}
