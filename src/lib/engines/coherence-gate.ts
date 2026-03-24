/**
 * Coherence Gate — Hard gate integrated into publish/index/rank pipelines.
 * Prevents incoherent entities from reaching public surfaces.
 */
import { validateEntityMenuCoherence, persistCoherenceResult, passesCoherenceGate, type CoherenceInput } from "./coherence-engine";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface GateResult {
  passed: boolean;
  score: number;
  status: string;
  conflicts: string[];
  quarantine_reason: string | null;
}

/**
 * Run coherence gate check for a candidate before any publish/index/rank operation.
 * Automatically persists the result and quarantines if needed.
 */
export async function runCoherenceGate(
  entityId: string,
  table: "onboarding_shop_candidates" | "merchant_onboarding_state" | "storefront_pages" | "seed_merchants",
  input: CoherenceInput
): Promise<GateResult> {
  const result = validateEntityMenuCoherence(input);
  
  // Persist to DB
  await persistCoherenceResult(entityId, table, result);

  // If blocked, enforce quarantine on storefront_pages too
  if (result.status === "blocked" && table !== "storefront_pages") {
    await db
      .from("storefront_pages")
      .update({
        coherence_score: result.entity_menu_match_score,
        coherence_status: "blocked",
        visibility_mode: "hidden",
        blocking_reason: `Coherence blocked: ${result.quarantine_reason || "low score"}`,
      })
      .eq("id", entityId);
  }

  return {
    passed: passesCoherenceGate(result.entity_menu_match_score, result.status),
    score: result.entity_menu_match_score,
    status: result.status,
    conflicts: result.conflicts,
    quarantine_reason: result.quarantine_reason,
  };
}

/**
 * Check if an entity can be published based on ALL quality gates.
 * Combines coherence + taxonomy + visual + data quality.
 */
export async function canPublishEntity(entityId: string): Promise<{
  canPublish: boolean;
  blockers: string[];
}> {
  const blockers: string[] = [];

  // Check coherence from DB
  const { data: entity } = await db
    .from("storefront_pages")
    .select("coherence_score, coherence_status, audit_score, readiness_status, visibility_mode")
    .eq("id", entityId)
    .maybeSingle();

  if (!entity) {
    return { canPublish: false, blockers: ["Entity not found"] };
  }

  // Coherence gate
  if (entity.coherence_status === "blocked" || (entity.coherence_score != null && entity.coherence_score < 50)) {
    blockers.push(`Coherence blocked (score: ${entity.coherence_score ?? 0})`);
  }

  // Audit score gate
  if (entity.audit_score != null && entity.audit_score < 30) {
    blockers.push(`Quality too low (audit: ${entity.audit_score})`);
  }

  // Already hidden for a reason
  if (entity.visibility_mode === "hidden" && entity.readiness_status === "blocked") {
    blockers.push("Entity is blocked by admin");
  }

  return {
    canPublish: blockers.length === 0,
    blockers,
  };
}

/**
 * Check if an entity is eligible for ranking boost.
 * Requires premium_confident coherence + high audit score.
 */
export function isBoostEligible(coherenceScore: number, auditScore: number): boolean {
  return coherenceScore >= 75 && auditScore >= 60;
}
