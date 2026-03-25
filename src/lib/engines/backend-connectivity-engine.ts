/**
 * Backend Connectivity Engine — Verifies every visible entity has a real, valid backend.
 * Detects orphaned entities, broken connections, missing critical data.
 */

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface ConnectivityIssue {
  entityId: string;
  entityName: string;
  type: "no_backend" | "orphan" | "missing_critical" | "broken_route" | "dead_connection";
  field?: string;
  description: string;
  severity: "critical" | "warning" | "info";
  autoFixable: boolean;
}

export interface ConnectivityReport {
  totalChecked: number;
  fullyConnected: number;
  partiallyConnected: number;
  dead: number;
  issues: ConnectivityIssue[];
  autoRepaired: number;
  blocked: number;
  unpublished: number;
  timestamp: string;
}

const CRITICAL_FIELDS = ["name", "category", "city", "country", "vertical", "visibility_mode"];
const QUALITY_FIELDS = ["cover_image", "description", "phone", "latitude", "longitude"];

export async function runBackendConnectivityCheck(limit = 500): Promise<ConnectivityReport> {
  const report: ConnectivityReport = {
    totalChecked: 0, fullyConnected: 0, partiallyConnected: 0, dead: 0,
    issues: [], autoRepaired: 0, blocked: 0, unpublished: 0, timestamp: new Date().toISOString(),
  };

  // Get all visible entities (live, search_only, coming_soon)
  const { data: entities, error } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, country, vertical, visibility_mode, cover_image, description, phone, latitude, longitude, pipeline_stage, publish_gate_status, route_status, coherence_score, integrity_score, menu_items_json, hotel_inventory_json, service_catalog_json")
    .in("visibility_mode", ["live", "search_only", "coming_soon"])
    .limit(limit);

  if (error || !entities) return report;
  report.totalChecked = entities.length;

  for (const entity of entities) {
    const issues: ConnectivityIssue[] = [];

    // 1. Check critical fields
    for (const field of CRITICAL_FIELDS) {
      if (!entity[field] || entity[field] === "" || entity[field] === "unknown") {
        issues.push({
          entityId: entity.id, entityName: entity.name || "unnamed",
          type: "missing_critical", field,
          description: `Missing critical field: ${field}`,
          severity: "critical", autoFixable: false,
        });
      }
    }

    // 2. Check quality fields (not critical but important)
    let qualityScore = 0;
    for (const field of QUALITY_FIELDS) {
      if (entity[field] && entity[field] !== "") qualityScore++;
    }

    // 3. Check vertical-specific content
    const v = entity.vertical;
    if (v === "food" && (!entity.menu_items_json || (Array.isArray(entity.menu_items_json) && entity.menu_items_json.length === 0))) {
      issues.push({
        entityId: entity.id, entityName: entity.name,
        type: "no_backend", field: "menu_items_json",
        description: "Food entity visible but has no menu data",
        severity: "critical", autoFixable: false,
      });
    }
    if (v === "hotel" && (!entity.hotel_inventory_json || (Array.isArray(entity.hotel_inventory_json) && entity.hotel_inventory_json.length === 0))) {
      issues.push({
        entityId: entity.id, entityName: entity.name,
        type: "no_backend", field: "hotel_inventory_json",
        description: "Hotel entity visible but has no room inventory",
        severity: "critical", autoFixable: false,
      });
    }
    if (v === "services" && (!entity.service_catalog_json || (Array.isArray(entity.service_catalog_json) && entity.service_catalog_json.length === 0))) {
      issues.push({
        entityId: entity.id, entityName: entity.name,
        type: "no_backend", field: "service_catalog_json",
        description: "Service entity visible but has no service catalog",
        severity: "warning", autoFixable: false,
      });
    }

    // 4. Check route status
    if (entity.route_status === "broken" || entity.route_status === "dead") {
      issues.push({
        entityId: entity.id, entityName: entity.name,
        type: "broken_route",
        description: `Entity has route_status=${entity.route_status} but is visible`,
        severity: "critical", autoFixable: true,
      });
    }

    // 5. Check publish gate
    if (entity.visibility_mode === "live" && entity.publish_gate_status === "blocked") {
      issues.push({
        entityId: entity.id, entityName: entity.name,
        type: "dead_connection",
        description: "Entity is live but publish gate is blocked",
        severity: "critical", autoFixable: true,
      });
    }

    // Classify
    const criticalIssues = issues.filter(i => i.severity === "critical");
    if (criticalIssues.length > 0) {
      report.dead++;
    } else if (qualityScore < 3 || issues.length > 0) {
      report.partiallyConnected++;
    } else {
      report.fullyConnected++;
    }

    report.issues.push(...issues);
  }

  // Auto-repair: unpublish entities with broken routes
  const brokenRouteIds = report.issues
    .filter(i => i.type === "broken_route" && i.autoFixable)
    .map(i => i.entityId);
  
  if (brokenRouteIds.length > 0) {
    const { error: updateErr } = await db
      .from("seed_merchants")
      .update({ visibility_mode: "hidden", unpublish_reason: "auto:broken_route", unpublished_at: new Date().toISOString() })
      .in("id", brokenRouteIds.slice(0, 50));
    if (!updateErr) {
      report.unpublished += Math.min(brokenRouteIds.length, 50);
      report.autoRepaired += Math.min(brokenRouteIds.length, 50);
    }
  }

  // Auto-repair: block entities that are live but gate-blocked
  const gateBlockedIds = report.issues
    .filter(i => i.type === "dead_connection" && i.autoFixable)
    .map(i => i.entityId);

  if (gateBlockedIds.length > 0) {
    const { error: updateErr } = await db
      .from("seed_merchants")
      .update({ visibility_mode: "hidden", unpublish_reason: "auto:gate_blocked_live", unpublished_at: new Date().toISOString() })
      .in("id", gateBlockedIds.slice(0, 50));
    if (!updateErr) {
      report.blocked += Math.min(gateBlockedIds.length, 50);
      report.autoRepaired += Math.min(gateBlockedIds.length, 50);
    }
  }

  console.log(`[backend-connectivity] Checked:${report.totalChecked} Full:${report.fullyConnected} Partial:${report.partiallyConnected} Dead:${report.dead} Repaired:${report.autoRepaired}`);
  return report;
}
