import { db } from "@/services/db";
import type { GovernanceViolation, GovernanceSeverity } from "@/domains/shared/canonical-types";

const TABLE = "governance_violations";

export async function persistViolation(v: GovernanceViolation): Promise<void> {
  try {
    const { error } = await db(TABLE).upsert({
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
    });
    if (error) {
      console.error("[governance][persist] Failed to persist violation:", v.id, error.message);
    }
  } catch (err) {
    console.error("[governance][persist] Unexpected error persisting violation:", v.id, err);
  }
}

export async function persistViolations(vs: GovernanceViolation[]): Promise<void> {
  if (vs.length === 0) return;
  try {
    const rows = vs.map((v) => ({
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
    }));
    const { error } = await db(TABLE).upsert(rows);
    if (error) {
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
    if (filters.resolved === true) query = query.not("resolved_at", "is", null);
    if (filters.resolved === false) query = query.is("resolved_at", null);
    if (filters.limit) query = query.limit(filters.limit);
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

    const { data, error } = await query;
    if (error) {
      console.error("[governance][persist] Fetch failed:", error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
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
    }));
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
