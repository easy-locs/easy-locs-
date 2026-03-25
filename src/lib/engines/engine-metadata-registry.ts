/**
 * Engine Metadata Registry — Business tier, function, vertical, table dependencies.
 * Source of truth for cockpit display and collision detection.
 */

export type EngineTier = "critical" | "priority" | "standard" | "optimizable";
export type BusinessFunction = "onboarding" | "taxonomy" | "visibility" | "conversion" | "lifecycle" | "finance" | "delivery" | "infrastructure";
export type EngineVertical = "all" | "food" | "hotel" | "services" | "grocery" | "property";
export type RuntimeStatus = "ok" | "idle" | "warning" | "error" | "pending";

export interface EngineMetadata {
  tier: EngineTier;
  businessFn: BusinessFunction;
  vertical: EngineVertical;
  canRunIdle: boolean;
  tablesWritten: string[];
  fieldsWritten: string[];
  description: string;
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
  // ── SYSTEM (infrastructure) ──
  "engine-health":         { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Checks all engine health status" },
  "platform-recovery":     { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Recovers failed platform modules" },
  "auto-fix":              { tier: "priority",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: ["seed_merchants"],   fieldsWritten: ["status"],                      description: "Auto-corrects common data issues" },
  "health-checks":         { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Full health check suite" },
  "store-consistency":     { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Syncs Orbit + Wallet stores" },
  "backend-reconnect":     { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Reconnects failed backend services" },
  "sla-breach-check":      { tier: "priority",    businessFn: "lifecycle",      vertical: "all", canRunIdle: true,  tablesWritten: ["support_tickets"],  fieldsWritten: ["priority", "status"],          description: "Escalates SLA breaches" },
  "self-healing-scan":     { tier: "priority",    businessFn: "visibility",     vertical: "all", canRunIdle: true,  tablesWritten: ["storefront_pages"], fieldsWritten: ["status"],                      description: "Fixes empty pages and missing images" },
  "permission-check":      { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Validates access permissions" },
  "audit-trail":           { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: ["audit_logs"],       fieldsWritten: ["action"],                      description: "Records audit trail entries" },
  "platform-cleanup":      { tier: "optimizable", businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Detects dead code and orphans" },
  "performance-audit":     { tier: "optimizable", businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Measures performance metrics" },
  "journey-coherence":     { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Validates UI journey flows" },
  "ui-ux-consistency":     { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Audits UI/UX consistency" },
  "i18n-integrity":        { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Checks translation integrity" },
  "global-orchestration":  { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Coordinates all engines, detects collisions" },

  // ── DIGITAL (visibility) ──
  "digital-orchestration": { tier: "priority",    businessFn: "visibility",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Orchestrates homepage sections" },
  "global-experience-refresh": { tier: "standard", businessFn: "visibility",   vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Refreshes global experience state" },
  "content-freshness":     { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Generates fresh content blocks" },
  "campaign-banner":       { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Manages campaign banners" },
  "social-proof":          { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Computes social proof signals" },
  "search-intent":         { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Analyzes search intent patterns" },
  "ux-audit":              { tier: "optimizable", businessFn: "infrastructure", vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Audits UX patterns" },
  "visual-consistency":    { tier: "optimizable", businessFn: "infrastructure", vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Audits visual consistency" },

  // ── QUALITY (onboarding + taxonomy + visibility) ──
  "coherence-sweep":       { tier: "critical",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["coherence_status", "coherence_score"],               description: "Menu/category coherence gate" },
  "shop-quality":          { tier: "critical",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_score", "tier"],                          description: "Scores shop quality for visibility" },
  "entity-recovery":       { tier: "priority",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Recovers hidden entities" },
  "data-trust-scan":       { tier: "priority",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["trust_score"],                                       description: "Calculates trust scores" },
  "shop-cleanup":          { tier: "critical",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["cover_image_url", "menu_items_json", "subcategory"], description: "Cleans duplicate covers and generic menus" },
  "publish-gate":          { tier: "critical",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "gate_failures"],                      description: "Generic publish gate sweep" },
  "food-quality":          { tier: "priority",    businessFn: "taxonomy",       vertical: "food",    canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Food-specific quality validation" },
  "franchise-dedup":       { tier: "standard",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["franchise_group"],                                   description: "Detects franchise duplicates" },
  "seo-check":             { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["seo_score"],                                         description: "SEO optimization check" },
  "menu-intelligence":     { tier: "standard",    businessFn: "taxonomy",       vertical: "food",    canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Menu pattern intelligence" },
  "vertical-classifier":   { tier: "critical",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["vertical", "vertical_locked", "vertical_confidence"],description: "Classifies entity vertical" },
  "food-menu-normalizer":  { tier: "critical",    businessFn: "onboarding",     vertical: "food",    canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["menu_items_json", "menu_normalized_at", "pipeline_stage"], description: "Normalizes food menus" },
  "hotel-inventory-normalizer": { tier: "critical", businessFn: "onboarding",   vertical: "hotel",   canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["hotel_inventory_json", "pipeline_stage"],            description: "Normalizes hotel inventory" },
  "shop-backend-repair":   { tier: "priority",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["name", "address", "phone"],                          description: "Repairs backend data gaps" },
  "publish-gate-food":     { tier: "critical",    businessFn: "visibility",     vertical: "food",    canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                     description: "Food-specific publish gate" },
  "publish-gate-hotel":    { tier: "critical",    businessFn: "visibility",     vertical: "hotel",   canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                     description: "Hotel-specific publish gate" },
  "service-catalog-normalizer": { tier: "critical", businessFn: "onboarding",  vertical: "services", canRunIdle: false, tablesWritten: ["seed_merchants"],  fieldsWritten: ["service_catalog_json", "pipeline_stage"],            description: "Normalizes service catalogs" },
  "grocery-normalizer":    { tier: "priority",    businessFn: "onboarding",     vertical: "grocery", canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["menu_items_json", "pipeline_stage"],                 description: "Normalizes grocery catalogs" },
  "publish-gate-service":  { tier: "critical",    businessFn: "visibility",     vertical: "services", canRunIdle: false, tablesWritten: ["seed_merchants"],  fieldsWritten: ["gate_status", "pipeline_stage"],                     description: "Service-specific publish gate" },
  "publish-gate-grocery":  { tier: "priority",    businessFn: "visibility",     vertical: "grocery", canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                     description: "Grocery-specific publish gate" },
  "auto-publish":          { tier: "critical",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Auto-publishes gated entities" },
  "visibility-optimizer":  { tier: "priority",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode", "display_priority"],               description: "Promotes/demotes visibility" },
  "auto-unpublish":        { tier: "priority",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Auto-hides failing entities" },

  // ── DATA (onboarding + taxonomy) ──
  "geo-density":           { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Computes geo zone density" },
  "data-completeness":     { tier: "priority",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Scans data completeness" },
  "adaptive-taxonomy":     { tier: "priority",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["category", "subcategory"],                           description: "Adapts taxonomy mappings" },
  "onboarding-correction": { tier: "critical",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["vertical", "pipeline_stage"],                        description: "Corrects onboarding data" },
  "auto-source-enrich":    { tier: "priority",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["source_data"],                                       description: "Auto-enriches from sources" },
  "fx-refresh":            { tier: "standard",    businessFn: "finance",        vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Refreshes FX rates" },
  "notification-cleanup":  { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["notifications"],    fieldsWritten: ["status"],                                            description: "Archives old notifications" },
  "source-intake-scan":    { tier: "priority",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["raw_menu_json", "raw_hotel_inventory_json"],         description: "Snapshots raw source data" },
  "category-mapping-sync": { tier: "standard",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["category", "subcategory"],                           description: "Syncs category mappings" },
  "source-rescrape-monitor": { tier: "standard",  businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["rescrape_needed"],                                   description: "Flags stale sources for rescrape" },

  // ── COMMERCE (conversion) ──
  "central-ranking-rerank": { tier: "critical",   businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["display_priority", "rank_score"],                    description: "Reranks all entities" },
  "merchandising":         { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Computes best sellers" },
  "ai-feedback-recompute": { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["ai_score"],                                          description: "Recomputes AI scores" },
  "crm-reactivation":      { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Identifies reactivation candidates" },
  "boost-slot-refresh":    { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Refreshes boost ad slots" },
  "boost-analytics":       { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["boost_campaigns"],  fieldsWritten: ["status", "spent"],                                   description: "Analyzes boost performance" },
  "inventory-check":       { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Checks inventory availability" },

  // ── FINANCE ──
  "finance-reconciliation": { tier: "critical",   businessFn: "finance",        vertical: "all",     canRunIdle: false, tablesWritten: ["accounting_entries"], fieldsWritten: ["amount", "status"],                               description: "Reconciles financial entries" },
  "wallet-sync":           { tier: "priority",    businessFn: "finance",        vertical: "all",     canRunIdle: false, tablesWritten: ["wallet_accounts"],   fieldsWritten: ["balance"],                                          description: "Syncs wallet balances" },
  "coupon-expiration":     { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Expires old coupons" },
  "qr-session-cleanup":    { tier: "standard",    businessFn: "finance",        vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Cleans expired QR sessions" },
  "compliance-aml":        { tier: "priority",    businessFn: "finance",        vertical: "all",     canRunIdle: false, tablesWritten: ["aml_events"],        fieldsWritten: ["status", "score"],                                  description: "AML compliance scanning" },
  "abandoned-cart":        { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["abandoned_cart_events"], fieldsWritten: ["status"],                                      description: "Recovers abandoned carts" },

  // ── DELIVERY ──
  "driver-availability":   { tier: "critical",    businessFn: "delivery",       vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Scans driver availability" },
  "delivery-monitor":      { tier: "critical",    businessFn: "delivery",       vertical: "all",     canRunIdle: false, tablesWritten: ["orders"],            fieldsWritten: ["status"],                                           description: "Monitors active deliveries" },
  "live-status-refresh":   { tier: "priority",    businessFn: "delivery",       vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Refreshes live order tracking" },
  "call-log-cleanup":      { tier: "optimizable", businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Cleans stale call logs" },

  // ── LIFECYCLE ──
  "order-lifecycle":       { tier: "critical",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["orders"],            fieldsWritten: ["status"],                                           description: "Manages order lifecycle" },
  "review-trigger":        { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Triggers review requests" },
  "loyalty-scan":          { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Awards loyalty points" },
  "staff-sync":            { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Syncs staff roles" },
  "reorder-check":         { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Sends reorder reminders" },
  "automation-workflows":  { tier: "priority",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["automation_workflows"], fieldsWritten: ["status", "current_step"],                      description: "Executes automation workflows" },
  "approval-queue":        { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["approval_queues"],   fieldsWritten: ["status"],                                           description: "Processes approval queues" },
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
