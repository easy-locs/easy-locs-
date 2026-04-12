import type { RepairOperationType } from "./repair-actions";
import type { RepairLevel } from "./proof-system";
import type { IssueCategory, IssueSeverity } from "./repair-pipeline";
import { hasDomainActivationSheet } from "./repair-safety";
import type { RepairPriority, MutationCost, CooldownPolicy } from "./repair-hardening";
import { comparePriority } from "./repair-hardening";

export interface DomainRepairRule {
  id: string;
  domain: string;
  issuePattern: RegExp;
  category: IssueCategory;
  severity: IssueSeverity;
  operation: RepairOperationType;
  target: string;
  repairLevel: RepairLevel;
  maxRetries: number;
  cooldownMs: number;
  description: string;
  priority: RepairPriority;
  minConfidence: number;
  mutationCost: MutationCost;
  wrapperMutation: boolean;
  cooldownPolicy: CooldownPolicy;
}

export interface RuleMatch {
  rule: DomainRepairRule;
  confidence: number;
}

const DOMAIN_RULES: DomainRepairRule[] = [
  {
    id: "dashboard:card:stale_refresh",
    domain: "dashboard",
    issuePattern: /card[:\-_]stale|card[:\-_]expired|stale[:\-_]card/i,
    category: "data",
    severity: "low",
    operation: "refresh",
    target: "el-dashboard-cards",
    repairLevel: "L2",
    maxRetries: 3,
    cooldownMs: 60_000,
    description: "Refresh stale dashboard cards from cache",
    priority: "cosmetic_layout",
    minConfidence: 0.5,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 60_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  },
  {
    id: "dashboard:cache:invalidate",
    domain: "dashboard",
    issuePattern: /cache[:\-_]corrupt|cache[:\-_]invalid|dashboard[:\-_]cache/i,
    category: "state",
    severity: "medium",
    operation: "invalidate",
    target: "el-dashboard-cache",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 120_000,
    description: "Invalidate corrupted dashboard cache",
    priority: "severe_visibility",
    minConfidence: 0.6,
    mutationCost: 2,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 120_000, escalationFactor: 2.0, maxCooldownMs: 600_000 },
  },
  {
    id: "dashboard:layout:fallback",
    domain: "dashboard",
    issuePattern: /layout[:\-_]broken|render[:\-_]fail|card[:\-_]render/i,
    category: "render",
    severity: "medium",
    operation: "fallback",
    target: "el-dashboard-layout",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 300_000,
    description: "Fall back to safe dashboard layout on render failure",
    priority: "critical_layout",
    minConfidence: 0.7,
    mutationCost: 3,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 300_000, escalationFactor: 2.0, maxCooldownMs: 1_800_000 },
  },
  {
    id: "taxonomy:reclassify:high_confidence",
    domain: "taxonomy",
    issuePattern: /taxonomy[:\-_]violation|misclassif|vertical[:\-_]mismatch/i,
    category: "data",
    severity: "low",
    operation: "refresh",
    target: "el-taxonomy-classifications",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 300_000,
    description: "Re-classify entity with >95% confidence taxonomy match",
    priority: "text_integrity",
    minConfidence: 0.7,
    mutationCost: 2,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 300_000, escalationFactor: 2.0, maxCooldownMs: 1_800_000 },
  },
  {
    id: "taxonomy:invalid:quarantine",
    domain: "taxonomy",
    issuePattern: /schema[:\-_]invalid|taxonomy[:\-_]reject|validation[:\-_]fail/i,
    category: "data",
    severity: "medium",
    operation: "invalidate",
    target: "el-taxonomy-invalid",
    repairLevel: "L2",
    maxRetries: 1,
    cooldownMs: 600_000,
    description: "Quarantine entities failing taxonomy schema validation",
    priority: "severe_visibility",
    minConfidence: 0.7,
    mutationCost: 2,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 600_000, escalationFactor: 2.0, maxCooldownMs: 1_800_000 },
  },
  {
    id: "media:broken_image:fallback",
    domain: "media",
    issuePattern: /broken[:\-_]image|image[:\-_]404|media[:\-_]missing|asset[:\-_]fail/i,
    category: "data",
    severity: "low",
    operation: "fallback",
    target: "el-media-assets",
    repairLevel: "L2",
    maxRetries: 3,
    cooldownMs: 60_000,
    description: "Apply fallback placeholder for broken media assets",
    priority: "severe_visibility",
    minConfidence: 0.6,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 60_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  },
  {
    id: "media:cache:refresh",
    domain: "media",
    issuePattern: /media[:\-_]stale|media[:\-_]cache|asset[:\-_]expired/i,
    category: "state",
    severity: "low",
    operation: "refresh",
    target: "el-media-cache",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 120_000,
    description: "Refresh stale media cache entries",
    priority: "cosmetic_layout",
    minConfidence: 0.5,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 120_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  },
  {
    id: "notification:delivery:retry",
    domain: "notification",
    issuePattern: /delivery[:\-_]fail|notification[:\-_]stuck|push[:\-_]fail/i,
    category: "network",
    severity: "medium",
    operation: "refresh",
    target: "el-notification-queue",
    repairLevel: "L2",
    maxRetries: 3,
    cooldownMs: 30_000,
    description: "Retry failed notification delivery",
    priority: "text_integrity",
    minConfidence: 0.6,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 30_000, escalationFactor: 1.5, maxCooldownMs: 120_000 },
  },
  {
    id: "notification:duplicate:suppress",
    domain: "notification",
    issuePattern: /duplicate[:\-_]notif|notification[:\-_]dup|dedup[:\-_]fail/i,
    category: "data",
    severity: "low",
    operation: "suppress",
    target: "el-notification-dedup",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 60_000,
    description: "Suppress duplicate notification delivery",
    priority: "cosmetic_layout",
    minConfidence: 0.5,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 60_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  },
  {
    id: "marketplace:listing:quarantine",
    domain: "marketplace",
    issuePattern: /listing[:\-_]corrupt|listing[:\-_]invalid|data[:\-_]integrity/i,
    category: "data",
    severity: "medium",
    operation: "invalidate",
    target: "el-marketplace-listings",
    repairLevel: "L2",
    maxRetries: 1,
    cooldownMs: 600_000,
    description: "Quarantine listings with data integrity violations",
    priority: "severe_visibility",
    minConfidence: 0.7,
    mutationCost: 2,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 600_000, escalationFactor: 2.0, maxCooldownMs: 1_800_000 },
  },
  {
    id: "marketplace:taxonomy:fix",
    domain: "marketplace",
    issuePattern: /marketplace[:\-_]taxonomy|listing[:\-_]misclass|vertical[:\-_]wrong/i,
    category: "data",
    severity: "low",
    operation: "refresh",
    target: "el-marketplace-taxonomy",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 300_000,
    description: "Refresh marketplace listing taxonomy classifications",
    priority: "text_integrity",
    minConfidence: 0.6,
    mutationCost: 2,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 300_000, escalationFactor: 2.0, maxCooldownMs: 1_800_000 },
  },
  {
    id: "marketplace:search:reindex",
    domain: "marketplace",
    issuePattern: /search[:\-_]stale|index[:\-_]drift|search[:\-_]miss/i,
    category: "state",
    severity: "medium",
    operation: "invalidate",
    target: "el-marketplace-search-index",
    repairLevel: "L2",
    maxRetries: 1,
    cooldownMs: 600_000,
    description: "Invalidate stale marketplace search index",
    priority: "severe_visibility",
    minConfidence: 0.6,
    mutationCost: 2,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 600_000, escalationFactor: 2.0, maxCooldownMs: 1_800_000 },
  },
  {
    id: "media:url:invalidate",
    domain: "media",
    issuePattern: /url[:\-_]broken|cdn[:\-_]fail|media[:\-_]404|image[:\-_]load[:\-_]fail/i,
    category: "network",
    severity: "medium",
    operation: "invalidate",
    target: "el-media-urls",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 120_000,
    description: "Invalidate broken media URL entries for CDN re-resolution",
    priority: "severe_visibility",
    minConfidence: 0.6,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 120_000, escalationFactor: 1.5, maxCooldownMs: 600_000 },
  },
  {
    id: "ui:overflow:fix",
    domain: "ui",
    issuePattern: /overflow|clipping|text[:\-_]clip/i,
    category: "render",
    severity: "medium",
    operation: "fallback",
    target: "el-ui-dom-patches",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 60_000,
    description: "Apply safe DOM patches for overflow and clipping issues",
    priority: "critical_layout",
    minConfidence: 0.6,
    mutationCost: 2,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 60_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  },
  {
    id: "ui:tap_target:fix",
    domain: "ui",
    issuePattern: /tap[:\-_]target|tiny[:\-_]button|touch[:\-_]target/i,
    category: "render",
    severity: "low",
    operation: "fallback",
    target: "el-ui-tap-targets",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 60_000,
    description: "Expand undersized tap targets to minimum touch size",
    priority: "cosmetic_layout",
    minConfidence: 0.5,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 60_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  },
  {
    id: "text:truncation:fix",
    domain: "text",
    issuePattern: /text[:\-_]truncat|too[:\-_]long|overflow[:\-_]risk/i,
    category: "render",
    severity: "low",
    operation: "refresh",
    target: "el-text-integrity",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 60_000,
    description: "Sanitize truncated or overflowing text content",
    priority: "text_integrity",
    minConfidence: 0.5,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 30_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  },
  {
    id: "text:encoding:fix",
    domain: "text",
    issuePattern: /encoding|placeholder|broken[:\-_]char/i,
    category: "data",
    severity: "medium",
    operation: "invalidate",
    target: "el-text-encoding",
    repairLevel: "L2",
    maxRetries: 1,
    cooldownMs: 120_000,
    description: "Remove broken encoding characters and placeholder content",
    priority: "text_integrity",
    minConfidence: 0.7,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 120_000, escalationFactor: 2.0, maxCooldownMs: 600_000 },
  },
  {
    id: "i18n:untranslated:fix",
    domain: "i18n",
    issuePattern: /untranslated|dotted[:\-_]label|raw[:\-_]key/i,
    category: "render",
    severity: "low",
    operation: "refresh",
    target: "el-i18n-patches",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 60_000,
    description: "Titleize untranslated raw keys and dotted labels",
    priority: "i18n_surface",
    minConfidence: 0.5,
    mutationCost: 1,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 30_000, escalationFactor: 1.5, maxCooldownMs: 300_000 },
  },
  {
    id: "layout:card:normalize",
    domain: "layout",
    issuePattern: /card[:\-_]layout|broken[:\-_]card|card[:\-_]height/i,
    category: "render",
    severity: "medium",
    operation: "fallback",
    target: "el-layout-cards",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 120_000,
    description: "Normalize broken card layouts with safe flex defaults",
    priority: "severe_visibility",
    minConfidence: 0.6,
    mutationCost: 2,
    wrapperMutation: false,
    cooldownPolicy: { baseCooldownMs: 120_000, escalationFactor: 2.0, maxCooldownMs: 600_000 },
  },
  {
    id: "layout:overlap:fix",
    domain: "layout",
    issuePattern: /element[:\-_]overlap|collision|strangling/i,
    category: "render",
    severity: "medium",
    operation: "fallback",
    target: "el-layout-overlaps",
    repairLevel: "L2",
    maxRetries: 2,
    cooldownMs: 120_000,
    description: "Resolve element overlaps and strangling wrappers",
    priority: "severe_visibility",
    minConfidence: 0.7,
    mutationCost: 3,
    wrapperMutation: true,
    cooldownPolicy: { baseCooldownMs: 300_000, escalationFactor: 2.0, maxCooldownMs: 1_800_000 },
  },
];

