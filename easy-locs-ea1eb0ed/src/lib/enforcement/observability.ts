import { structuredLogger } from "@/lib/observability/structured-logger";

export type ProofCategory =
  | "integrity"
  | "repair"
  | "publish_gate"
  | "quarantine"
  | "runtime_incident"
  | "state_machine_violation"
  | "duplicate_merge"
  | "fallback_usage"
  | "domain_boundary_violation"
  | "ingestion"
  | "flow_enforcement"
  | "circuit_breaker";

export interface ObservabilityProof {
  id: string;
  source: string;
  category: ProofCategory;
  timestamp: string;
  what: string;
  why: string;
  where: string;
  correction: string;
  fallbackUsed: boolean;
  rollbackUsed: boolean;
  recurrenceRisk: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}

const proofStore: ObservabilityProof[] = [];
const MAX_PROOFS = 2000;

export function recordObservabilityProof(proof: ObservabilityProof): void {
  proofStore.push(proof);
  if (proofStore.length > MAX_PROOFS) {
    proofStore.splice(0, proofStore.length - MAX_PROOFS);
  }

  const logLevel = proof.recurrenceRisk === "high" ? "warn" : "info";
  structuredLogger[logLevel](
    "system",
    `proof.${proof.category}`,
    `[${proof.source}] ${proof.what}`,
    {
      payload_summary: {
        proofId: proof.id,
        category: proof.category,
        where: proof.where,
        correction: proof.correction,
        fallbackUsed: proof.fallbackUsed,
        rollbackUsed: proof.rollbackUsed,
        recurrenceRisk: proof.recurrenceRisk,
      },
    },
  );
}

export function queryProofs(filters?: {
  category?: ProofCategory;
  source?: string;
  recurrenceRisk?: "low" | "medium" | "high";
  since?: string;
  limit?: number;
}): ObservabilityProof[] {
  let results = [...proofStore];

  if (filters?.category) results = results.filter((p) => p.category === filters.category);
  if (filters?.source) results = results.filter((p) => p.source === filters.source);
  if (filters?.recurrenceRisk) results = results.filter((p) => p.recurrenceRisk === filters.recurrenceRisk);
  if (filters?.since) {
    const sinceTs = new Date(filters.since).getTime();
    results = results.filter((p) => new Date(p.timestamp).getTime() >= sinceTs);
  }

  return results.slice(-(filters?.limit ?? 100));
}

export function getProofsByCategory(): Record<ProofCategory, number> {
  const counts: Record<string, number> = {};
  for (const p of proofStore) {
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  }
  return counts as Record<ProofCategory, number>;
}

export function getProofsBySource(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of proofStore) {
    counts[p.source] = (counts[p.source] ?? 0) + 1;
  }
  return counts;
}

export function getHighRiskProofs(limit = 50): ObservabilityProof[] {
  return proofStore
    .filter((p) => p.recurrenceRisk === "high")
    .slice(-limit);
}

export function getFallbackUsageProofs(limit = 50): ObservabilityProof[] {
  return proofStore
    .filter((p) => p.fallbackUsed)
    .slice(-limit);
}

export function getRollbackProofs(limit = 50): ObservabilityProof[] {
  return proofStore
    .filter((p) => p.rollbackUsed)
    .slice(-limit);
}

export function getObservabilityStats(): {
  totalProofs: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  byRecurrenceRisk: Record<string, number>;
  fallbackCount: number;
  rollbackCount: number;
  highRiskCount: number;
} {
  const byCategory: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byRecurrenceRisk: Record<string, number> = {};
  let fallbackCount = 0;
  let rollbackCount = 0;
  let highRiskCount = 0;

  for (const p of proofStore) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    bySource[p.source] = (bySource[p.source] ?? 0) + 1;
    byRecurrenceRisk[p.recurrenceRisk] = (byRecurrenceRisk[p.recurrenceRisk] ?? 0) + 1;
    if (p.fallbackUsed) fallbackCount++;
    if (p.rollbackUsed) rollbackCount++;
    if (p.recurrenceRisk === "high") highRiskCount++;
  }

  return {
    totalProofs: proofStore.length,
    byCategory,
    bySource,
    byRecurrenceRisk,
    fallbackCount,
    rollbackCount,
    highRiskCount,
  };
}

export function clearProofStore(): void {
  proofStore.length = 0;
}
