import {
  isValidVertical,
  isValidCategoryChain,
  validateCanonicalNode,
} from "@/lib/taxonomy/canonical-registry";
import { quarantineEntity } from "@/services/quarantine/quarantine-system";

export interface MappingCorrection {
  entityId: string;
  entityType: string;
  field: string;
  issue: "taxonomy_mismatch" | "broken_fk" | "stale_metadata" | "mixed_schema" | "invalid_vertical" | "orphan_reference";
  before: unknown;
  after: unknown;
  action: "corrected" | "quarantined" | "flagged";
  timestamp: string;
  details: string;
}

export interface MappingEntity {
  id: string;
  name?: string;
  vertical?: string;
  category?: string;
  subcategory?: string;
  canonicalType?: string;
  canonicalSubtype?: string;
  canonicalPath?: string;
  parentId?: string | null;
  foreignKeys?: Record<string, string | null>;
  metadata?: Record<string, unknown>;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface MappingCorrectionResult {
  scanned: number;
  corrected: number;
  quarantined: number;
  flagged: number;
  corrections: MappingCorrection[];
  correctedEntities: MappingEntity[];
  quarantinedEntityIds: string[];
  durationMs: number;
}

const KNOWN_VERTICALS = [
  "food", "grocery", "services", "marketplace", "real_estate",
  "travel", "transport", "health", "education", "finance",
  "entertainment", "government", "utilities", "automotive",
];

const STALENESS_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;

function isStaleMetadata(entity: MappingEntity): boolean {
  if (!entity.updatedAt) return false;
  const updated = new Date(entity.updatedAt).getTime();
  return Date.now() - updated > STALENESS_THRESHOLD_MS;
}

function validateTaxonomyMapping(entity: MappingEntity): MappingCorrection[] {
  const corrections: MappingCorrection[] = [];
  const now = new Date().toISOString();

  if (entity.vertical && !isValidVertical(entity.vertical)) {
    const closestVertical = findClosestVertical(entity.vertical);
    if (closestVertical) {
      corrections.push({
        entityId: entity.id,
        entityType: entity.canonicalType ?? "unknown",
        field: "vertical",
        issue: "invalid_vertical",
        before: entity.vertical,
        after: closestVertical,
        action: "corrected",
        timestamp: now,
        details: `Invalid vertical "${entity.vertical}" corrected to "${closestVertical}"`,
      });
    } else {
      corrections.push({
        entityId: entity.id,
        entityType: entity.canonicalType ?? "unknown",
        field: "vertical",
        issue: "invalid_vertical",
        before: entity.vertical,
        after: null,
        action: "quarantined",
        timestamp: now,
        details: `Invalid vertical "${entity.vertical}" with no close match`,
      });
    }
  }

  if (entity.vertical && entity.category && entity.subcategory) {
    if (!isValidCategoryChain(entity.vertical, entity.category, entity.subcategory)) {
      corrections.push({
        entityId: entity.id,
        entityType: entity.canonicalType ?? "unknown",
        field: "category_chain",
        issue: "taxonomy_mismatch",
        before: `${entity.vertical}.${entity.category}.${entity.subcategory}`,
        after: null,
        action: "quarantined",
        timestamp: now,
        details: `Invalid category chain: ${entity.vertical}.${entity.category}.${entity.subcategory}`,
      });
    }
  }

  if (entity.canonicalType) {
    const validation = validateCanonicalNode({
      vertical: entity.vertical ?? "",
      category: entity.category ?? "",
      subcategory: entity.subcategory ?? "",
      canonicalType: entity.canonicalType,
      canonicalSubtype: entity.canonicalSubtype,
    });
    if (!validation.valid) {
      corrections.push({
        entityId: entity.id,
        entityType: entity.canonicalType,
        field: "canonical_node",
        issue: "taxonomy_mismatch",
        before: { type: entity.canonicalType, subtype: entity.canonicalSubtype },
        after: null,
        action: "flagged",
        timestamp: now,
        details: `Canonical node invalid: ${validation.errors.join("; ")}`,
      });
    }
  }

  return corrections;
}

function validateForeignKeys(entity: MappingEntity, allEntityIds: Set<string>): MappingCorrection[] {
  const corrections: MappingCorrection[] = [];
  const now = new Date().toISOString();

  if (entity.parentId && !allEntityIds.has(entity.parentId)) {
    corrections.push({
      entityId: entity.id,
      entityType: entity.canonicalType ?? "unknown",
      field: "parentId",
      issue: "broken_fk",
      before: entity.parentId,
      after: null,
      action: "corrected",
      timestamp: now,
      details: `Parent entity "${entity.parentId}" does not exist — cleared orphan reference`,
    });
  }

  if (entity.foreignKeys) {
    for (const [fkName, fkValue] of Object.entries(entity.foreignKeys)) {
      if (fkValue && !allEntityIds.has(fkValue)) {
        corrections.push({
          entityId: entity.id,
          entityType: entity.canonicalType ?? "unknown",
          field: fkName,
          issue: "broken_fk",
          before: fkValue,
          after: null,
          action: "corrected",
          timestamp: now,
          details: `Foreign key "${fkName}" references non-existent entity "${fkValue}" — cleared`,
        });
      }
    }
  }

  return corrections;
}

function validateMetadata(entity: MappingEntity): MappingCorrection[] {
  const corrections: MappingCorrection[] = [];
  const now = new Date().toISOString();

  if (isStaleMetadata(entity)) {
    corrections.push({
      entityId: entity.id,
      entityType: entity.canonicalType ?? "unknown",
      field: "metadata",
      issue: "stale_metadata",
      before: entity.updatedAt,
      after: null,
      action: "flagged",
      timestamp: now,
      details: `Entity not updated since ${entity.updatedAt} — metadata may be stale`,
    });
  }

  if (entity.metadata) {
    for (const [key, value] of Object.entries(entity.metadata)) {
      if (value === undefined || (typeof value === "string" && value.trim() === "")) {
        corrections.push({
          entityId: entity.id,
          entityType: entity.canonicalType ?? "unknown",
          field: `metadata.${key}`,
          issue: "mixed_schema",
          before: value,
          after: null,
          action: "corrected",
          timestamp: now,
          details: `Empty or undefined metadata field "${key}" — cleaned`,
        });
      }
    }
  }

  return corrections;
}

function findClosestVertical(input: string): string | null {
  const normalized = input.toLowerCase().replace(/[^a-z]/g, "");
  for (const v of KNOWN_VERTICALS) {
    const normalizedV = v.replace(/_/g, "");
    if (normalizedV.includes(normalized) || normalized.includes(normalizedV)) {
      return v;
    }
  }
  return null;
}

function applyCorrection(entity: MappingEntity, correction: MappingCorrection): void {
  if (correction.action !== "corrected") return;

  switch (correction.field) {
    case "vertical":
      entity.vertical = correction.after as string;
      break;
    case "parentId":
      entity.parentId = null;
      break;
    default:
      if (correction.issue === "broken_fk" && entity.foreignKeys && correction.field in entity.foreignKeys) {
        entity.foreignKeys[correction.field] = null;
      }
      if (correction.issue === "mixed_schema" && correction.field.startsWith("metadata.") && entity.metadata) {
        const metaKey = correction.field.replace("metadata.", "");
        delete entity.metadata[metaKey];
      }
      break;
  }

  entity.updatedAt = new Date().toISOString();
}

export function runMappingCorrection(entities: MappingEntity[]): MappingCorrectionResult {
  const startTime = Date.now();
  const allCorrections: MappingCorrection[] = [];
  const allEntityIds = new Set(entities.map(e => e.id));
  const correctedEntities: MappingEntity[] = [];
  const quarantinedEntityIds: string[] = [];
  const entityCorrectionTracker = new Set<string>();
  const entityQuarantineTracker = new Set<string>();

  for (const entity of entities) {
    const taxonomyCorrections = validateTaxonomyMapping(entity);
    const fkCorrections = validateForeignKeys(entity, allEntityIds);
    const metadataCorrections = validateMetadata(entity);

    const entityCorrections = [...taxonomyCorrections, ...fkCorrections, ...metadataCorrections];

    for (const correction of entityCorrections) {
      if (correction.action === "corrected") {
        applyCorrection(entity, correction);
        entityCorrectionTracker.add(entity.id);
      }

      if (correction.action === "quarantined") {
        entityQuarantineTracker.add(entity.id);
        quarantinedEntityIds.push(entity.id);
        quarantineEntity({
          entityId: entity.id,
          entityType: "data_record",
          reason: correction.issue === "taxonomy_mismatch" ? "TAXONOMY_CONFLICT" : "DATA_INTEGRITY_FAILURE",
          details: correction.details,
          source: "mapping-corrector",
          metadata: { field: correction.field, before: correction.before },
        });
      }
    }

    if (entityCorrectionTracker.has(entity.id) && !entityQuarantineTracker.has(entity.id)) {
      correctedEntities.push(entity);
    }

    allCorrections.push(...entityCorrections);
  }

  const corrected = allCorrections.filter(c => c.action === "corrected").length;
  const quarantined = allCorrections.filter(c => c.action === "quarantined").length;
  const flagged = allCorrections.filter(c => c.action === "flagged").length;

  return {
    scanned: entities.length,
    corrected,
    quarantined,
    flagged,
    corrections: allCorrections,
    correctedEntities,
    quarantinedEntityIds: [...new Set(quarantinedEntityIds)],
    durationMs: Date.now() - startTime,
  };
}

export function getMappingCorrectionSummary(result: MappingCorrectionResult): string {
  const lines = [
    `=== MAPPING CORRECTION REPORT ===`,
    `Scanned: ${result.scanned} entities`,
    `Corrected: ${result.corrected}`,
    `Quarantined: ${result.quarantined}`,
    `Flagged: ${result.flagged}`,
    `Duration: ${result.durationMs}ms`,
    ``,
    `--- Corrections by Issue ---`,
  ];

  const byIssue: Record<string, number> = {};
  for (const c of result.corrections) {
    byIssue[c.issue] = (byIssue[c.issue] ?? 0) + 1;
  }

  for (const [issue, count] of Object.entries(byIssue)) {
    lines.push(`  ${issue}: ${count}`);
  }

  if (result.corrections.length > 0) {
    lines.push(``, `--- Sample Corrections ---`);
    for (const c of result.corrections.slice(0, 15)) {
      lines.push(`  [${c.action}] ${c.entityId} / ${c.field}: ${c.details}`);
    }
    if (result.corrections.length > 15) {
      lines.push(`  ... and ${result.corrections.length - 15} more`);
    }
  }

  return lines.join("\n");
}
