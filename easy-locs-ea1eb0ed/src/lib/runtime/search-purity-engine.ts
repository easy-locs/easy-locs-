/**
 * search-purity-engine — Enforces vertical-isolated search results.
 * Prevents cross-vertical pollution, validates index integrity,
 * detects duplicate entities in search results.
 */

import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { CANONICAL_VERTICALS, type CanonicalVertical } from "@/domains/shared/canonical-types";

export interface SearchPurityViolation {
  type: "cross_vertical" | "duplicate_entity" | "invalid_entity" | "polluted_index" | "missing_vertical_filter";
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  context?: Record<string, unknown>;
}

let purityViolations: SearchPurityViolation[] = [];
const MAX_VIOLATIONS = 200;

const VERTICAL_SET = new Set<string>(CANONICAL_VERTICALS);

export function validateSearchResults(
  query: string,
  targetVertical: string | null,
  results: Array<{ id: string; name?: string; vertical?: string; type?: string }>
): SearchPurityViolation[] {
  const found: SearchPurityViolation[] = [];
  const now = new Date().toISOString();

  if (targetVertical && !VERTICAL_SET.has(targetVertical)) {
    found.push({
      type: "missing_vertical_filter",
      detail: `Search query "${query}" targets unknown vertical "${targetVertical}"`,
      severity: "high",
      detectedAt: now,
      context: { query, targetVertical },
    });
  }

  if (targetVertical) {
    const crossVertical = results.filter(r => r.vertical && r.vertical !== targetVertical);
    if (crossVertical.length > 0) {
      found.push({
        type: "cross_vertical",
        detail: `Search for "${query}" in "${targetVertical}" returned ${crossVertical.length} results from other verticals: ${[...new Set(crossVertical.map(r => r.vertical))].join(", ")}`,
        severity: "critical",
        detectedAt: now,
        context: { query, targetVertical, crossVerticalCount: crossVertical.length },
      });
    }
  }

  const idSet = new Set<string>();
  const duplicates: string[] = [];
  for (const r of results) {
    if (idSet.has(r.id)) {
      duplicates.push(r.id);
    }
    idSet.add(r.id);
  }
  if (duplicates.length > 0) {
    found.push({
      type: "duplicate_entity",
      detail: `Search results contain ${duplicates.length} duplicate entity IDs: ${duplicates.slice(0, 5).join(", ")}`,
      severity: "high",
      detectedAt: now,
      context: { duplicates },
    });
  }

  const invalidEntities = results.filter(r => !r.vertical || !VERTICAL_SET.has(r.vertical));
  if (invalidEntities.length > 0) {
    found.push({
      type: "invalid_entity",
      detail: `${invalidEntities.length} search results have missing/invalid vertical assignment`,
      severity: "high",
      detectedAt: now,
      context: { invalidIds: invalidEntities.map(r => r.id).slice(0, 10) },
    });
  }

  if (found.length > 0) {
    purityViolations = [...found, ...purityViolations].slice(0, MAX_VIOLATIONS);
    for (const v of found.filter(x => x.severity === "critical")) {
      reportAnomaly("architecture_violation", "search-purity", v.detail, "critical", v.context);
    }
  }

  return found;
}

export function validateSearchIndex(
  indexEntries: Array<{ id: string; vertical?: string; name?: string }>
): { total: number; valid: number; invalid: number; violations: SearchPurityViolation[] } {
  const now = new Date().toISOString();
  const violations: SearchPurityViolation[] = [];

  const idCounts = new Map<string, number>();
  for (const entry of indexEntries) {
    idCounts.set(entry.id, (idCounts.get(entry.id) || 0) + 1);
  }

  const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1);
  if (duplicateIds.length > 0) {
    violations.push({
      type: "polluted_index",
      detail: `Search index contains ${duplicateIds.length} duplicate IDs: ${duplicateIds.map(([id]) => id).slice(0, 5).join(", ")}`,
      severity: "high",
      detectedAt: now,
      context: { duplicateIds: duplicateIds.map(([id, count]) => ({ id, count })) },
    });
  }

  const missingVertical = indexEntries.filter(e => !e.vertical || !VERTICAL_SET.has(e.vertical));
  if (missingVertical.length > 0) {
    violations.push({
      type: "invalid_entity",
      detail: `${missingVertical.length} index entries have missing/invalid vertical`,
      severity: "high",
      detectedAt: now,
    });
  }

  const valid = indexEntries.length - missingVertical.length;

  if (violations.length > 0) {
    purityViolations = [...violations, ...purityViolations].slice(0, MAX_VIOLATIONS);
  }

  return { total: indexEntries.length, valid, invalid: missingVertical.length, violations };
}

export function getSearchPurityViolations(): SearchPurityViolation[] {
  return [...purityViolations];
}

export function clearSearchPurityViolations(): void {
  purityViolations = [];
}

export function runSearchPurityEngine(): { status: "clean" | "violations"; violationCount: number } {
  const violationCount = purityViolations.length;
  const criticalCount = purityViolations.filter(v => v.severity === "critical").length;
  const status: "clean" | "violations" = violationCount > 0 ? "violations" : "clean";

  reportHealth(
    "search",
    criticalCount > 0 ? "degraded" : "ok",
    undefined,
    violationCount > 0 ? `${violationCount} search purity violations (${criticalCount} critical)` : undefined
  );

  structuredLogger.info("search", "enforceSearchPurity", `Search purity enforcement active — ${status === "clean" ? "vertical isolation locked" : `${violationCount} violations detected`}`);
  return { status, violationCount };
}
