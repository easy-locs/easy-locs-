/**
 * Engine Metadata Registry — Business tier, function, vertical, table dependencies.
 * Source of truth for cockpit display, collision detection, and BRAIN OWNERSHIP.
 *
 * GOVERNANCE LAW:
 * - Every engine has exactly ONE brain owner
 * - Brains DECIDE. Engines EXECUTE/ENRICH.
 * - No engine may act as an independent final decision-maker
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
  // INFRASTRUCTURE — Brain Owner: varies (orchestration engines own no truth)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "engine-health":         { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Checks all engine health status",                      brainOwner: "execution" },
  "platform-recovery":     { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Recovers failed platform modules",                     brainOwner: "execution" },
  "auto-fix":              { tier: "priority",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: ["seed_merchants"],   fieldsWritten: ["status"],                      description: "Auto-corrects common data issues",                     brainOwner: "execution" },
  "health-checks":         { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Full health check suite",                               brainOwner: "execution" },
  "store-consistency":     { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Syncs Orbit + Wallet stores",                           brainOwner: "execution" },
  "backend-reconnect":     { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Reconnects failed backend services",                    brainOwner: "execution" },
  "sla-breach-check":      { tier: "priority",    businessFn: "lifecycle",      vertical: "all", canRunIdle: true,  tablesWritten: ["support_tickets"],  fieldsWritten: ["priority", "status"],          description: "Escalates SLA breaches",                                brainOwner: "arbitration" },
  "self-healing-scan":     { tier: "priority",    businessFn: "visibility",     vertical: "all", canRunIdle: true,  tablesWritten: ["storefront_pages"], fieldsWritten: ["status"],                      description: "Fixes empty pages and missing images",                  brainOwner: "execution" },
  "permission-check":      { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Validates access permissions",                          brainOwner: "execution" },
  "audit-trail":           { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: ["audit_logs"],       fieldsWritten: ["action"],                      description: "Records audit trail entries",                           brainOwner: "execution" },
  "platform-cleanup":      { tier: "optimizable", businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Detects dead code and orphans",                         brainOwner: "execution" },
  "performance-audit":     { tier: "optimizable", businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Measures performance metrics",                          brainOwner: "execution" },
  "journey-coherence":     { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Validates UI journey flows",                            brainOwner: "experience" },
  "ui-ux-consistency":     { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Audits UI/UX consistency",                              brainOwner: "experience" },
  "i18n-integrity":        { tier: "standard",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Checks translation integrity",                          brainOwner: "experience" },
  "global-orchestration":  { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                              description: "Coordinates all engines, detects collisions",           brainOwner: "arbitration" },
  "platform-orchestrator": { tier: "critical",    businessFn: "infrastructure", vertical: "all", canRunIdle: true,  tablesWritten: ["platform_actions_log", "platform_health_scores"], fieldsWritten: ["action_type", "severity", "global_score"], description: "Autonomous governance brain — decides, acts, logs", brainOwner: "arbitration" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DIGITAL / EXPERIENCE — Brain Owner: experience
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "digital-orchestration": { tier: "priority",    businessFn: "visibility",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Orchestrates homepage sections",       brainOwner: "experience" },
  "global-experience-refresh": { tier: "standard", businessFn: "visibility",   vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Refreshes global experience state",    brainOwner: "experience" },
  "content-freshness":     { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Generates fresh content blocks",       brainOwner: "experience" },
  "campaign-banner":       { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Manages campaign banners",             brainOwner: "experience" },
  "social-proof":          { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Computes social proof signals",        brainOwner: "experience" },
  "search-intent":         { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Analyzes search intent patterns",      brainOwner: "experience" },
  "ux-audit":              { tier: "optimizable", businessFn: "infrastructure", vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Audits UX patterns",                   brainOwner: "experience" },
  "visual-consistency":    { tier: "optimizable", businessFn: "infrastructure", vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Audits visual consistency",             brainOwner: "experience" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUALITY / ONBOARDING / TAXONOMY — Brain Owner: category (vertical behavior)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "coherence-sweep":       { tier: "critical",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["coherence_status", "coherence_score"],               description: "Menu/category coherence gate",                          brainOwner: "category" },
  "shop-quality":          { tier: "critical",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_score", "tier"],                          description: "Scores shop quality for visibility",                    brainOwner: "arbitration" },
  "entity-recovery":       { tier: "priority",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Recovers hidden entities",                              brainOwner: "arbitration" },
  "data-trust-scan":       { tier: "priority",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["trust_score"],                                       description: "Calculates trust scores",                               brainOwner: "arbitration" },
  "shop-cleanup":          { tier: "critical",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["cover_image_url", "menu_items_json", "subcategory"], description: "Cleans duplicate covers and generic menus",             brainOwner: "category" },
  "publish-gate":          { tier: "critical",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "gate_failures"],                      description: "Generic publish gate sweep",                            brainOwner: "arbitration" },
  "food-quality":          { tier: "priority",    businessFn: "taxonomy",       vertical: "food",    canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Food-specific quality validation",                      brainOwner: "category" },
  "franchise-dedup":       { tier: "standard",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["franchise_group"],                                   description: "Detects franchise duplicates",                          brainOwner: "category" },
  "seo-check":             { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["seo_score"],                                         description: "SEO optimization check",                                brainOwner: "category" },
  "menu-intelligence":     { tier: "standard",    businessFn: "taxonomy",       vertical: "food",    canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Menu pattern intelligence",                             brainOwner: "category" },
  "vertical-classifier":   { tier: "critical",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["vertical", "vertical_locked", "vertical_confidence"],description: "Classifies entity vertical",                            brainOwner: "category" },
  "food-menu-normalizer":  { tier: "critical",    businessFn: "onboarding",     vertical: "food",    canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["menu_items_json", "menu_normalized_at", "pipeline_stage"], description: "Normalizes food menus",                           brainOwner: "category" },
  "hotel-inventory-normalizer": { tier: "critical", businessFn: "onboarding",   vertical: "hotel",   canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["hotel_inventory_json", "pipeline_stage"],            description: "Normalizes hotel inventory",                            brainOwner: "category" },
  "shop-backend-repair":   { tier: "priority",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["name", "address", "phone"],                          description: "Repairs backend data gaps",                             brainOwner: "category" },
  "publish-gate-food":     { tier: "critical",    businessFn: "visibility",     vertical: "food",    canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                     description: "Food-specific publish gate",                            brainOwner: "category" },
  "publish-gate-hotel":    { tier: "critical",    businessFn: "visibility",     vertical: "hotel",   canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                     description: "Hotel-specific publish gate",                           brainOwner: "category" },
  "service-catalog-normalizer": { tier: "critical", businessFn: "onboarding",  vertical: "services", canRunIdle: false, tablesWritten: ["seed_merchants"],  fieldsWritten: ["service_catalog_json", "pipeline_stage"],            description: "Normalizes service catalogs",                           brainOwner: "category" },
  "grocery-normalizer":    { tier: "priority",    businessFn: "onboarding",     vertical: "grocery", canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["menu_items_json", "pipeline_stage"],                 description: "Normalizes grocery catalogs",                           brainOwner: "category" },
  "publish-gate-service":  { tier: "critical",    businessFn: "visibility",     vertical: "services", canRunIdle: false, tablesWritten: ["seed_merchants"],  fieldsWritten: ["gate_status", "pipeline_stage"],                     description: "Service-specific publish gate",                         brainOwner: "category" },
  "publish-gate-grocery":  { tier: "priority",    businessFn: "visibility",     vertical: "grocery", canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["gate_status", "pipeline_stage"],                     description: "Grocery-specific publish gate",                         brainOwner: "category" },
  "auto-publish":          { tier: "critical",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Auto-publishes gated entities",                         brainOwner: "arbitration" },
  "visibility-optimizer":  { tier: "priority",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode", "display_priority"],               description: "Promotes/demotes visibility",                           brainOwner: "arbitration" },
  "auto-unpublish":        { tier: "priority",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Auto-hides failing entities",                           brainOwner: "arbitration" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DATA / GEO / TAXONOMY — Brain Owner: geo or category
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "geo-density":           { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Computes geo zone density",                             brainOwner: "geo" },
  "data-completeness":     { tier: "priority",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Scans data completeness",                               brainOwner: "category" },
  "adaptive-taxonomy":     { tier: "priority",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["category", "subcategory"],                           description: "Adapts taxonomy mappings",                              brainOwner: "category" },
  "onboarding-correction": { tier: "critical",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["vertical", "pipeline_stage"],                        description: "Corrects onboarding data",                              brainOwner: "category" },
  "auto-source-enrich":    { tier: "priority",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["source_data"],                                       description: "Auto-enriches from sources",                            brainOwner: "category" },
  "fx-refresh":            { tier: "standard",    businessFn: "finance",        vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Refreshes FX rates",                                    brainOwner: "execution" },
  "notification-cleanup":  { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["notifications"],    fieldsWritten: ["status"],                                            description: "Archives old notifications",                            brainOwner: "execution" },
  "source-intake-scan":    { tier: "priority",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["raw_menu_json", "raw_hotel_inventory_json"],         description: "Snapshots raw source data",                             brainOwner: "category" },
  "category-mapping-sync": { tier: "standard",    businessFn: "taxonomy",       vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["category", "subcategory"],                           description: "Syncs category mappings",                               brainOwner: "category" },
  "source-rescrape-monitor": { tier: "standard",  businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["rescrape_needed"],                                   description: "Flags stale sources for rescrape",                      brainOwner: "category" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMMERCE / RANKING — Brain Owner: arbitration (final decisions) or experience (display)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "central-ranking-rerank": { tier: "critical",   businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["display_priority", "rank_score"],                    description: "Reranks all entities",                                  brainOwner: "arbitration" },
  "merchandising":         { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Computes best sellers",                                 brainOwner: "experience" },
  "ai-feedback-recompute": { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["ai_score"],                                          description: "Recomputes AI scores",                                  brainOwner: "arbitration" },
  "crm-reactivation":      { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: [],                   fieldsWritten: [],                                                    description: "Identifies reactivation candidates",                    brainOwner: "experience" },
  "boost-slot-refresh":    { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                   fieldsWritten: [],                                                    description: "Refreshes boost ad slots",                              brainOwner: "experience" },
  "boost-analytics":       { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["boost_campaigns"],  fieldsWritten: ["status", "spent"],                                   description: "Analyzes boost performance",                            brainOwner: "arbitration" },
  "inventory-check":       { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],   fieldsWritten: ["visibility_mode"],                                   description: "Checks inventory availability",                         brainOwner: "arbitration" },
  "coupon-expiration":     { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Expires old coupons",                                   brainOwner: "arbitration" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FINANCE — Brain Owner: arbitration (pricing truth)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "finance-reconciliation": { tier: "critical",   businessFn: "finance",        vertical: "all",     canRunIdle: false, tablesWritten: ["accounting_entries"], fieldsWritten: ["amount", "status"],                               description: "Reconciles financial entries",                          brainOwner: "arbitration" },
  "wallet-sync":           { tier: "priority",    businessFn: "finance",        vertical: "all",     canRunIdle: false, tablesWritten: ["wallet_accounts"],   fieldsWritten: ["balance"],                                          description: "Syncs wallet balances",                                 brainOwner: "arbitration" },
  "qr-session-cleanup":    { tier: "standard",    businessFn: "finance",        vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Cleans expired QR sessions",                            brainOwner: "execution" },
  "compliance-aml":        { tier: "priority",    businessFn: "finance",        vertical: "all",     canRunIdle: false, tablesWritten: ["aml_events"],        fieldsWritten: ["status", "score"],                                  description: "AML compliance scanning",                               brainOwner: "arbitration" },
  "abandoned-cart":        { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["abandoned_cart_events"], fieldsWritten: ["status"],                                      description: "Recovers abandoned carts",                              brainOwner: "execution" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DELIVERY / EXECUTION — Brain Owner: execution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "driver-availability":   { tier: "critical",    businessFn: "delivery",       vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Scans driver availability",                             brainOwner: "execution" },
  "delivery-monitor":      { tier: "critical",    businessFn: "delivery",       vertical: "all",     canRunIdle: false, tablesWritten: ["orders"],            fieldsWritten: ["status"],                                           description: "Monitors active deliveries",                            brainOwner: "execution" },
  "live-status-refresh":   { tier: "priority",    businessFn: "delivery",       vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Refreshes live order tracking",                         brainOwner: "execution" },
  "call-log-cleanup":      { tier: "optimizable", businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Cleans stale call logs",                                brainOwner: "execution" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE — Brain Owner: varies by function
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "order-lifecycle":       { tier: "critical",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["orders"],            fieldsWritten: ["status"],                                           description: "Manages order lifecycle",                               brainOwner: "execution" },
  "review-trigger":        { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Triggers review requests",                              brainOwner: "experience" },
  "loyalty-scan":          { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Awards loyalty points",                                 brainOwner: "arbitration" },
  "staff-sync":            { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Syncs staff roles",                                     brainOwner: "execution" },
  "reorder-check":         { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: [],                    fieldsWritten: [],                                                   description: "Sends reorder reminders",                               brainOwner: "experience" },
  "automation-workflows":  { tier: "priority",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["automation_workflows"], fieldsWritten: ["status", "current_step"],                      description: "Executes automation workflows",                         brainOwner: "execution" },
  "approval-queue":        { tier: "standard",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["approval_queues"],   fieldsWritten: ["status"],                                           description: "Processes approval queues",                             brainOwner: "arbitration" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BACKEND TRUTH (Sensors) — Brain Owner: execution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "backend-connectivity":  { tier: "critical",    businessFn: "infrastructure", vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],    fieldsWritten: ["visibility_mode", "unpublish_reason"],              description: "Verifies every visible entity has valid backend",       brainOwner: "execution" },
  "entity-integrity":      { tier: "critical",    businessFn: "onboarding",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],    fieldsWritten: ["visibility_mode", "visibility_decision_reason"],    description: "Validates entity fields, state, and journey",           brainOwner: "execution" },
  "dead-flow-elimination": { tier: "priority",    businessFn: "infrastructure", vertical: "all",     canRunIdle: true,  tablesWritten: [],                    fieldsWritten: [],                                                   description: "Detects dead CTAs, routes, flows, module links",        brainOwner: "execution" },
  "full-stack-linkage":    { tier: "critical",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],    fieldsWritten: ["visibility_mode", "visibility_decision_reason"],    description: "Validates UI→Logic→API→DB→State chain, blocks broken",  brainOwner: "execution" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MECHANICS (Auto-repair) — Brain Owner: execution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "auto-repair":           { tier: "critical",    businessFn: "infrastructure", vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],    fieldsWritten: ["city", "country", "currency", "description", "visibility_score", "visibility_mode"], description: "Auto-fixes safe deterministic issues, blocks dangerous, escalates ambiguous", brainOwner: "execution" },
  "module-link-repair":    { tier: "priority",    businessFn: "infrastructure", vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],    fieldsWritten: ["visibility_mode", "pipeline_stage", "publish_gate_status"], description: "Verifies and repairs cross-module connections",  brainOwner: "execution" },
  "entity-state-healing":  { tier: "critical",    businessFn: "visibility",     vertical: "all",     canRunIdle: false, tablesWritten: ["seed_merchants"],    fieldsWritten: ["visibility_mode", "vertical", "visibility_decision_reason"], description: "Heals incoherent entity states — pipeline vs visibility, gate vs mode", brainOwner: "execution" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MENU PIPELINE — Brain Owner: category
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "menu-rebuild":          { tier: "critical",    businessFn: "onboarding",     vertical: "food",    canRunIdle: false, tablesWritten: ["seed_merchants"],    fieldsWritten: ["menu_items_json", "menu_rebuild_score", "menu_quality_score", "menu_quality_flag"], description: "Rebuilds dirty menus into clean canonical structure", brainOwner: "category" },
  "taxonomy-remap":        { tier: "priority",    businessFn: "taxonomy",       vertical: "food",    canRunIdle: false, tablesWritten: ["seed_merchants"],    fieldsWritten: ["category", "subcategory", "taxonomy_score"],              description: "Revalidates and corrects taxonomy after menu rebuild", brainOwner: "category" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UX & RADAR — Brain Owner: experience or geo
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "ux-autotest":           { tier: "priority",    businessFn: "infrastructure", vertical: "all",     canRunIdle: true,  tablesWritten: [],                    fieldsWritten: [],                                                   description: "Auto-tests UX flows, detects dead buttons, raw i18n keys, empty pages", brainOwner: "experience" },
  "hyper-radar":           { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                    fieldsWritten: [],                                                   description: "Immersive discovery with heatmap, layers, smart guidance", brainOwner: "experience" },
  "behavior-pattern":      { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                    fieldsWritten: [],                                                   description: "Analyzes aggregated behavior patterns by zone, time, season", brainOwner: "experience" },
  "vibe-density":          { tier: "standard",    businessFn: "visibility",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                    fieldsWritten: [],                                                   description: "Calculates zone atmosphere, crowd density, noise level", brainOwner: "geo" },
  "travel-transition":     { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                    fieldsWritten: [],                                                   description: "Detects travel context and provides smart guidance",     brainOwner: "geo" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AI PERSONAL RADAR (#97-108) — Brain Owner: experience (personalization layer)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "personal-profile":      { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["user_radar_profiles"],     fieldsWritten: ["taste_scores_json", "lifestyle_tags"],              description: "Builds & refreshes personal radar profiles from behavior", brainOwner: "experience" },
  "preference-learning":   { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["user_radar_profiles"],     fieldsWritten: ["preferred_categories", "preferred_verticals"],      description: "Learns user preferences from clicks, views, orders",    brainOwner: "experience" },
  "context-awareness":     { tier: "critical",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                          fieldsWritten: [],                                                   description: "Understands current user context: time, zone, travel state", brainOwner: "experience" },
  "next-best-action":      { tier: "critical",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                          fieldsWritten: [],                                                   description: "Decides what radar should propose right now",            brainOwner: "experience" },
  "personal-ranking":      { tier: "critical",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["user_radar_recommendations"], fieldsWritten: ["personal_score"],                               description: "Ranks entities per-user with affinity, context, budget", brainOwner: "arbitration" },
  "personal-offer":        { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["user_radar_recommendations"], fieldsWritten: ["recommendation_type"],                          description: "Pushes targeted offers based on profile + context",      brainOwner: "experience" },
  "travel-mode":           { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                          fieldsWritten: [],                                                   description: "Detects travel mode: tourist, business, local, nomad",   brainOwner: "geo" },
  "budget-fit":            { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: [],                          fieldsWritten: [],                                                   description: "Adapts results to user spending profile",                brainOwner: "experience" },
  "taste-affinity":        { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["user_radar_profiles"],     fieldsWritten: ["taste_scores_json"],                                description: "Computes taste affinity scores per category",            brainOwner: "experience" },
  "radar-memory":          { tier: "standard",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["user_radar_events"],       fieldsWritten: [],                                                   description: "Remembers user patterns across sessions",                brainOwner: "experience" },
  "session-intelligence":  { tier: "priority",    businessFn: "conversion",     vertical: "all",     canRunIdle: true,  tablesWritten: ["user_radar_sessions"],     fieldsWritten: ["detected_intent"],                                  description: "Detects current session intent in real-time",            brainOwner: "experience" },
  "hyper-personalization": { tier: "critical",    businessFn: "conversion",     vertical: "all",     canRunIdle: false, tablesWritten: ["user_radar_recommendations"], fieldsWritten: ["personal_score", "recommendation_type"],       description: "Fuses all signals into personal_relevance_score per entity", brainOwner: "arbitration" },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RIDES — Brain Owner: execution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  "ride-lifecycle":        { tier: "critical",    businessFn: "lifecycle",      vertical: "all",     canRunIdle: false, tablesWritten: ["rides", "ride_events"],    fieldsWritten: ["status"],                                       description: "Manages ride lifecycle: auto-fail, auto-cancel, schedule activation", brainOwner: "execution" },
  "ride-tracking-monitor": { tier: "priority",    businessFn: "delivery",       vertical: "all",     canRunIdle: false, tablesWritten: [],                          fieldsWritten: [],                                               description: "Monitors active rides for missing GPS tracking",     brainOwner: "execution" },
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
