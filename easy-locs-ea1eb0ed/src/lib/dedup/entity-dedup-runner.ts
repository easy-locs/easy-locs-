import {
  computeCanonicalDedupScore,
  detectDuplicates,
  groupByDuplicates,
  STRATEGIES,
  type DedupCandidate,
  type DedupResult,
  type DedupStrategyId,
} from "./canonical-dedup-engine";
import {
  isMessageDuplicate,
  markMessageSeen,
  deduplicateMessages,
} from "./message-dedup";
import { quarantineEntity } from "@/services/quarantine/quarantine-system";

export type EntityType =
  | "conversation"
  | "contact"
  | "listing"
  | "merchant"
  | "service"
  | "media"
  | "notification"
  | "wallet_record"
  | "session"
  | "import";

export interface DedupMergeLog {
  entityType: EntityType;
  survivorId: string;
  mergedIds: string[];
  confidence: number;
  strategy: DedupStrategyId;
  fieldsMerged: string[];
  action: "merged" | "rejected" | "quarantined";
  timestamp: string;
  proof: DedupMergeProof;
}

interface DedupMergeProof {
  signals: Array<{ signal: string; score: number; weight: number; detail?: string }>;
  matchedOn: string[];
  beforeCount: number;
  afterCount: number;
}

export interface EntityDedupRunResult {
  entityType: EntityType;
  scanned: number;
  duplicatesFound: number;
  merged: number;
  rejected: number;
  quarantined: number;
  survivors: DedupCandidate[];
  removedIds: string[];
  logs: DedupMergeLog[];
  durationMs: number;
}

