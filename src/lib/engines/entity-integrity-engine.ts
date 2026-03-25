/**
 * Entity Integrity Engine — Validates each entity has all required fields,
 * coherent state, and a functional journey.
 */

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface IntegrityIssue {
  entityId: string;
  entityName: string;
  check: string;
  description: string;
  severity: "critical" | "warning" | "info";
  autoFixable: boolean;
}

export interface IntegrityReport {
  totalChecked: number;
  passed: number;
  failed: number;
  issues: IntegrityIssue[];
  autoRepaired: number;
  timestamp: string;
}

interface IntegrityCheck {
  name: string;
  severity: "critical" | "warning" | "info";
  autoFixable: boolean;
  test: (e: any) => string | null; // returns null if passed, error message if failed
}

const CHECKS: IntegrityCheck[] = [
  { name: "has_name", severity: "critical", autoFixable: false, test: e => (!e.name || e.name.trim() === "") ? "Entity has no name" : null },
  { name: "has_category", severity: "critical", autoFixable: false, test: e => (!e.category || e.category === "unknown" || e.category === "") ? "Entity has no valid category" : null },
  { name: "has_vertical", severity: "critical", autoFixable: false, test: e => (!e.vertical || e.vertical === "unknown") ? "Entity has no vertical classification" : null },
  { name: "has_city", severity: "warning", autoFixable: false, test: e => (!e.city || e.city === "") ? "Entity has no city" : null },
  { name: "has_country", severity: "warning", autoFixable: false, test: e => (!e.country || e.country === "") ? "Entity has no country" : null },
  { name: "has_cover", severity: "warning", autoFixable: false, test: e => (!e.cover_image || e.cover_image === "") ? "Entity has no cover image" : null },
  { name: "has_geolocation", severity: "info", autoFixable: false, test: e => (!e.latitude || !e.longitude) ? "Entity has no geolocation" : null },
  { name: "coherence_ok", severity: "warning", autoFixable: false, test: e => (e.coherence_score !== null && e.coherence_score < 30) ? `Low coherence score: ${e.coherence_score}` : null },
  { name: "integrity_ok", severity: "warning", autoFixable: false, test: e => (e.integrity_score !== null && e.integrity_score < 30) ? `Low integrity score: ${e.integrity_score}` : null },
  { name: "visibility_coherent", severity: "critical", autoFixable: true, test: e => {
    if (e.visibility_mode === "live" && e.pipeline_stage && !["gated", "ready", "active"].includes(e.pipeline_stage)) {
      return `Entity live but pipeline_stage=${e.pipeline_stage}`;
    }
    return null;
  }},
  { name: "food_has_menu", severity: "critical", autoFixable: false, test: e => {
    if (e.vertical !== "food") return null;
    if (!e.menu_items_json || (Array.isArray(e.menu_items_json) && e.menu_items_json.length === 0)) return "Food entity without menu";
    return null;
  }},
  { name: "subcategory_valid", severity: "warning", autoFixable: false, test: e => (!e.subcategory || e.subcategory === "unknown" || e.subcategory === "") ? "Entity has no subcategory" : null },
];

export async function runEntityIntegrityCheck(limit = 500): Promise<IntegrityReport> {
  const report: IntegrityReport = {
    totalChecked: 0, passed: 0, failed: 0, issues: [], autoRepaired: 0, timestamp: new Date().toISOString(),
  };

  const { data: entities, error } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, country, vertical, visibility_mode, cover_image, description, phone, latitude, longitude, pipeline_stage, coherence_score, integrity_score, menu_items_json, publish_gate_status")
    .neq("visibility_mode", "hidden")
    .limit(limit);

  if (error || !entities) return report;
  report.totalChecked = entities.length;

  for (const entity of entities) {
    let hasFailed = false;
    for (const check of CHECKS) {
      const result = check.test(entity);
      if (result) {
        hasFailed = true;
        report.issues.push({
          entityId: entity.id,
          entityName: entity.name || "unnamed",
          check: check.name,
          description: result,
          severity: check.severity,
          autoFixable: check.autoFixable,
        });
      }
    }
    if (hasFailed) report.failed++;
    else report.passed++;
  }

  // Auto-fix: entities that are live but have wrong pipeline_stage
  const stageFixIds = report.issues
    .filter(i => i.check === "visibility_coherent" && i.autoFixable)
    .map(i => i.entityId);

  if (stageFixIds.length > 0) {
    await db.from("seed_merchants")
      .update({ visibility_mode: "search_only", visibility_decision_reason: "auto:pipeline_stage_mismatch" })
      .in("id", stageFixIds.slice(0, 50))
      .catch(() => {});
    report.autoRepaired += Math.min(stageFixIds.length, 50);
  }

  console.log(`[entity-integrity] Checked:${report.totalChecked} Passed:${report.passed} Failed:${report.failed} Repaired:${report.autoRepaired}`);
  return report;
}
