/**
 * Brain Firewall — Canonical shared module for ALL edge functions.
 * Single source of truth. Non-bypassable for critical writes.
 */

const BLOCKED_CATEGORIES = ["general", "other", "unknown", "null", "undefined", ""];
const MIN_QUALITY_FOR_LIVE = 40;

export interface FirewallLogEntry {
  engine: string;
  rule: string;
  blocked: boolean;
  detail: string;
  ts: string;
}

export interface FirewallResult {
  blocked: boolean;
  reasons: string[];
}

const firewallLog: FirewallLogEntry[] = [];

export function getFirewallLog(): FirewallLogEntry[] {
  return firewallLog;
}

export function resetFirewallLog(): void {
  firewallLog.length = 0;
}

export function getFirewallSummary(): { total_checks: number; total_blocks: number; blocks_by_rule: Record<string, number> } {
  const blocks = firewallLog.filter(e => e.blocked);
  const byRule: Record<string, number> = {};
  for (const b of blocks) {
    byRule[b.rule] = (byRule[b.rule] || 0) + 1;
  }
  return { total_checks: firewallLog.length, total_blocks: blocks.length, blocks_by_rule: byRule };
}

export function firewallCheck(
  engineName: string,
  tableName: string,
  fields: Record<string, any>,
  previousValues?: Record<string, any>
): FirewallResult {
  const reasons: string[] = [];
  const ts = new Date().toISOString();

  // Rule 1: Quality gate — no live publish with low quality
  if (fields.visibility_mode === "live") {
    const quality = fields.visibility_score ?? fields.ranking_score ?? fields.overall_quality_score ?? previousValues?.overall_quality_score ?? previousValues?.ranking_score ?? 0;
    if (quality < MIN_QUALITY_FOR_LIVE) {
      reasons.push(`quality_gate: score ${quality} < ${MIN_QUALITY_FOR_LIVE}`);
      firewallLog.push({ engine: engineName, rule: "quality_gate", blocked: true, detail: `score=${quality}`, ts });
    }
  }

  // Rule 2: Junk category block
  if (fields.category !== undefined) {
    const cat = String(fields.category).toLowerCase().trim();
    if (BLOCKED_CATEGORIES.includes(cat)) {
      reasons.push(`category_integrity: "${fields.category}" is blocked`);
      firewallLog.push({ engine: engineName, rule: "category_integrity", blocked: true, detail: `cat=${fields.category}`, ts });
    }
  }

  // Rule 3: Human-verified field protection
  if (previousValues) {
    for (const field of Object.keys(fields)) {
      if (previousValues[`${field}_human_verified`] === true) {
        reasons.push(`human_lock: "${field}" is human-verified`);
        firewallLog.push({ engine: engineName, rule: "human_lock", blocked: true, detail: `field=${field}`, ts });
      }
    }
  }

  // Rule 4: Visibility change auto-reason
  if (fields.visibility_mode !== undefined && !fields.visibility_decision_reason) {
    fields.visibility_decision_reason = `engine:${engineName}`;
  }

  // Rule 5: Financial write requires reference
  if (tableName === "wallet_transactions" || tableName === "accounting_entries" || tableName === "wallet_ledger") {
    if (!fields.external_reference && !fields.reference_code && !fields.transaction_ref) {
      reasons.push(`finance_ref: financial write without reference`);
      firewallLog.push({ engine: engineName, rule: "finance_ref", blocked: true, detail: `table=${tableName}`, ts });
    }
  }

  if (reasons.length === 0) {
    firewallLog.push({ engine: engineName, rule: "all_passed", blocked: false, detail: `table=${tableName}`, ts });
  }

  return { blocked: reasons.length > 0, reasons };
}

/**
 * Guarded update — runs firewall before writing.
 * Returns { written, blocked, reasons }.
 */
export async function guardedUpdate(
  supabase: any,
  engineName: string,
  table: string,
  id: string,
  fields: Record<string, any>,
  previousValues?: Record<string, any>
): Promise<{ written: boolean; blocked: boolean; reasons: string[] }> {
  const result = firewallCheck(engineName, table, fields, previousValues);
  if (result.blocked) {
    try {
      await supabase.from("engine_run_logs").insert({
        engine_name: engineName,
        trigger_source: "firewall",
        status: "blocked",
        effect_summary: `FIREWALL BLOCKED: ${result.reasons.join("; ")}`,
        side_effect_count: 0,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: 0,
        metadata_json: { firewall_rule: result.reasons.map(r => r.split(":")[0]).join("+"), entity_id: id, table },
      });
    } catch (_) { /* non-critical */ }
    return { written: false, blocked: true, reasons: result.reasons };
  }
  await supabase.from(table).update(fields).eq("id", id);
  return { written: true, blocked: false, reasons: [] };
}