export interface FullDedupRunResult {
  totalScanned: number;
  totalDuplicates: number;
  totalMerged: number;
  totalRejected: number;
  totalQuarantined: number;
  totalSurvivors: number;
  totalRemoved: number;
  entityResults: EntityDedupRunResult[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

const ENTITY_STRATEGY_MAP: Record<EntityType, DedupStrategyId> = {
  conversation: "generic",
  contact: "generic",
  listing: "storefront",
  merchant: "storefront",
  service: "generic",
  media: "shadow",
  notification: "shadow",
  wallet_record: "generic",
  session: "shadow",
  import: "import",
};

const MERGE_THRESHOLD: Record<EntityType, number> = {
  conversation: 90,
  contact: 85,
  listing: 95,
  merchant: 95,
  service: 90,
  media: 95,
  notification: 98,
  wallet_record: 99,
  session: 95,
  import: 90,
};

const REJECT_THRESHOLD: Record<EntityType, number> = {
  conversation: 60,
  contact: 55,
  listing: 70,
  merchant: 70,
  service: 65,
  media: 80,
  notification: 85,
  wallet_record: 90,
  session: 80,
  import: 45,
};

function toDedupCandidate(entity: Record<string, unknown>, entityType: EntityType): DedupCandidate {
  return {
    id: String(entity.id ?? ""),
    name: String(entity.name ?? entity.title ?? entity.label ?? entity.display_name ?? ""),
    phone: entity.phone ? String(entity.phone) : entity.contact_phone ? String(entity.contact_phone) : null,
    address: entity.address ? String(entity.address) : null,
    lat: typeof entity.latitude === "number" ? entity.latitude : typeof entity.lat === "number" ? entity.lat : null,
    lng: typeof entity.longitude === "number" ? entity.longitude : typeof entity.lng === "number" ? entity.lng : null,
    website: entity.website ? String(entity.website) : null,
    sourceId: entity.source_id ? String(entity.source_id) : entity.external_id ? String(entity.external_id) : null,
    orgId: entity.org_id ? String(entity.org_id) : null,
    vertical: entity.vertical ? String(entity.vertical) : null,
    city: entity.city ? String(entity.city) : null,
    brandName: entity.brand_name ? String(entity.brand_name) : null,
    branchLabel: entity.branch_label ? String(entity.branch_label) : null,
  };
}

function chooseSurvivor(group: DedupCandidate[]): DedupCandidate {
  return group.reduce((best, current) => {
    const bestFields = Object.values(best).filter(v => v != null && v !== "").length;
    const currentFields = Object.values(current).filter(v => v != null && v !== "").length;
    return currentFields > bestFields ? current : best;
  });
}

function applyMergedField(target: DedupCandidate, field: keyof DedupCandidate, value: DedupCandidate[keyof DedupCandidate]): void {
  switch (field) {
    case "phone": target.phone = value as string | null; break;
    case "address": target.address = value as string | null; break;
    case "website": target.website = value as string | null; break;
    case "city": target.city = value as string | null; break;
    case "lat": target.lat = value as number | null; break;
    case "lng": target.lng = value as number | null; break;
    default: break;
  }
}

function mergeFields(survivor: DedupCandidate, donors: DedupCandidate[]): string[] {
  const merged: string[] = [];
  const fields: (keyof DedupCandidate)[] = ["phone", "address", "website", "city", "lat", "lng"];

  for (const field of fields) {
    if (!survivor[field] && donors.some(d => d[field])) {
      const donor = donors.find(d => d[field]);
      if (donor) {
        applyMergedField(survivor, field, donor[field]);
        merged.push(field);
      }
    }
  }
  return merged;
}

export function runEntityDedup(
  records: Record<string, unknown>[],
  entityType: EntityType,
): EntityDedupRunResult {
  const startTime = Date.now();
  const strategy = ENTITY_STRATEGY_MAP[entityType];
  const mergeThreshold = MERGE_THRESHOLD[entityType];
  const rejectThreshold = REJECT_THRESHOLD[entityType];
  const logs: DedupMergeLog[] = [];

  const candidates = records.map(r => toDedupCandidate(r, entityType));

  if (candidates.length < 2) {
    return {
      entityType,
      scanned: candidates.length,
      duplicatesFound: 0,
      merged: 0,
      rejected: 0,
      quarantined: 0,
      survivors: candidates,
      removedIds: [],
      logs: [],
      durationMs: Date.now() - startTime,
    };
  }

  const matches = detectDuplicates(candidates, strategy);
  const groups = groupByDuplicates(candidates, matches);

  let merged = 0;
  let rejected = 0;
  let quarantined = 0;
  const removedIds: string[] = [];
  const survivorMap = new Map<string, DedupCandidate>();

  for (const candidate of candidates) {
    survivorMap.set(candidate.id, candidate);
  }

  for (const group of groups) {
    if (group.length < 2) continue;

    const survivor = chooseSurvivor(group);
    const donors = group.filter(c => c.id !== survivor.id);

    for (const donor of donors) {
      const result = computeCanonicalDedupScore(survivor, donor, STRATEGIES[strategy]);

      if (result.confidence >= mergeThreshold) {
        const fieldsMerged = mergeFields(survivor, [donor]);
        merged++;
        removedIds.push(donor.id);
        survivorMap.delete(donor.id);
        logs.push({
          entityType,
          survivorId: survivor.id,
          mergedIds: [donor.id],
          confidence: result.confidence,
          strategy,
          fieldsMerged,
          action: "merged",
          timestamp: new Date().toISOString(),
          proof: {
            signals: result.signals,
            matchedOn: result.matchedOn,
            beforeCount: group.length,
            afterCount: 1,
          },
        });
      } else if (result.confidence < rejectThreshold) {
        rejected++;
        logs.push({
          entityType,
          survivorId: survivor.id,
          mergedIds: [donor.id],
          confidence: result.confidence,
          strategy,
          fieldsMerged: [],
          action: "rejected",
          timestamp: new Date().toISOString(),
          proof: {
            signals: result.signals,
            matchedOn: result.matchedOn,
            beforeCount: group.length,
            afterCount: group.length,
          },
        });
      } else {
        quarantined++;
        removedIds.push(donor.id);
        survivorMap.delete(donor.id);
        quarantineEntity({
          entityId: donor.id,
          entityType: entityType === "listing" ? "listing" : entityType === "media" ? "media" : "data_record",
          reason: "DUPLICATE_CONFLICT",
          details: `Potential duplicate of ${survivor.id} with confidence ${result.confidence}%`,
          source: "entity-dedup-runner",
          confidenceScore: result.confidence / 100,
          repairSuggestion: `Review and merge with ${survivor.id} or reject`,
          metadata: { survivorId: survivor.id, strategy, signals: result.signals },
        });
        logs.push({
          entityType,
          survivorId: survivor.id,
          mergedIds: [donor.id],
          confidence: result.confidence,
          strategy,
          fieldsMerged: [],
          action: "quarantined",
          timestamp: new Date().toISOString(),
          proof: {
            signals: result.signals,
            matchedOn: result.matchedOn,
            beforeCount: group.length,
            afterCount: group.length,
          },
        });
      }
    }
  }

  return {
    entityType,
    scanned: candidates.length,
    duplicatesFound: matches.length,
    merged,
    rejected,
    quarantined,
    survivors: Array.from(survivorMap.values()),
    removedIds,
    logs,
    durationMs: Date.now() - startTime,
  };
}

export function runFullDedupSweep(
  entitySets: Partial<Record<EntityType, Record<string, unknown>[]>>,
): FullDedupRunResult {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const entityResults: EntityDedupRunResult[] = [];

  const entityTypes: EntityType[] = [
    "conversation", "contact", "listing", "merchant", "service",
    "media", "notification", "wallet_record", "session", "import",
  ];

  for (const entityType of entityTypes) {
    const records = entitySets[entityType];
    if (!records || records.length === 0) continue;
    entityResults.push(runEntityDedup(records, entityType));
  }

  const totals = entityResults.reduce(
    (acc, r) => ({
      scanned: acc.scanned + r.scanned,
      duplicates: acc.duplicates + r.duplicatesFound,
      merged: acc.merged + r.merged,
      rejected: acc.rejected + r.rejected,
      quarantined: acc.quarantined + r.quarantined,
      survivors: acc.survivors + r.survivors.length,
      removed: acc.removed + r.removedIds.length,
    }),
    { scanned: 0, duplicates: 0, merged: 0, rejected: 0, quarantined: 0, survivors: 0, removed: 0 },
  );

  return {
    totalScanned: totals.scanned,
    totalDuplicates: totals.duplicates,
    totalMerged: totals.merged,
    totalRejected: totals.rejected,
    totalQuarantined: totals.quarantined,
    totalSurvivors: totals.survivors,
    totalRemoved: totals.removed,
    entityResults,
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

export function getDedupSummary(result: FullDedupRunResult): string {
  const lines = [
    `=== ENTITY DEDUP SWEEP REPORT ===`,
    `Started: ${result.startedAt}`,
    `Completed: ${result.completedAt}`,
    `Duration: ${result.durationMs}ms`,
    ``,
    `Total scanned: ${result.totalScanned}`,
    `Total duplicates found: ${result.totalDuplicates}`,
    `Total merged: ${result.totalMerged}`,
    `Total rejected: ${result.totalRejected}`,
    `Total quarantined: ${result.totalQuarantined}`,
    `Total survivors: ${result.totalSurvivors}`,
    `Total removed: ${result.totalRemoved}`,
    ``,
  ];

  for (const er of result.entityResults) {
    lines.push(`--- ${er.entityType} ---`);
    lines.push(`  Scanned: ${er.scanned} | Dupes: ${er.duplicatesFound} | Merged: ${er.merged} | Rejected: ${er.rejected} | Quarantined: ${er.quarantined}`);
    if (er.logs.length > 0) {
      lines.push(`  Merge logs:`);
      for (const log of er.logs.slice(0, 10)) {
        lines.push(`    [${log.action}] ${log.survivorId} <- ${log.mergedIds.join(",")} (${log.confidence}%)`);
      }
      if (er.logs.length > 10) {
        lines.push(`    ... and ${er.logs.length - 10} more`);
      }
    }
  }

  return lines.join("\n");
}