export function matchRepairRule(domain: string, issueSignature: string): RuleMatch | null {
  if (!hasDomainActivationSheet(domain)) {
    return null;
  }

  const domainRules = DOMAIN_RULES
    .filter(r => r.domain === domain)
    .sort((a, b) => comparePriority(a.priority, b.priority));

  for (const rule of domainRules) {
    if (rule.issuePattern.test(issueSignature)) {
      return { rule, confidence: 0.9 };
    }
  }

  return null;
}

export function matchAllRepairRules(domain: string, issueSignature: string): RuleMatch[] {
  if (!hasDomainActivationSheet(domain)) {
    return [];
  }

  return DOMAIN_RULES
    .filter(r => r.domain === domain && r.issuePattern.test(issueSignature))
    .sort((a, b) => comparePriority(a.priority, b.priority))
    .map(rule => ({ rule, confidence: 0.9 }));
}

export function getRulesForDomain(domain: string): DomainRepairRule[] {
  return DOMAIN_RULES
    .filter(r => r.domain === domain)
    .sort((a, b) => comparePriority(a.priority, b.priority));
}

export function getAllRules(): DomainRepairRule[] {
  return [...DOMAIN_RULES].sort((a, b) => comparePriority(a.priority, b.priority));
}

export function getRuleById(id: string): DomainRepairRule | undefined {
  return DOMAIN_RULES.find(r => r.id === id);
}

export function getRuleCount(): number {
  return DOMAIN_RULES.length;
}

export function getActivatedDomains(): string[] {
  const domains = new Set(DOMAIN_RULES.map(r => r.domain));
  return Array.from(domains).filter(d => hasDomainActivationSheet(d));
}

export function getDomainRuleReport() {
  const domains = new Set(DOMAIN_RULES.map(r => r.domain));
  const report: Record<string, { ruleCount: number; hasSheet: boolean; rules: string[] }> = {};

  for (const domain of domains) {
    const rules = DOMAIN_RULES.filter(r => r.domain === domain);
    report[domain] = {
      ruleCount: rules.length,
      hasSheet: hasDomainActivationSheet(domain),
      rules: rules.map(r => r.id),
    };
  }

  return report;
}
