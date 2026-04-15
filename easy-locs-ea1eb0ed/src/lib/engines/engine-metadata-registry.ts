/**
 * Engine Metadata Registry — Business tier, function, vertical, table dependencies.
 * Source of truth for cockpit display, collision detection, and BRAIN OWNERSHIP.
 *
 * GOVERNANCE LAW:
 * - Every engine has exactly ONE brain owner
 * - Brains DECIDE. Engines EXECUTE/ENRICH.
 * - No engine may act as an independent final decision-maker
 *
 * ALIGNMENT RULE:
 * - Every key in ENGINE_METADATA MUST correspond to an engine registered and
 *   started in registerAllEngines() (src/engines/engine-registry.ts).
 * - A DEV-mode invariant check enforces this at boot (see engine-registry.ts).
 *
 * COLLISION PRIORITY RULES (seed_merchants):
 * - visibility_mode: auto-publish > auto-unpublish > full-stack-linkage > backend-reconnect
 *     auto-publish has final say on publishing; auto-unpublish can hide;
 *     full-stack-linkage & backend-reconnect block on broken links.
 * - pipeline_stage:  publish-gate-food > publish-gate-grocery > publish-gate-service >
 *                    food-menu-normalizer > grocery-normalizer > service-catalog-normalizer > menu-rebuild
 *     Publish gates set final stage; normalizers set intermediate stages.
 * - gate_status:     publish-gate-food / publish-gate-grocery / publish-gate-service (vertical-exclusive, no overlap)
 * - category/subcategory: adaptive-taxonomy > category-mapping-sync
 *     adaptive-taxonomy is the primary classifier; category-mapping-sync syncs downstream.
 * - status (seed_merchants): auto-fix is the sole writer.
 * - menu_items_json: food-menu-normalizer > grocery-normalizer > menu-rebuild
 *     food-menu-normalizer owns food vertical; grocery-normalizer owns grocery; menu-rebuild handles rebuilds.
 * - trust_score: data-trust-scan is the sole writer.
 */

export type EngineTier = "critical" | "priority" | "standard" | "optimizable";
export type BusinessFunction = "onboarding" | "taxonomy" | "visibility" | "conversion" | "lifecycle" | "finance" | "delivery" | "infrastructure";
export type EngineVertical = "all" | "food" | "hotel" | "services" | "grocery" | "property";
export type RuntimeStatus = "ok" | "idle" | "warning" | "error" | "pending";
export type BrainOwner = "geo" | "execution" | "category" | "arbitration" | "experience";

export interface EngineMetadata {
  tier: EngineTier;
  businessFn: BusinessFunction;
  vertical: EngineVertical;
  canRunIdle: boolean;
  tablesWritten: string[];
  fieldsWritten: string[];
  description: string;
  /** Which brain owns this engine's output */
  brainOwner: BrainOwner;
}

export interface EngineRunResult {
  status: RuntimeStatus;
  itemsProcessed: number;
  rowsAffected: number;
  businessImpact: string;
  summary: string;
  durationMs?: number;
}

/** Map engine name → metadata for cockpit and collision detection */
export const ENGINE_METADATA: Record<string, EngineMetadata> = {
  "repair-engine": {
    tier: "critical",
    businessFn: "infrastructure",
    vertical: "all",
    canRunIdle: true,
    tablesWritten: ["seed_merchants"],
    fieldsWritten: ["status", "visibility_mode", "visibility_decision_reason"],
    description: "Consolidated self-healing: auto-fix, backend connectivity, full-stack linkage, sync repair, stale cache, realtime health",
    brainOwner: "execution",
  },
  "learning-engine": {
    tier: "standard",
    businessFn: "conversion",
    vertical: "all",
    canRunIdle: true,
    tablesWritten: [],
    fieldsWritten: [],
    description: "Consolidated analytics & recommendations: page views, session tracking, recommendation scoring",
    brainOwner: "experience",
  },
  "taxonomy-engine": {
    tier: "critical",
    businessFn: "taxonomy",
    vertical: "all",
    canRunIdle: false,
    tablesWritten: ["seed_merchants"],
    fieldsWritten: ["category", "subcategory", "menu_items_json", "menu_normalized_at", "pipeline_stage", "service_catalog_json", "menu_rebuild_score", "menu_quality_score", "menu_quality_flag"],
    description: "Consolidated taxonomy: adaptive taxonomy, category mapping, normalizers (food/grocery/service), menu rebuild, runtime corrections",
    brainOwner: "category",
  },
  "ui-correction-engine": {
    tier: "priority",
    businessFn: "infrastructure",
    vertical: "all",
    canRunIdle: true,
    tablesWritten: [],
    fieldsWritten: [],
    description: "Consolidated UI quality: media relevance, text integrity, page-open reliability, search hygiene, dashboard cards",
    brainOwner: "experience",
  },
  "flow-integrity-engine": {
    tier: "critical",
    businessFn: "visibility",
    vertical: "all",
    canRunIdle: false,
    tablesWritten: ["seed_merchants"],
    fieldsWritten: ["gate_status", "pipeline_stage", "visibility_mode", "trust_score", "quality_score"],
    description: "Consolidated governance: flow integrity, governance audit, publish gates, auto-publish/unpublish, data trust & completeness",
    brainOwner: "arbitration",
  },
  "fraud-detection-engine": {
    tier: "critical",
    businessFn: "infrastructure",
    vertical: "all",
    canRunIdle: true,
    tablesWritten: [],
    fieldsWritten: [],
    description: "Consolidated security: unread integrity, sentinel conflict/validation/invariant scanning, security enforcement",
    brainOwner: "execution",
  },
};

/** Detect table/field collisions between engines */
export interface CollisionReport {
  table: string;
  field: string;
  engines: string[];
}

export function detectEngineCollisions(): CollisionReport[] {
  const fieldMap: Record<string, string[]> = {};

  for (const [name, meta] of Object.entries(ENGINE_METADATA)) {
    for (const table of meta.tablesWritten) {
      for (const field of meta.fieldsWritten) {
        const key = `${table}.${field}`;
        if (!fieldMap[key]) fieldMap[key] = [];
        fieldMap[key].push(name);
      }
    }
  }

  return Object.entries(fieldMap)
    .filter(([, engines]) => engines.length > 1)
    .map(([key, engines]) => {
      const [table, field] = key.split(".");
      return { table, field, engines };
    });
}

/** Get engines by business function */
export function getEnginesByFunction(fn: BusinessFunction): string[] {
  return Object.entries(ENGINE_METADATA)
    .filter(([, m]) => m.businessFn === fn)
    .map(([name]) => name);
}

/** Get engines by tier */
export function getEnginesByTier(tier: EngineTier): string[] {
  return Object.entries(ENGINE_METADATA)
    .filter(([, m]) => m.tier === tier)
    .map(([name]) => name);
}

/** Get engines by brain owner */
export function getEnginesByBrain(brain: BrainOwner): string[] {
  return Object.entries(ENGINE_METADATA)
    .filter(([, m]) => m.brainOwner === brain)
    .map(([name]) => name);
}

/** Get brain ownership summary */
export function getBrainOwnershipSummary(): Record<BrainOwner, string[]> {
  const result: Record<BrainOwner, string[]> = { geo: [], execution: [], category: [], arbitration: [], experience: [] };
  for (const [name, meta] of Object.entries(ENGINE_METADATA)) {
    result[meta.brainOwner].push(name);
  }
  return result;
}
