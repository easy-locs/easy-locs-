import {
  ARCHITECTURE_RULES,
  DOMAIN_BOUNDARIES,
  getArchitectureViolations,
  getViolationCount,
  getDomainOwnership,
  type ArchitectureViolation,
} from "./domain-boundaries";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { recordAction } from "@/lib/control-plane/domain-health";
import { CARD_REGISTRY, hasKnownAdapter } from "@/domains/cards/card-registry";

export interface RouteRegistryEntry {
  path: string;
  component: string;
  guarded: boolean;
}

export interface ArchitectureReport {
  timestamp: string;
  violations: ArchitectureViolation[];
  violation_summary: { errors: number; warnings: number; total: number };
  domain_coverage: DomainCoverage[];
  route_audit: RouteAuditResult;
  card_registry_audit: CardRegistryAuditResult;
  overall_grade: "A" | "B" | "C" | "D" | "F";
}

export interface DomainCoverage {
  domain: string;
  has_boundary: boolean;
  owned_paths: string[];
  violation_count: number;
}

export interface RouteAuditResult {
  total_routes: number;
  unguarded_routes: number;
  duplicate_paths: string[];
  orphan_routes: string[];
}

export interface CardRegistryAuditResult {
  total_cards: number;
  cards_with_adapters: number;
  cards_without_adapters: number;
  missing_adapters: string[];
}

export function auditCardRegistry(): CardRegistryAuditResult {
  const entries = Object.values(CARD_REGISTRY);
  const missing: string[] = [];
  let withAdapter = 0;

  for (const entry of entries) {
    if (hasKnownAdapter(entry.key)) {
      withAdapter++;
    } else {
      missing.push(entry.key);
    }
  }

  return {
    total_cards: entries.length,
    cards_with_adapters: withAdapter,
    cards_without_adapters: missing.length,
    missing_adapters: missing,
  };
}

export function auditDomainCoverage(): DomainCoverage[] {
  const violations = getArchitectureViolations();
  const allDomains = new Set([
    ...DOMAIN_BOUNDARIES.map((b) => b.domain),
    ...violations.map((v) => v.domain).filter(Boolean) as string[],
  ]);

  return [...allDomains].map((domain) => {
    const boundary = DOMAIN_BOUNDARIES.find((b) => b.domain === domain);
    const domainViolations = violations.filter((v) => v.domain === domain);
    return {
      domain,
      has_boundary: !!boundary,
      owned_paths: boundary?.owns ?? [],
      violation_count: domainViolations.length,
    };
  });
}

export function runArchitectureAudit(
  routes?: RouteRegistryEntry[]
): ArchitectureReport {
  const start = performance.now();

  const violations = getArchitectureViolations();
  const violationSummary = getViolationCount();
  const domainCoverage = auditDomainCoverage();
  const cardAudit = auditCardRegistry();

  const routeAudit: RouteAuditResult = {
    total_routes: routes?.length ?? 0,
    unguarded_routes: routes?.filter((r) => !r.guarded).length ?? 0,
    duplicate_paths: findDuplicates(routes?.map((r) => r.path) ?? []),
    orphan_routes: [],
  };

  let grade: ArchitectureReport["overall_grade"];
  const errorCount = violationSummary.errors;
  const missingAdapters = cardAudit.cards_without_adapters;
  const unguarded = routeAudit.unguarded_routes;

  if (errorCount === 0 && missingAdapters === 0 && unguarded === 0) {
    grade = "A";
  } else if (errorCount <= 3 && missingAdapters <= 2) {
    grade = "B";
  } else if (errorCount <= 8 && missingAdapters <= 5) {
    grade = "C";
  } else if (errorCount <= 15) {
    grade = "D";
  } else {
    grade = "F";
  }

  const elapsed = Math.round(performance.now() - start);
  recordAction("admin", "architecture_audit", grade !== "F", elapsed);

  structuredLogger.info("admin", "architecture_audit", `Architecture audit: grade=${grade}`, {
    grade,
    errors: errorCount,
    warnings: violationSummary.warnings,
    domain_count: domainCoverage.length,
    card_coverage: `${cardAudit.cards_with_adapters}/${cardAudit.total_cards}`,
    elapsed_ms: elapsed,
  });

  return {
    timestamp: new Date().toISOString(),
    violations,
    violation_summary: violationSummary,
    domain_coverage: domainCoverage,
    route_audit: routeAudit,
    card_registry_audit: cardAudit,
    overall_grade: grade,
  };
}

function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const item of arr) {
    if (seen.has(item)) dupes.add(item);
    seen.add(item);
  }
  return [...dupes];
}

export function validateImportBoundary(
  filePath: string,
  importPath: string,
): { valid: boolean; violation?: string } {
  const ownerDomain = getDomainOwnership(filePath);
  if (!ownerDomain) return { valid: true };

  const boundary = DOMAIN_BOUNDARIES.find((b) => b.domain === ownerDomain);
  if (!boundary) return { valid: true };

  for (const forbidden of boundary.forbidden_imports) {
    if (importPath.includes(forbidden)) {
      return {
        valid: false,
        violation: `File "${filePath}" in domain "${ownerDomain}" imports forbidden "${importPath}" (rule: ${forbidden})`,
      };
    }
  }

  return { valid: true };
}

export { getDomainOwnership, getArchitectureViolations, getViolationCount };
