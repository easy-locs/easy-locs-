/**
 * Engine Governance Map — Final canonical classification of all governed engines.
 * Each engine is assigned: brain, domain, pipeline stage, criticality, operational mode.
 *
 * MODES:
 * - live: Full DB writes, production impact
 * - shadow: Runs but logs only, no writes
 * - safe: Reads + validates, writes gated by firewall
 *
 * PIPELINE STAGES:
 * - ingestion: Raw data intake
 * - normalization: Data cleaning & standardization
 * - classification: Vertical/category assignment
 * - validation: Quality & integrity checks
 * - gating: Publish/visibility decisions
 * - execution: Runtime operations (orders, rides, wallets)
 * - orchestration: Cross-engine coordination
 * - enrichment: Scoring, ranking, personalization
 */

import type { BrainOwner, EngineTier } from "./engine-metadata-registry";

export type PipelineStage =
  | "ingestion"
  | "normalization"
  | "classification"
  | "validation"
  | "gating"
  | "execution"
  | "orchestration"
  | "enrichment";

export type OperationalMode = "live" | "shadow" | "safe";

export interface GovernedEngine {
  brain: BrainOwner;
  domain: string;
  stage: PipelineStage;
  tier: EngineTier;
  mode: OperationalMode;
  hasSideEffects: boolean;
  mergedFrom?: string[];
  description: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FINAL GOVERNED ENGINE MAP — 66 active engines
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const GOVERNED_ENGINES: Record<string, GovernedEngine> = {

  // ── ORCHESTRATION (3) ──────────────────────────────────────────────────
  "engine-health":          { brain: "execution",   domain: "infrastructure", stage: "orchestration", tier: "critical",    mode: "live",   hasSideEffects: false, description: "Monitors all engine health" },
  "platform-recovery":      { brain: "execution",   domain: "infrastructure", stage: "orchestration", tier: "critical",    mode: "live",   hasSideEffects: false, description: "Recovers failed modules" },
  "global-orchestration":   { brain: "arbitration",  domain: "infrastructure", stage: "orchestration", tier: "critical",    mode: "live",   hasSideEffects: false, mergedFrom: ["digital-orchestration", "global-experience-refresh"], description: "Central engine coordinator" },
  "platform-orchestrator":  { brain: "arbitration",  domain: "infrastructure", stage: "orchestration", tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Autonomous governance brain" },

  // ── INGESTION (3) ──────────────────────────────────────────────────────
  "import-pipeline":        { brain: "category",    domain: "data",           stage: "ingestion",     tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Imports external data sources" },
  "ingestion-pipeline":     { brain: "category",    domain: "data",           stage: "ingestion",     tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Core ingestion pipeline" },
  "source-intake-scan":     { brain: "category",    domain: "data",           stage: "ingestion",     tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Snapshots raw source data" },

  // ── NORMALIZATION (6) ──────────────────────────────────────────────────
  "food-menu-normalizer":   { brain: "category",    domain: "food",           stage: "normalization", tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Normalizes food menus" },
  "hotel-inventory-normalizer": { brain: "category", domain: "hotel",         stage: "normalization", tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Normalizes hotel inventory" },
  "service-catalog-normalizer": { brain: "category", domain: "services",      stage: "normalization", tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Normalizes service catalogs" },
  "grocery-normalizer":     { brain: "category",    domain: "grocery",        stage: "normalization", tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Normalizes grocery catalogs" },
  "menu-rebuild":           { brain: "category",    domain: "food",           stage: "normalization", tier: "critical",    mode: "live",   hasSideEffects: true,  mergedFrom: ["menu-intelligence"], description: "Rebuilds dirty menus into canonical structure" },
  "onboarding-correction":  { brain: "category",    domain: "onboarding",     stage: "normalization", tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Corrects onboarding data" },

  // ── CLASSIFICATION (5) ─────────────────────────────────────────────────
  "vertical-classifier":    { brain: "category",    domain: "taxonomy",       stage: "classification", tier: "critical",   mode: "live",   hasSideEffects: true,  description: "Classifies entity vertical" },
  "adaptive-taxonomy":      { brain: "category",    domain: "taxonomy",       stage: "classification", tier: "priority",   mode: "live",   hasSideEffects: true,  description: "Adapts taxonomy mappings" },
  "category-mapping-sync":  { brain: "category",    domain: "taxonomy",       stage: "classification", tier: "standard",   mode: "live",   hasSideEffects: true,  description: "Syncs category mappings" },
  "taxonomy-remap":         { brain: "category",    domain: "taxonomy",       stage: "classification", tier: "priority",   mode: "live",   hasSideEffects: true,  description: "Revalidates taxonomy after rebuild" },
  "coherence-sweep":        { brain: "category",    domain: "quality",        stage: "classification", tier: "critical",   mode: "live",   hasSideEffects: true,  description: "Menu/category coherence gate" },

  // ── VALIDATION (9) ─────────────────────────────────────────────────────
  "shop-quality":           { brain: "arbitration",  domain: "quality",        stage: "validation",    tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Scores shop quality for visibility" },
  "shop-cleanup":           { brain: "category",    domain: "quality",        stage: "validation",    tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Cleans duplicate covers, generic menus" },
  "food-quality":           { brain: "category",    domain: "food",           stage: "validation",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Food-specific quality validation" },
  "data-trust-scan":        { brain: "arbitration",  domain: "quality",        stage: "validation",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Calculates trust scores" },
  "entity-integrity":       { brain: "execution",   domain: "quality",        stage: "validation",    tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Validates entity fields & state" },
  "full-stack-linkage":     { brain: "execution",   domain: "quality",        stage: "validation",    tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Validates UI→Logic→API→DB chain" },
  "backend-connectivity":   { brain: "execution",   domain: "infrastructure", stage: "validation",    tier: "critical",    mode: "live",   hasSideEffects: true,  mergedFrom: ["backend-reconnect"], description: "Verifies visible entities have valid backend" },
  "franchise-dedup":        { brain: "category",    domain: "quality",        stage: "validation",    tier: "standard",    mode: "safe",   hasSideEffects: true,  description: "Detects franchise duplicates" },
  "source-rescrape-monitor":{ brain: "category",    domain: "data",           stage: "validation",    tier: "standard",    mode: "safe",   hasSideEffects: true,  description: "Flags stale sources for rescrape" },

  // ── GATING (8) ─────────────────────────────────────────────────────────
  "publish-gate":           { brain: "arbitration",  domain: "visibility",     stage: "gating",        tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Generic publish gate sweep" },
  "publish-gate-food":      { brain: "category",    domain: "food",           stage: "gating",        tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Food-specific publish gate" },
  "publish-gate-hotel":     { brain: "category",    domain: "hotel",          stage: "gating",        tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Hotel-specific publish gate" },
  "publish-gate-service":   { brain: "category",    domain: "services",       stage: "gating",        tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Service-specific publish gate" },
  "publish-gate-grocery":   { brain: "category",    domain: "grocery",        stage: "gating",        tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Grocery-specific publish gate" },
  "auto-publish":           { brain: "arbitration",  domain: "visibility",     stage: "gating",        tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Auto-publishes gated entities" },
  "auto-unpublish":         { brain: "arbitration",  domain: "visibility",     stage: "gating",        tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Auto-hides failing entities" },
  "visibility-optimizer":   { brain: "arbitration",  domain: "visibility",     stage: "gating",        tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Promotes/demotes visibility" },

  // ── EXECUTION (11) ─────────────────────────────────────────────────────
  "order-lifecycle":        { brain: "execution",   domain: "commerce",       stage: "execution",     tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Manages order lifecycle" },
  "delivery-monitor":       { brain: "execution",   domain: "delivery",       stage: "execution",     tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Monitors active deliveries" },
  "ride-lifecycle":         { brain: "execution",   domain: "mobility",       stage: "execution",     tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Manages ride lifecycle" },
  "wallet-sync":            { brain: "arbitration",  domain: "finance",        stage: "execution",     tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Syncs wallet balances" },
  "finance-reconciliation": { brain: "arbitration",  domain: "finance",        stage: "execution",     tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Reconciles financial entries" },
  "compliance-aml":         { brain: "arbitration",  domain: "finance",        stage: "execution",     tier: "priority",    mode: "live",   hasSideEffects: true,  description: "AML compliance scanning" },
  "automation-workflows":   { brain: "execution",   domain: "lifecycle",      stage: "execution",     tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Executes automation workflows" },
  "abandoned-cart":         { brain: "execution",   domain: "commerce",       stage: "execution",     tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Recovers abandoned carts" },
  "sla-breach-check":       { brain: "arbitration",  domain: "support",        stage: "execution",     tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Escalates SLA breaches" },
  "qr-session-cleanup":     { brain: "execution",   domain: "finance",        stage: "execution",     tier: "standard",    mode: "live",   hasSideEffects: true,  description: "Cleans expired QR sessions" },
  "notification-cleanup":   { brain: "execution",   domain: "lifecycle",      stage: "execution",     tier: "standard",    mode: "live",   hasSideEffects: true,  description: "Archives old notifications" },

  // ── ENRICHMENT (7) ─────────────────────────────────────────────────────
  "central-ranking-rerank": { brain: "arbitration",  domain: "ranking",        stage: "enrichment",    tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Reranks all entities" },
  "hyper-personalization":  { brain: "arbitration",  domain: "personalization", stage: "enrichment",    tier: "critical",    mode: "live",   hasSideEffects: true,  mergedFrom: ["next-best-action"], description: "Fuses all signals into personal relevance" },
  "personal-profile":       { brain: "experience",  domain: "personalization", stage: "enrichment",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Builds personal radar profiles" },
  "preference-learning":    { brain: "experience",  domain: "personalization", stage: "enrichment",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Learns user preferences" },
  "personal-ranking":       { brain: "arbitration",  domain: "personalization", stage: "enrichment",    tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Ranks entities per-user" },
  "taste-affinity":         { brain: "experience",  domain: "personalization", stage: "enrichment",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Computes taste affinity scores" },
  "boost-analytics":        { brain: "arbitration",  domain: "commerce",       stage: "enrichment",    tier: "standard",    mode: "safe",   hasSideEffects: true,  description: "Analyzes boost performance" },

  // ── REPAIR (6) ─────────────────────────────────────────────────────────
  "auto-fix":               { brain: "execution",   domain: "repair",         stage: "validation",    tier: "priority",    mode: "live",   hasSideEffects: true,  mergedFrom: ["auto-repair"], description: "Auto-corrects common data issues" },
  "self-healing-scan":      { brain: "execution",   domain: "repair",         stage: "validation",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Fixes empty pages and missing images" },
  "entity-state-healing":   { brain: "execution",   domain: "repair",         stage: "validation",    tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Heals incoherent entity states" },
  "entity-recovery":        { brain: "arbitration",  domain: "visibility",     stage: "validation",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Recovers hidden entities" },
  "module-link-repair":     { brain: "execution",   domain: "repair",         stage: "validation",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Repairs cross-module connections" },
  "shop-backend-repair":    { brain: "category",    domain: "repair",         stage: "validation",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Repairs backend data gaps" },

  // ── MISC (4) ───────────────────────────────────────────────────────────
  "auto-source-enrich":     { brain: "category",    domain: "data",           stage: "ingestion",     tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Auto-enriches from sources" },
  "approval-queue":         { brain: "arbitration",  domain: "lifecycle",      stage: "execution",     tier: "standard",    mode: "live",   hasSideEffects: true,  description: "Processes approval queues" },
  "audit-trail":            { brain: "execution",   domain: "infrastructure", stage: "execution",     tier: "standard",    mode: "live",   hasSideEffects: true,  description: "Records audit trail entries" },
  "inventory-check":        { brain: "arbitration",  domain: "commerce",       stage: "validation",    tier: "priority",    mode: "live",   hasSideEffects: true,  description: "Checks inventory availability" },
  "driver-availability":    { brain: "execution",   domain: "delivery",       stage: "execution",     tier: "critical",    mode: "shadow", hasSideEffects: false, description: "Scans driver availability" },
  "pipeline-worker":        { brain: "execution",   domain: "infrastructure", stage: "execution",     tier: "critical",    mode: "live",   hasSideEffects: true,  description: "Queue-driven pipeline processor" },
  "zone-profile-refresh":   { brain: "geo",         domain: "geo",            stage: "enrichment",    tier: "standard",    mode: "safe",   hasSideEffects: true,  description: "Refreshes zone profiles" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DISABLED ENGINES (for reference — previously enabled, now archived)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const DISABLED_ENGINES: Record<string, { reason: string; mergedInto?: string }> = {
  // Duplicates merged
  "auto-repair":              { reason: "duplicate", mergedInto: "auto-fix" },
  "backend-reconnect":        { reason: "duplicate", mergedInto: "backend-connectivity" },
  "digital-orchestration":    { reason: "duplicate", mergedInto: "global-orchestration" },
  "global-experience-refresh":{ reason: "duplicate", mergedInto: "global-orchestration" },
  "menu-intelligence":        { reason: "duplicate", mergedInto: "menu-rebuild" },
  "next-best-action":         { reason: "duplicate", mergedInto: "hyper-personalization" },
  "concrete-surface-sync":    { reason: "unstable" },
  "ai-feedback-recompute":    { reason: "heartbeat-only" },
  "context-awareness":        { reason: "heartbeat-only" },
  "budget-fit":               { reason: "heartbeat-only" },
  "travel-mode":              { reason: "heartbeat-only" },
  "personal-offer":           { reason: "heartbeat-only" },
  // Heartbeat-only (no DB writes, no real value)
  "health-checks":            { reason: "heartbeat-only" },
  "store-consistency":        { reason: "heartbeat-only" },
  "permission-check":         { reason: "heartbeat-only" },
  "platform-cleanup":         { reason: "heartbeat-only" },
  "performance-audit":        { reason: "heartbeat-only" },
  "journey-coherence":        { reason: "heartbeat-only" },
  "ui-ux-consistency":        { reason: "heartbeat-only" },
  "i18n-integrity":           { reason: "heartbeat-only" },
  "content-freshness":        { reason: "heartbeat-only" },
  "campaign-banner":          { reason: "heartbeat-only" },
  "social-proof":             { reason: "heartbeat-only" },
  "search-intent":            { reason: "heartbeat-only" },
  "ux-audit":                 { reason: "heartbeat-only" },
  "visual-consistency":       { reason: "heartbeat-only" },
  "geo-density":              { reason: "heartbeat-only" },
  "fx-refresh":               { reason: "heartbeat-only" },
  "merchandising":            { reason: "heartbeat-only" },
  "boost-slot-refresh":       { reason: "heartbeat-only" },
  "crm-reactivation":         { reason: "heartbeat-only" },
  "coupon-expiration":        { reason: "heartbeat-only" },
  "live-status-refresh":      { reason: "heartbeat-only" },
  "call-log-cleanup":         { reason: "heartbeat-only" },
  "review-trigger":           { reason: "heartbeat-only" },
  "loyalty-scan":             { reason: "heartbeat-only" },
  "staff-sync":               { reason: "heartbeat-only" },
  "reorder-check":            { reason: "heartbeat-only" },
  "dead-flow-elimination":    { reason: "heartbeat-only" },
  "ux-autotest":              { reason: "heartbeat-only" },
  "hyper-radar":              { reason: "heartbeat-only" },
  "behavior-pattern":         { reason: "heartbeat-only" },
  "vibe-density":             { reason: "heartbeat-only" },
  "ride-tracking-monitor":    { reason: "heartbeat-only" },
  "data-completeness":        { reason: "heartbeat-only" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUMMARY HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function getGovernanceSummary() {
  const engines = Object.entries(GOVERNED_ENGINES);
  const byBrain: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const byMode: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  const critical: string[] = [];

  for (const [name, e] of engines) {
    byBrain[e.brain] = (byBrain[e.brain] || 0) + 1;
    byStage[e.stage] = (byStage[e.stage] || 0) + 1;
    byMode[e.mode] = (byMode[e.mode] || 0) + 1;
    byTier[e.tier] = (byTier[e.tier] || 0) + 1;
    if (e.tier === "critical") critical.push(name);
  }

  return {
    totalActive: engines.length,
    totalDisabled: Object.keys(DISABLED_ENGINES).length,
    byBrain,
    byStage,
    byMode,
    byTier,
    criticalEngines: critical,
    mergedPairs: engines.filter(([, e]) => e.mergedFrom).map(([name, e]) => ({
      canonical: name,
      merged: e.mergedFrom!,
    })),
  };
}
