/**
 * Dedup Engine (Import Pipeline) — Multi-signal entity deduplication.
 * TASK #65: Now delegates core scoring to canonical-dedup-engine with
 * the "import" strategy. Public API preserved for backward compatibility.
 */
import type { SourceEntityRecord, DedupMatch } from "../types";
import {
  computeCanonicalDedupScore,
  STRATEGIES,
  type DedupCandidate as CanonicalCandidate,
} from "@/lib/dedup/canonical-dedup-engine";

function toCanonicalCandidate(r: SourceEntityRecord): CanonicalCandidate {
  return {
    id: r.sourceEntityId,
    name: r.name || "",
    phone: r.phone,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    website: r.website,
    sourceId: r.sourceEntityId,
    photos: r.photos,
    menuItems: r.menuItems,
  };
}

export function computeDedupScore(a: SourceEntityRecord, b: SourceEntityRecord): DedupMatch | null {
  const ca = toCanonicalCandidate(a);
  const cb = toCanonicalCandidate(b);
  const result = computeCanonicalDedupScore(ca, cb, STRATEGIES.import);

  if (result.action === "keep_separate") return null;

  return {
    entityA: a.sourceEntityId,
    entityB: b.sourceEntityId,
    confidence: result.confidence / 100,
    matchedOn: result.matchedOn,
  };
}

export function detectDuplicates(records: SourceEntityRecord[]): DedupMatch[] {
  const matches: DedupMatch[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const match = computeDedupScore(records[i], records[j]);
      if (match) matches.push(match);
    }
  }
  return matches;
}

export function groupByDuplicates(records: SourceEntityRecord[], matches: DedupMatch[]): SourceEntityRecord[][] {
  const idToGroup = new Map<string, number>();
  const groups: SourceEntityRecord[][] = [];

  for (const r of records) {
    if (!idToGroup.has(r.sourceEntityId)) {
      idToGroup.set(r.sourceEntityId, groups.length);
      groups.push([r]);
    }
  }

  for (const m of matches) {
    const gA = idToGroup.get(m.entityA);
    const gB = idToGroup.get(m.entityB);
    if (gA !== undefined && gB !== undefined && gA !== gB) {
      groups[gA].push(...groups[gB]);
      for (const r of groups[gB]) {
        idToGroup.set(r.sourceEntityId, gA);
      }
      groups[gB] = [];
    }
  }

  return groups.filter(g => g.length > 0);
}
