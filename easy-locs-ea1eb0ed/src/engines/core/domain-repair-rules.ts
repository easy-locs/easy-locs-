import type { RepairOperationType } from "./repair-actions";
import type { RepairLevel } from "./proof-system";
import type { IssueCategory, IssueSeverity } from "./repair-pipeline";
import { hasDomainActivationSheet } from "./repair-safety";

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
  },
];

export function matchRepairRule(domain: string, issueSignature: string): RuleMatch | null {
  if (!hasDomainActivationSheet(domain)) {
    return null;
  }

  const domainRules = DOMAIN_RULES.filter(r => r.domain === domain);
  if (domainRules.length === 0) return null;

  for (const rule of domainRules) {
    if (rule.issuePattern.test(issueSignature)) {
      return { rule, confidence: 0.9 };
    }
  }

  return null;
}

export function getRulesForDomain(domain: string): DomainRepairRule[] {
  return DOMAIN_RULES.filter(r => r.domain === domain);
}

export function getAllRules(): DomainRepairRule[] {
  return [...DOMAIN_RULES];
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
