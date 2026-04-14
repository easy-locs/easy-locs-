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
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INFRASTRUCTURE — Brain Owner: execution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "auto-fix":              { tier: "priority",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: ["seed_merchants"],   fieldsWritten: ["status"],                                       description: "Auto-corrects common data issues",                     brainOwner: "execution" },
  "backend-reconnect":     { tier: "critical",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Reconnects failed backend services",                   brainOwner: "execution" },
  "full-stack-linkage":    { tier: "critical",    businessFn: "visibility",     vertical: "all",      canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode", "visibility_decision_reason"], description: "Validates UI→Logic→API→DB→State chain, blocks broken", brainOwner: "execution" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUALITY / DATA — Brain Owner: arbitration or category
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "data-trust-scan":       { tier: "priority",    businessFn: "taxonomy",       vertical: "all",      canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["trust_score"],                                   description: "Calculates trust scores",                              brainOwner: "arbitration" },
  "data-completeness":     { tier: "priority",    businessFn: "onboarding",     vertical: "all",      canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                               description: "Scans data completeness",                              brainOwner: "category" },
  "data-quality":          { tier: "priority",    businessFn: "taxonomy",       vertical: "all",      canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["quality_score"],                                 description: "Orchestrates data quality checks",                     brainOwner: "category" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NORMALIZERS — Brain Owner: category
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "food-menu-normalizer":  { tier: "critical",    businessFn: "onboarding",     vertical: "food",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["menu_items_json", "menu_normalized_at", "pipeline_stage"], description: "Normalizes food menus",                  brainOwner: "category" },
  "grocery-normalizer":    { tier: "priority",    businessFn: "onboarding",     vertical: "grocery",  canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["menu_items_json", "pipeline_stage"],             description: "Normalizes grocery catalogs",                          brainOwner: "category" },
  "service-catalog-normalizer": { tier: "critical", businessFn: "onboarding",  vertical: "services", canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["service_catalog_json", "pipeline_stage"],        description: "Normalizes service catalogs",                          brainOwner: "category" },
  "menu-rebuild":          { tier: "critical",    businessFn: "onboarding",     vertical: "food",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["menu_items_json", "menu_rebuild_score", "menu_quality_score", "menu_quality_flag"], description: "Rebuilds dirty menus into clean canonical structure", brainOwner: "category" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TAXONOMY — Brain Owner: category
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "adaptive-taxonomy":     { tier: "priority",    businessFn: "taxonomy",       vertical: "all",      canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["category", "subcategory"],                       description: "Adapts taxonomy mappings",                             brainOwner: "category" },
  "category-mapping-sync": { tier: "standard",    businessFn: "taxonomy",       vertical: "all",      canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["category", "subcategory"],                       description: "Syncs category mappings",                              brainOwner: "category" },
  "data-taxonomy-runtime": { tier: "standard",    businessFn: "taxonomy",       vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Corrects taxonomy emoji/category mismatches in DOM",   brainOwner: "category" },
  "data-forex-rates":      { tier: "standard",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Auto-fetches and caches live forex rates from ECB",    brainOwner: "execution" },
  "data-prayer-times":     { tier: "standard",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Auto-fetches and caches prayer times from Al-Adhan",   brainOwner: "execution" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PUBLISH GATES — Brain Owner: category (vertical-exclusive, no overlap)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "publish-gate-food":     { tier: "critical",    businessFn: "visibility",     vertical: "food",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                 description: "Food-specific publish gate",                           brainOwner: "category" },
  "publish-gate-grocery":  { tier: "priority",    businessFn: "visibility",     vertical: "grocery",  canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                 description: "Grocery-specific publish gate",                        brainOwner: "category" },
  "publish-gate-service":  { tier: "critical",    businessFn: "visibility",     vertical: "services", canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                 description: "Service-specific publish gate",                        brainOwner: "category" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE — Brain Owner: arbitration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "auto-publish":          { tier: "critical",    businessFn: "visibility",     vertical: "all",      canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                               description: "Auto-publishes gated entities",                        brainOwner: "arbitration" },
  "auto-unpublish":        { tier: "priority",    businessFn: "visibility",     vertical: "all",      canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                               description: "Auto-hides failing entities",                          brainOwner: "arbitration" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GOVERNANCE — Brain Owner: arbitration or experience
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "flow-integrity":        { tier: "priority",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Validates action wiring and flow closure",             brainOwner: "execution" },
  "governance-audit":      { tier: "standard",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Audits architecture debt and governance violations",   brainOwner: "arbitration" },
  "media-relevance":       { tier: "standard",    businessFn: "visibility",     vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Validates media quality and cross-vertical contamination", brainOwner: "category" },
  "text-integrity":        { tier: "standard",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Validates text length, encoding, and placeholder rules", brainOwner: "experience" },
  "page-open-reliability": { tier: "priority",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Tracks page open failures and broken routes",          brainOwner: "experience" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REALTIME — Brain Owner: execution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "rt-unread-integrity":   { tier: "standard",    businessFn: "infrastructure", vertical: "all",      canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                               description: "Corrects unread badge anomalies in DOM",               brainOwner: "execution" },
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
