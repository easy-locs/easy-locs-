import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, ExecutionMode, RemediationEntry, RemediationPlaybook, PlaybookId } from "../types";
import { engineRegistry } from "../engine-registry";

const PLAYBOOKS: RemediationPlaybook[] = [
  {
    id: "wrong_taxonomy_remap",
    name: "Wrong Taxonomy Remap",
    triggerConditions: ["WRONG_VERTICAL where canonical match exists", "INVALID_SUBCATEGORY with exact match in taxonomy"],
    confidenceRequired: "high",
    action: "remapped",
    decisionTier: "SAFE_AUTOFIX",
    logging: "Log before/after vertical/subcategory with entity ID",
    rollbackSupported: true,
    description: "Remap entities with wrong vertical/subcategory where an exact canonical mapping exists",
  },
  {
    id: "wrong_route_remap",
    name: "Wrong Route Remap",
    triggerConditions: ["ROUTE_MISMATCH where canonical entity type has a known route pattern"],
    confidenceRequired: "high",
    action: "remapped",
    decisionTier: "SAFE_AUTOFIX",
    logging: "Log before/after route with entity ID",
    rollbackSupported: true,
    description: "Remap routes where exact canonical mapping exists for the entity type",
  },
  {
    id: "exact_duplicate_suppress",
    name: "Exact Duplicate Suppress",
    triggerConditions: ["DUPLICATE_ID across sources", "DUPLICATE_SLUG with identical content"],
    confidenceRequired: "high",
    action: "suppressed",
    decisionTier: "SAFE_AUTOFIX",
    logging: "Log suppressed entity ID and kept entity ID",
    rollbackSupported: true,
    description: "Suppress exact duplicates, keeping the primary source version",
  },
  {
    id: "legacy_mock_suppress",
    name: "Legacy/Mock Leakage Suppress",
    triggerConditions: ["MOCK_LEAKAGE detected", "LEGACY_SHADOW identified"],
    confidenceRequired: "high",
    action: "suppressed",
    decisionTier: "SUPPRESS_FROM_SURFACE",
    logging: "Log suppressed mock/legacy entity ID and source",
    rollbackSupported: true,
    description: "Suppress legacy, mock, or demo data from live surfaces",
  },
  {
    id: "broken_reference_isolate",
    name: "Broken Reference Isolate",
    triggerConditions: ["BROKEN_REFERENCE with no valid parent", "ORPHAN_ENTITY"],
    confidenceRequired: "high",
    action: "quarantined",
    decisionTier: "QUARANTINE",
    logging: "Log quarantined entity with broken reference details",
    rollbackSupported: true,
    description: "Quarantine entities with broken parent/child references",
  },
  {
    id: "broken_media_suppress",
    name: "Broken Media Suppress",
    triggerConditions: ["BROKEN_MEDIA with no fallback", "MISSING_MEDIA on featured surface"],
    confidenceRequired: "high",
    action: "suppressed",
    decisionTier: "SUPPRESS_FROM_SURFACE",
    logging: "Log suppressed entity with media issue details",
    rollbackSupported: true,
    description: "Suppress entities with broken or missing media from featured surfaces",
  },
  {
    id: "missing_field_downgrade",
    name: "Missing Field Downgrade",
    triggerConditions: ["MISSING_REQUIRED_FIELDS on non-critical fields"],
    confidenceRequired: "medium",
    action: "downgraded",
    decisionTier: "SUPPRESS_FROM_SURFACE",
    logging: "Log downgraded entity with missing field list",
    rollbackSupported: true,
    description: "Downgrade entities with missing non-critical fields from premium surfaces",
  },
  {
    id: "shadow_dataset_exclude",
    name: "Shadow Dataset Exclude",
    triggerConditions: ["Source type is mock/legacy/shadow", "Low trust score on source"],
    confidenceRequired: "high",
    action: "suppressed",
    decisionTier: "SUPPRESS_FROM_SURFACE",
    logging: "Log excluded dataset source and affected entities",
    rollbackSupported: false,
    description: "Exclude entire shadow/mock datasets from live surface consumption",
  },
  {
    id: "search_index_cleanup",
    name: "Search Index Cleanup",
    triggerConditions: ["Post-quarantine", "Post-remediation with index-affecting changes"],
    confidenceRequired: "high",
    action: "auto_fixed",
    decisionTier: "SAFE_AUTOFIX",
    logging: "Log search index rebuild trigger and entity count",
    rollbackSupported: false,
    description: "Rebuild search index after quarantine or remediation changes",
  },
  {
    id: "surface_rebuild",
    name: "Surface Rebuild",
    triggerConditions: ["Post-major-remediation", "Surface contamination detected"],
    confidenceRequired: "high",
    action: "auto_fixed",
    decisionTier: "SAFE_AUTOFIX",
    logging: "Log surface rebuild trigger and scope",
    rollbackSupported: false,
    description: "Trigger surface data refresh after major remediation events",
  },
];

export function getPlaybooks(): readonly RemediationPlaybook[] {
  return PLAYBOOKS;
}

export function getPlaybook(id: PlaybookId): RemediationPlaybook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

export class SafeRemediationEngine extends DataQualityEngine {
  constructor() {
    super("SafeRemediationEngine", "Apply deterministic low-risk fixes, reclassify obvious taxonomy-safe cases, suppress duplicates and mock data", { priority: 7 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const allFindings = engineRegistry.getAllFindings();
    return allFindings.filter((f) =>
      f.decisionTier === "SAFE_AUTOFIX" || f.decisionTier === "SUPPRESS_FROM_SURFACE"
    );
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    return findings;
  }

  remediate(findings: EntityFinding[], mode: ExecutionMode): RemediationEntry[] {
    if (mode === "DRY_RUN") return [];
    const remediations: RemediationEntry[] = [];
    const now = new Date().toISOString();

    for (const f of findings) {
      if (f.decisionTier === "SAFE_AUTOFIX") {
        const playbook = this.matchPlaybook(f);
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "auto_fixed",
          beforeState: f.classification,
          afterState: "remediated",
          reason: `Safe auto-fix via ${playbook?.name ?? "generic"}: ${f.issues.map((i) => i.code).join(", ")}`,
          confidence: "high",
          timestamp: now,
          engineName: this.name,
          decisionTier: "SAFE_AUTOFIX",
          playbook: playbook?.id,
        });
      } else if (f.decisionTier === "SUPPRESS_FROM_SURFACE") {
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "suppressed",
          beforeState: "visible",
          afterState: "suppressed",
          reason: `Surface suppression: ${f.issues.map((i) => i.code).join(", ")}`,
          confidence: "high",
          timestamp: now,
          engineName: this.name,
          decisionTier: "SUPPRESS_FROM_SURFACE",
          playbook: "broken_media_suppress",
        });
      }
    }
    return remediations;
  }

  private matchPlaybook(finding: EntityFinding): RemediationPlaybook | undefined {
    const codes = finding.issues.map((i) => i.code);
    if (codes.includes("WRONG_VERTICAL")) return getPlaybook("wrong_taxonomy_remap");
    if (codes.includes("DUPLICATE_ID")) return getPlaybook("exact_duplicate_suppress");
    if (codes.includes("MOCK_LEAKAGE")) return getPlaybook("legacy_mock_suppress");
    if (codes.includes("ROUTE_MISMATCH")) return getPlaybook("wrong_route_remap");
    return undefined;
  }
}
