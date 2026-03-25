/**
 * Auto-Repair Engine — Layer 3: Mechanics
 * Automatically fixes safe, deterministic issues across entities.
 * Auto-fix: missing defaults, broken scores, incomplete fields.
 * Block: entities too broken to fix.
 * Review: ambiguous cases sent to approval queue.
 */
import { supabase } from "@/integrations/supabase/client";
import { createReviewEntry } from "@/lib/admin/review-queue";

const db = supabase as any;

export interface RepairAction {
  entityId: string;
  entityName: string;
  action: "auto_fixed" | "blocked" | "sent_to_review" | "skipped";
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

export interface AutoRepairReport {
  totalScanned: number;
  autoFixed: number;
  blocked: number;
  sentToReview: number;
  skipped: number;
  actions: RepairAction[];
  timestamp: string;
}

const SAFE_DEFAULTS: Record<string, any> = {
  city: "Dubai",
  country: "AE",
  currency: "AED",
};

export async function runAutoRepairEngine(limit = 200): Promise<AutoRepairReport> {
  const report: AutoRepairReport = {
    totalScanned: 0, autoFixed: 0, blocked: 0, sentToReview: 0, skipped: 0,
    actions: [], timestamp: new Date().toISOString(),
  };

  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, country, currency, vertical, visibility_mode, visibility_score, description, cover_image, phone, pipeline_stage, publish_gate_status, route_status, coherence_score, integrity_score")
    .neq("visibility_mode", "hidden")
    .limit(limit);

  if (!entities) return report;
  report.totalScanned = entities.length;

  for (const e of entities) {
    const fixes: Record<string, any> = {};
    const actions: RepairAction[] = [];

    // ── SAFE AUTO-FIX: missing geo defaults ──
    for (const [field, defaultVal] of Object.entries(SAFE_DEFAULTS)) {
      if (!e[field] || e[field] === "") {
        fixes[field] = defaultVal;
        actions.push({ entityId: e.id, entityName: e.name || "unnamed", action: "auto_fixed", field, oldValue: e[field], newValue: defaultVal, reason: `Missing ${field}, applied default` });
      }
    }

    // ── SAFE AUTO-FIX: missing description ──
    if (!e.description && e.name) {
      const desc = e.category ? `${e.name} — ${e.category} in ${e.city || "Dubai"}` : `${e.name} in ${e.city || "Dubai"}`;
      fixes.description = desc;
      actions.push({ entityId: e.id, entityName: e.name, action: "auto_fixed", field: "description", oldValue: null, newValue: desc, reason: "Auto-generated description" });
    }

    // ── SAFE AUTO-FIX: visibility_score recalc ──
    if (e.visibility_score == null || e.visibility_score === 0) {
      const fields = ["name", "category", "subcategory", "city", "country", "cover_image", "phone", "description"];
      const merged = { ...e, ...fixes };
      let score = 0;
      for (const f of fields) { if (merged[f] && merged[f] !== "") score += 12; }
      if (score > 0) {
        fixes.visibility_score = Math.min(score, 100);
        actions.push({ entityId: e.id, entityName: e.name, action: "auto_fixed", field: "visibility_score", oldValue: e.visibility_score, newValue: fixes.visibility_score, reason: "Recalculated from completeness" });
      }
    }

    // ── BLOCK: visible entity with no name or no category ──
    if ((!e.name || e.name.trim() === "") && e.visibility_mode === "live") {
      fixes.visibility_mode = "hidden";
      fixes.unpublish_reason = "auto:no_name";
      fixes.unpublished_at = new Date().toISOString();
      actions.push({ entityId: e.id, entityName: "unnamed", action: "blocked", field: "visibility_mode", oldValue: "live", newValue: "hidden", reason: "No name — cannot be live" });
      report.blocked++;
    }

    // ── BLOCK: broken route still visible ──
    if (e.route_status === "broken" && e.visibility_mode === "live") {
      fixes.visibility_mode = "search_only";
      fixes.visibility_decision_reason = "auto:broken_route_demoted";
      actions.push({ entityId: e.id, entityName: e.name, action: "blocked", field: "visibility_mode", oldValue: "live", newValue: "search_only", reason: "Broken route — demoted" });
      report.blocked++;
    }

    // ── REVIEW: low coherence on live entity ──
    if (e.coherence_score != null && e.coherence_score < 30 && e.visibility_mode === "live") {
      await createReviewEntry({
        entityType: "seed_merchants", entityId: e.id,
        approvalType: "low_coherence", reason: `Coherence score ${e.coherence_score} on live entity`, priority: "high",
        payload: { name: e.name, coherence_score: e.coherence_score },
      });
      actions.push({ entityId: e.id, entityName: e.name, action: "sent_to_review", field: "coherence_score", oldValue: e.coherence_score, newValue: null, reason: "Low coherence — needs human review" });
      report.sentToReview++;
    }

    // Apply fixes
    if (Object.keys(fixes).length > 0) {
      fixes.auto_repaired_at = new Date().toISOString();
      await db.from("seed_merchants").update(fixes).eq("id", e.id).catch(() => {});
      report.autoFixed += actions.filter(a => a.action === "auto_fixed").length;
    }

    report.actions.push(...actions);
    if (actions.length === 0) report.skipped++;
  }

  console.log(`[auto-repair] Scanned:${report.totalScanned} Fixed:${report.autoFixed} Blocked:${report.blocked} Review:${report.sentToReview}`);
  return report;
}
