/**
 * Entity State Healing Engine — Layer 3: Mechanics
 * Heals incoherent entity states: pipeline vs visibility, gate vs mode, etc.
 * Ensures every entity has a coherent, valid lifecycle state.
 */
import { supabase } from "@/integrations/supabase/client";
import { createReviewEntry } from "@/lib/admin/review-queue";

const db = supabase as any;

export interface StateHealAction {
  entityId: string;
  entityName: string;
  healType: "state_fix" | "unpublish" | "promote" | "review";
  field: string;
  from: any;
  to: any;
  reason: string;
}

export interface StateHealReport {
  totalScanned: number;
  healed: number;
  unpublished: number;
  promoted: number;
  sentToReview: number;
  actions: StateHealAction[];
  timestamp: string;
}

export async function runEntityStateHealing(limit = 300): Promise<StateHealReport> {
  const report: StateHealReport = {
    totalScanned: 0, healed: 0, unpublished: 0, promoted: 0, sentToReview: 0,
    actions: [], timestamp: new Date().toISOString(),
  };

  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, name, visibility_mode, pipeline_stage, publish_gate_status, vertical, category, visibility_score, coherence_score, integrity_score, route_status")
    .neq("visibility_mode", "hidden")
    .limit(limit);

  if (!entities) return report;
  report.totalScanned = entities.length;

  for (const e of entities) {
    const fixes: Record<string, any> = {};
    
    // ── HEAL: live but pipeline not ready ──
    if (e.visibility_mode === "live" && e.pipeline_stage && !["gated", "ready", "active"].includes(e.pipeline_stage)) {
      fixes.visibility_mode = "search_only";
      fixes.visibility_decision_reason = "auto:pipeline_not_ready";
      report.actions.push({ entityId: e.id, entityName: e.name, healType: "state_fix", field: "visibility_mode", from: "live", to: "search_only", reason: `Pipeline stage "${e.pipeline_stage}" not ready for live` });
      report.healed++;
    }

    // ── HEAL: gate blocked but somehow visible as live ──
    if (e.visibility_mode === "live" && e.publish_gate_status === "blocked") {
      fixes.visibility_mode = "search_only";
      fixes.visibility_decision_reason = "auto:gate_blocked";
      report.actions.push({ entityId: e.id, entityName: e.name, healType: "unpublish", field: "visibility_mode", from: "live", to: "search_only", reason: "Gate blocked but was live" });
      report.unpublished++;
    }

    // ── HEAL: route broken but visible ──
    if (e.route_status === "broken" && ["live", "search_only"].includes(e.visibility_mode)) {
      fixes.visibility_mode = "hidden";
      fixes.unpublish_reason = "auto:route_broken";
      fixes.unpublished_at = new Date().toISOString();
      report.actions.push({ entityId: e.id, entityName: e.name, healType: "unpublish", field: "visibility_mode", from: e.visibility_mode, to: "hidden", reason: "Route broken — hidden" });
      report.unpublished++;
    }

    // ── PROMOTE: search_only with good scores → could be live ──
    if (e.visibility_mode === "search_only" && e.visibility_score >= 70 && e.publish_gate_status === "passed" && (!e.pipeline_stage || ["gated", "ready", "active"].includes(e.pipeline_stage)) && e.route_status !== "broken") {
      // Don't auto-promote to live — send to review for human approval
      await createReviewEntry({
        entityType: "seed_merchants", entityId: e.id,
        approvalType: "promotion_candidate", reason: `Score ${e.visibility_score}, gate passed — candidate for live`, priority: "medium",
        payload: { name: e.name, visibility_score: e.visibility_score },
      });
      report.actions.push({ entityId: e.id, entityName: e.name, healType: "review", field: "visibility_mode", from: "search_only", to: "live?", reason: "High score — promotion candidate" });
      report.sentToReview++;
    }

    // ── HEAL: no vertical but has category ──
    if ((!e.vertical || e.vertical === "unknown") && e.category) {
      const verticalMap: Record<string, string> = {
        restaurant: "food", cafe: "food", bakery: "food", pizzeria: "food",
        hotel: "hotel", hostel: "hotel", resort: "hotel",
        cleaning: "services", spa: "services", salon: "services",
        grocery: "grocery", supermarket: "grocery",
      };
      const inferred = verticalMap[e.category.toLowerCase()];
      if (inferred) {
        fixes.vertical = inferred;
        fixes.vertical_confidence = 0.7;
        report.actions.push({ entityId: e.id, entityName: e.name, healType: "state_fix", field: "vertical", from: e.vertical, to: inferred, reason: `Inferred from category "${e.category}"` });
        report.healed++;
      }
    }

    if (Object.keys(fixes).length > 0) {
      await db.from("seed_merchants").update(fixes).eq("id", e.id).catch(() => {});
    }
  }

  console.log(`[entity-state-healing] Scanned:${report.totalScanned} Healed:${report.healed} Unpublished:${report.unpublished} Review:${report.sentToReview}`);
  return report;
}
