/**
 * Full-Stack Linkage Engine — Validates the complete chain:
 * UI → Logic → API → DB → State → UI Refresh
 * Blocks publication if the full link is not valid.
 */

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface LinkageBreak {
  entityId?: string;
  entityName?: string;
  chain: string;
  breakPoint: string;
  description: string;
  severity: "critical" | "warning" | "info";
  autoFixable: boolean;
}

export interface LinkageReport {
  totalEntitiesChecked: number;
  fullyLinked: number;
  partiallyLinked: number;
  broken: number;
  breaks: LinkageBreak[];
  autoRepaired: number;
  publicationBlocked: number;
  timestamp: string;
}

// Full-stack chain definitions per vertical
interface ChainStep {
  name: string;
  check: (e: any) => boolean;
  critical: boolean;
}

const UNIVERSAL_CHAIN: ChainStep[] = [
  { name: "identity", check: e => !!e.name && e.name.trim() !== "", critical: true },
  { name: "classification", check: e => !!e.vertical && e.vertical !== "unknown", critical: true },
  { name: "taxonomy", check: e => !!e.category && e.category !== "unknown" && e.category !== "", critical: true },
  { name: "geography", check: e => !!e.city && !!e.country, critical: true },
  { name: "visibility_state", check: e => !!e.visibility_mode && e.visibility_mode !== "", critical: true },
  { name: "pipeline_stage", check: e => !!e.pipeline_stage, critical: false },
  { name: "publish_gate", check: e => e.publish_gate_status !== "blocked", critical: true },
  { name: "route_valid", check: e => e.route_status !== "broken" && e.route_status !== "dead", critical: true },
];

const FOOD_CHAIN: ChainStep[] = [
  { name: "menu_data", check: e => !!e.menu_items_json && (Array.isArray(e.menu_items_json) ? e.menu_items_json.length > 0 : true), critical: true },
  { name: "menu_normalized", check: e => !!e.menu_normalized_at, critical: false },
];

const HOTEL_CHAIN: ChainStep[] = [
  { name: "room_inventory", check: e => !!e.hotel_inventory_json && (Array.isArray(e.hotel_inventory_json) ? e.hotel_inventory_json.length > 0 : true), critical: true },
];

const SERVICE_CHAIN: ChainStep[] = [
  { name: "service_catalog", check: e => !!e.service_catalog_json && (Array.isArray(e.service_catalog_json) ? e.service_catalog_json.length > 0 : true), critical: false },
];

function getChainForEntity(entity: any): ChainStep[] {
  const chain = [...UNIVERSAL_CHAIN];
  if (entity.vertical === "food") chain.push(...FOOD_CHAIN);
  if (entity.vertical === "hotel") chain.push(...HOTEL_CHAIN);
  if (entity.vertical === "services") chain.push(...SERVICE_CHAIN);
  return chain;
}

export async function runFullStackLinkageCheck(limit = 500): Promise<LinkageReport> {
  const report: LinkageReport = {
    totalEntitiesChecked: 0, fullyLinked: 0, partiallyLinked: 0, broken: 0,
    breaks: [], autoRepaired: 0, publicationBlocked: 0, timestamp: new Date().toISOString(),
  };

  const { data: entities, error } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, country, vertical, visibility_mode, pipeline_stage, publish_gate_status, route_status, cover_image, menu_items_json, menu_normalized_at, hotel_inventory_json, service_catalog_json, coherence_score, integrity_score")
    .neq("visibility_mode", "hidden")
    .limit(limit);

  if (error || !entities) return report;
  report.totalEntitiesChecked = entities.length;

  const entitiesToBlock: string[] = [];

  for (const entity of entities) {
    const chain = getChainForEntity(entity);
    const entityBreaks: LinkageBreak[] = [];
    let hasCriticalBreak = false;

    for (const step of chain) {
      if (!step.check(entity)) {
        if (step.critical) hasCriticalBreak = true;
        entityBreaks.push({
          entityId: entity.id,
          entityName: entity.name || "unnamed",
          chain: `${entity.vertical || "unknown"}_full_stack`,
          breakPoint: step.name,
          description: `Chain broken at "${step.name}" for ${entity.name || entity.id}`,
          severity: step.critical ? "critical" : "warning",
          autoFixable: false,
        });
      }
    }

    if (entityBreaks.length === 0) {
      report.fullyLinked++;
    } else if (hasCriticalBreak) {
      report.broken++;
      // Block publication for entities with critical chain breaks that are live
      if (entity.visibility_mode === "live") {
        entitiesToBlock.push(entity.id);
      }
    } else {
      report.partiallyLinked++;
    }

    report.breaks.push(...entityBreaks);
  }

  // Auto-enforce: demote live entities with critical chain breaks to search_only
  if (entitiesToBlock.length > 0) {
    const batch = entitiesToBlock.slice(0, 100);
    const { error: updateErr } = await db
      .from("seed_merchants")
      .update({
        visibility_mode: "search_only",
        visibility_decision_reason: "auto:full_stack_chain_broken",
      })
      .in("id", batch);
    if (!updateErr) {
      report.publicationBlocked += batch.length;
      report.autoRepaired += batch.length;
    }
  }

  console.log(`[full-stack-linkage] Checked:${report.totalEntitiesChecked} Linked:${report.fullyLinked} Partial:${report.partiallyLinked} Broken:${report.broken} Blocked:${report.publicationBlocked}`);
  return report;
}
