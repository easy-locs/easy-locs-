import { db } from "@/services/db";
import type { GovernanceViolation, GovernanceSeverity } from "@/domains/shared/canonical-types";
import { computeDedupKey, isDuplicateViolation } from "./governance-dedup";

const TABLE = "governance_violations";

function violationToRow(v: GovernanceViolation) {
  const dedupKey = v.dedupKey ?? computeDedupKey(v);
  return {
    id: v.id,
    type: v.type,
    severity: v.severity,
    source: v.source,
    target: v.target,
    message: v.message,
    owner_domain: v.ownerDomain,
    vertical: v.vertical,
    detected_at: v.detectedAt,
    resolved_at: v.resolvedAt,
    auto_remediated: v.autoRemediated,
    metadata: v.metadata ?? {},
    engine: v.engine ?? null,
    route: v.route ?? null,
    correlation_id: v.correlationId ?? null,
    dedup_key: dedupKey,
    entity_type: v.entityType ?? null,
    entity_id: v.entityId ?? null,
    code: v.code ?? null,
    status: v.status ?? "new",
  };
}

function rowToViolation(row: any): GovernanceViolation {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity as GovernanceSeverity,
    source: row.source,
    target: row.target,
    message: row.message,
    ownerDomain: row.owner_domain,
    vertical: row.vertical,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at,
    autoRemediated: row.auto_remediated,
    metadata: row.metadata ?? {},
    engine: row.engine ?? undefined,
    route: row.route ?? undefined,
    correlationId: row.correlation_id ?? undefined,
    dedupKey: row.dedup_key ?? undefined,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    code: row.code ?? undefined,
    status: row.status ?? "new",
  };
}

export async function persistViolation(v: GovernanceViolation): Promise<void> {
  const dedupKey = v.dedupKey ?? computeDedupKey(v);
  if (isDuplicateViolation(dedupKey)) return;

  try {
    const { error } = await db(TABLE).upsert(violationToRow(v), { onConflict: "id" });
    if (error) {
      if (error.code === "23505") return;
      console.error("[governance][persist] Failed to persist violation:", v.id, error.message);
    }
  } catch (err) {
    console.error("[governance][persist] Unexpected error persisting violation:", v.id, err);
  }
}

export async function persistViolations(vs: GovernanceViolation[]): Promise<void> {
  if (vs.length === 0) return;
  const unique = vs.filter((v) => {
    const dk = v.dedupKey ?? computeDedupKey(v);
    return !isDuplicateViolation(dk);
  });
  if (unique.length === 0) return;

  try {
    const rows = unique.map(violationToRow);
    const { error } = await db(TABLE).upsert(rows, { onConflict: "id" });
    if (error) {
      if (error.code === "23505") return;
      console.error("[governance][persist] Batch persist failed:", error.message);
    }
  } catch (err) {
    console.error("[governance][persist] Unexpected batch error:", err);
  }
}

export interface ViolationFilters {
  severity?: GovernanceSeverity;
  type?: string;
  vertical?: string;
  ownerDomain?: string;
  resolved?: boolean;
  engine?: string;
  route?: string;
  code?: string;
  status?: "new" | "acknowledged" | "resolved";
  limit?: number;
  offset?: number;
}

export async function fetchViolations(filters: ViolationFilters = {}): Promise<GovernanceViolation[]> {
  try {
    let query = db(TABLE)
      .select("*")
      .order("detected_at", { ascending: false });

    if (filters.severity) query = query.eq("severity", filters.severity);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.vertical) query = query.eq("vertical", filters.vertical);
    if (filters.ownerDomain) query = query.eq("owner_domain", filters.ownerDomain);
    if (filters.engine) query = query.eq("engine", filters.engine);
    if (filters.route) query = query.eq("route", filters.route);
    if (filters.code) query = query.eq("code", filters.code);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.resolved === true) query = query.not("resolved_at", "is", null);
    if (filters.resolved === false) query = query.is("resolved_at", null);
    query = query.limit(filters.limit ?? 100);
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 100) - 1);

    const { data, error } = await query;
    if (error) {
      console.error("[governance][persist] Fetch failed:", error.message);
      return [];
    }

    return (data ?? []).map(rowToViolation);
  } catch (err) {
    console.error("[governance][persist] Unexpected fetch error:", err);
    return [];
  }
}

export async function fetchViolationCount(filters: ViolationFilters = {}): Promise<number> {
  try {
    let query = db(TABLE).select("id", { count: "exact", head: true });
    if (filters.severity) query = query.eq("severity", filters.severity);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.engine) query = query.eq("engine", filters.engine);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.resolved === false) query = query.is("resolved_at", null);

    const { count, error } = await query;
    if (error) {
      console.error("[governance][persist] Count failed:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[governance][persist] Unexpected count error:", err);
    return 0;
  }
}

export async function fetchViolationsByEngine(): Promise<Record<string, number>> {
  try {
    const { data, error } = await db(TABLE)
      .select("engine")
      .not("engine", "is", null);
    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data) {
      const e = (row as any).engine ?? "unknown";
      counts[e] = (counts[e] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export async function fetchViolationsBySeverity(): Promise<Record<string, number>> {
  try {
    const { data, error } = await db(TABLE).select("severity");
    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data) {
      const s = (row as any).severity ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

export async function acknowledgeViolation(id: string): Promise<boolean> {
  try {
    const { error } = await db(TABLE)
      .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export async function resolveViolation(id: string): Promise<boolean> {
  try {
    const { error } = await db(TABLE)
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}
