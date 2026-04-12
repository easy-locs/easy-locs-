import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, ExecutionMode, RemediationEntry } from "../types";
import { isQuarantined } from "../quarantine";
import { isSuppressedFromSurface } from "./live-surface-sanitizer-engine";
import { getEntityQualityScore } from "./data-quality-scoring-engine";
import { engineRegistry } from "../engine-registry";

const searchExcluded = new Set<string>();
const searchDowngraded = new Set<string>();

export function isSearchExcluded(entityId: string): boolean {
  return searchExcluded.has(entityId) || isQuarantined(entityId);
}

export function isSearchDowngraded(entityId: string): boolean {
  return searchDowngraded.has(entityId);
}

export function getSearchExcludedCount(): number {
  return searchExcluded.size;
}

export function getSearchDowngradedCount(): number {
  return searchDowngraded.size;
}

export function resetSearchState(): void {
  searchExcluded.clear();
  searchDowngraded.clear();
}

export class SearchHygieneEngine extends DataQualityEngine {
  constructor() {
    super("SearchHygieneEngine", "Clean indexed content, remove/downgrade quarantined/invalid/shadow entities from search/discovery", { priority: 9 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const allFindings = engineRegistry.getAllFindings();
    const searchIssues: EntityFinding[] = [];

    for (const f of allFindings) {
      const shouldExclude =
        isQuarantined(f.entityId) ||
        isSuppressedFromSurface(f.entityId) ||
        f.classification === "INVALID" ||
        f.classification === "CROSS_VERTICAL_CONTAMINATION" ||
        f.classification === "ORPHAN" ||
        f.classification === "LEGACY_SHADOW";

      const shouldDowngrade =
        !shouldExclude && (
          f.classification === "SUSPICIOUS" ||
          f.classification === "BROKEN_MEDIA" ||
          f.classification === "DUPLICATE" ||
          getEntityQualityScore(f.entityId) < 50
        );

      if (shouldExclude) {
        searchIssues.push({
          ...f,
          decisionTier: "SUPPRESS_FROM_SURFACE",
          surfaceVisibility: "excluded",
        });
      } else if (shouldDowngrade) {
        searchIssues.push({
          ...f,
          decisionTier: "SUPPRESS_FROM_SURFACE",
          surfaceVisibility: "downgraded",
        });
      }
    }

    return searchIssues;
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    return findings;
  }

  remediate(findings: EntityFinding[], mode: ExecutionMode): RemediationEntry[] {
    if (mode === "DRY_RUN") return [];
    const remediations: RemediationEntry[] = [];
    const now = new Date().toISOString();

    for (const f of findings) {
      if (f.surfaceVisibility === "excluded") {
        searchExcluded.add(f.entityId);
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "suppressed",
          beforeState: "indexed",
          afterState: "excluded_from_search",
          reason: `Search exclusion: ${f.classification}`,
          confidence: "high",
          timestamp: now,
          engineName: this.name,
          decisionTier: "SUPPRESS_FROM_SURFACE",
          playbook: "search_index_cleanup",
        });
      } else if (f.surfaceVisibility === "downgraded") {
        searchDowngraded.add(f.entityId);
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "downgraded",
          beforeState: "normal_ranking",
          afterState: "downgraded_ranking",
          reason: `Search downgrade: ${f.classification}`,
          confidence: "medium",
          timestamp: now,
          engineName: this.name,
          decisionTier: "SUPPRESS_FROM_SURFACE",
        });
      }
    }

    return remediations;
  }
}
