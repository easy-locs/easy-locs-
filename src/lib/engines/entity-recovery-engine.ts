/**
 * Entity Recovery Engine — Diagnoses hidden entities and auto-fixes where safe.
 * Runs on seeds/candidates that are stuck in "hidden" visibility.
 */
import { supabase } from "@/integrations/supabase/client";
import { runShopQualityCheck, type ShopQualityResult } from "./shop-quality-engine";
import { passesCoherenceGate } from "./coherence-engine";

const db = supabase as any;

export interface RecoveryDiagnosis {
  entityId: string;
  entityName: string;
  currentVisibility: string;
  currentRankScore: number;
  qualityResult: ShopQualityResult;
  blockingReasons: string[];
  recoveryActions: string[];
  newVisibilityClass: string | null;
  recovered: boolean;
}

/**
 * Diagnose why an entity is hidden and determine if it can be recovered.
 */
export function diagnoseEntity(
  entity: Record<string, any>,
  rankingState: Record<string, any> | null
): RecoveryDiagnosis {
  const quality = runShopQualityCheck(entity);
  const blockingReasons: string[] = [];
  const recoveryActions: string[] = [];

  // Parse penalties from ranking
  const penalties: string[] = rankingState?.ranking_reason_json?.penalties ?? [];

  // Check each blocking reason
  if (penalties.includes("missing_geo")) {
    if (entity.latitude && entity.longitude) {
      recoveryActions.push("geo_already_present_rerank");
    } else if (entity.area || entity.city) {
      blockingReasons.push("missing_geo_coordinates");
      recoveryActions.push("geocode_from_area");
    } else {
      blockingReasons.push("no_geo_data_at_all");
    }
  }

  if (penalties.includes("missing_logo")) {
    if (entity.logo_url || entity.logo_image) {
      recoveryActions.push("logo_already_present_rerank");
    } else {
      blockingReasons.push("no_logo");
      recoveryActions.push("needs_logo_assignment");
    }
  }

  if (penalties.includes("missing_cover")) {
    if (entity.cover_url || entity.cover_image) {
      recoveryActions.push("cover_already_present_rerank");
    } else {
      blockingReasons.push("no_cover");
      recoveryActions.push("needs_cover_assignment");
    }
  }

  if (penalties.includes("Blocked by coherence gate")) {
    // Most entities have coherence_status = "pending" which incorrectly blocks
    const coherenceScore = entity.coherence_score ?? 0;
    const coherenceStatus = entity.coherence_status ?? "pending";

    if (coherenceStatus === "pending") {
      // Never actually checked — run quality check to determine real status
      if (quality.coherence.status !== "blocked") {
        recoveryActions.push("coherence_status_was_pending_now_ok");
      } else {
        blockingReasons.push("coherence_truly_blocked");
      }
    } else if (coherenceStatus === "blocked") {
      blockingReasons.push("coherence_blocked");
    }
  }

  if (penalties.includes("weak_taxonomy")) {
    if (entity.subcategory) {
      recoveryActions.push("taxonomy_has_subcategory_rerank");
    } else {
      blockingReasons.push("weak_taxonomy");
    }
  }

  // Determine if entity can be recovered (promoted from hidden)
  const canRecover =
    quality.qualityClass !== "blocked" &&
    quality.globalQualityScore >= 30 &&
    blockingReasons.filter(r => !r.includes("logo") && !r.includes("cover")).length === 0;

  // Determine new visibility class based on quality
  let newVisibilityClass: string | null = null;
  if (canRecover) {
    if (quality.globalQualityScore >= 70) newVisibilityClass = "ready_for_claim";
    else if (quality.globalQualityScore >= 55) newVisibilityClass = "public_seed";
    else if (quality.globalQualityScore >= 35) newVisibilityClass = "indexed_not_public";
  }

  return {
    entityId: entity.id,
    entityName: entity.name ?? "Unknown",
    currentVisibility: rankingState?.visibility_class ?? "hidden",
    currentRankScore: rankingState?.global_rank_score ?? 0,
    qualityResult: quality,
    blockingReasons,
    recoveryActions,
    newVisibilityClass,
    recovered: !!newVisibilityClass,
  };
}

/**
 * Run recovery on all hidden seed merchants.
 * Returns summary of what was recovered.
 */
export async function recoverHiddenEntities(limit = 500): Promise<{
  total: number;
  recovered: number;
  stillBlocked: number;
  diagnoses: RecoveryDiagnosis[];
}> {
  // Get hidden entities from ranking state
  const { data: hiddenRankings } = await db
    .from("current_ranking_state")
    .select("entity_id, global_rank_score, visibility_class, ranking_reason_json")
    .eq("visibility_class", "hidden")
    .limit(limit);

  if (!hiddenRankings?.length) {
    return { total: 0, recovered: 0, stillBlocked: 0, diagnoses: [] };
  }

  // Get corresponding seed merchants
  const entityIds = hiddenRankings.map((r: any) => r.entity_id);
  const { data: seeds } = await db
    .from("seed_merchants")
    .select("*")
    .in("id", entityIds);

  const seedMap = new Map((seeds ?? []).map((s: any) => [s.id, s]));
  const rankMap = new Map(hiddenRankings.map((r: any) => [r.entity_id, r]));

  const diagnoses: RecoveryDiagnosis[] = [];
  let recovered = 0;

  for (const ranking of hiddenRankings) {
    const entity = seedMap.get(ranking.entity_id);
    if (!entity) continue;

    const diagnosis = diagnoseEntity(entity, ranking);
    diagnoses.push(diagnosis);

    if (diagnosis.recovered && diagnosis.newVisibilityClass) {
      // Update ranking state
      await db
        .from("current_ranking_state")
        .update({
          visibility_class: diagnosis.newVisibilityClass,
          updated_at: new Date().toISOString(),
          ranking_reason_json: {
            ...ranking.ranking_reason_json,
            recovery_applied: true,
            recovery_actions: diagnosis.recoveryActions,
            new_quality_score: diagnosis.qualityResult.globalQualityScore,
          },
        })
        .eq("entity_id", ranking.entity_id);

      // Update coherence status if it was pending
      const ent = entity as Record<string, any>;
      if (ent.coherence_status === "pending" || !ent.coherence_status) {
        await db
          .from("seed_merchants")
          .update({
            coherence_status: diagnosis.qualityResult.coherence.status === "blocked" ? "blocked" : "publishable",
            coherence_score: diagnosis.qualityResult.coherence.entity_menu_match_score,
          })
          .eq("id", ent.id);
      }

      recovered++;
    }
  }

  return {
    total: hiddenRankings.length,
    recovered,
    stillBlocked: hiddenRankings.length - recovered,
    diagnoses,
  };
}
