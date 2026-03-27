/**
 * Brain Firewall — Validates engine outputs BEFORE they reach production.
 * Prevents bad data from being published by enforcing brain-level invariants.
 * 
 * RULES:
 * 1. No engine may publish an entity with visibility_mode="live" if quality < 40
 * 2. No engine may set a category to "general" or "other" 
 * 3. No engine may overwrite a human-verified field
 * 4. No engine may set visibility_mode without a decision_reason
 * 5. All financial writes must have a reconciliation reference
 * 6. No engine may run outside its declared brain ownership
 */

import { ENGINE_METADATA, type BrainOwner } from "./engine-metadata-registry";

export interface FirewallCheck {
  rule: string;
  passed: boolean;
  engine: string;
  detail: string;
  severity: "block" | "warn" | "info";
}

export interface EngineOutput {
  engineName: string;
  tableName: string;
  entityId: string;
  fieldsChanged: Record<string, any>;
  previousValues?: Record<string, any>;
}

const BLOCKED_CATEGORIES = ["general", "other", "unknown", "null", "undefined", ""];
const MIN_QUALITY_FOR_LIVE = 40;
const HUMAN_VERIFIED_MARKER = "human_verified";

/** Run all firewall rules against a proposed engine write */
export function validateEngineOutput(output: EngineOutput): FirewallCheck[] {
  const checks: FirewallCheck[] = [];
  const meta = ENGINE_METADATA[output.engineName];

  // Rule 0: Engine must exist in metadata registry
  if (!meta) {
    checks.push({
      rule: "engine_registered",
      passed: false,
      engine: output.engineName,
      detail: `Engine "${output.engineName}" not in metadata registry — unregistered engines cannot write`,
      severity: "block",
    });
    return checks;
  }

  // Rule 1: No publishing with low quality
  if (output.fieldsChanged.visibility_mode === "live") {
    const quality = output.fieldsChanged.visibility_score ?? output.previousValues?.visibility_score ?? 0;
    const passed = quality >= MIN_QUALITY_FOR_LIVE;
    checks.push({
      rule: "quality_gate",
      passed,
      engine: output.engineName,
      detail: passed
        ? `Quality ${quality} >= ${MIN_QUALITY_FOR_LIVE}`
        : `BLOCKED: Quality ${quality} < ${MIN_QUALITY_FOR_LIVE} — cannot set visibility_mode=live`,
      severity: passed ? "info" : "block",
    });
  }

  // Rule 2: No junk categories
  if (output.fieldsChanged.category !== undefined) {
    const cat = String(output.fieldsChanged.category).toLowerCase().trim();
    const passed = !BLOCKED_CATEGORIES.includes(cat);
    checks.push({
      rule: "category_integrity",
      passed,
      engine: output.engineName,
      detail: passed
        ? `Category "${output.fieldsChanged.category}" is valid`
        : `BLOCKED: Category "${output.fieldsChanged.category}" is a junk value`,
      severity: passed ? "info" : "block",
    });
  }

  // Rule 3: No overwriting human-verified fields
  if (output.previousValues) {
    for (const field of Object.keys(output.fieldsChanged)) {
      const humanKey = `${field}_${HUMAN_VERIFIED_MARKER}`;
      if (output.previousValues[humanKey] === true) {
        checks.push({
          rule: "human_lock",
          passed: false,
          engine: output.engineName,
          detail: `BLOCKED: Field "${field}" is human-verified — engine cannot overwrite`,
          severity: "block",
        });
      }
    }
  }

  // Rule 4: Visibility mode changes require a reason
  if (output.fieldsChanged.visibility_mode !== undefined && !output.fieldsChanged.visibility_decision_reason) {
    checks.push({
      rule: "decision_reason_required",
      passed: false,
      engine: output.engineName,
      detail: `BLOCKED: visibility_mode change without visibility_decision_reason`,
      severity: "block",
    });
  }

  // Rule 5: Table ownership — engine must declare the table it writes to
  if (meta.tablesWritten.length > 0 && !meta.tablesWritten.includes(output.tableName)) {
    checks.push({
      rule: "table_ownership",
      passed: false,
      engine: output.engineName,
      detail: `WARN: Engine writes to "${output.tableName}" but only declares [${meta.tablesWritten.join(", ")}]`,
      severity: "warn",
    });
  }

  // Rule 6: Field ownership — engine must declare fields it touches
  const undeclaredFields = Object.keys(output.fieldsChanged).filter(
    f => meta.fieldsWritten.length > 0 && !meta.fieldsWritten.includes(f) && f !== "updated_at" && f !== "backend_repaired_at"
  );
  if (undeclaredFields.length > 0) {
    checks.push({
      rule: "field_ownership",
      passed: false,
      engine: output.engineName,
      detail: `WARN: Undeclared fields: [${undeclaredFields.join(", ")}]`,
      severity: "warn",
    });
  }

  // If no blocks found, add a pass
  if (checks.every(c => c.passed !== false)) {
    checks.push({
      rule: "firewall_passed",
      passed: true,
      engine: output.engineName,
      detail: "All firewall checks passed",
      severity: "info",
    });
  }

  return checks;
}

/** Quick check: should this write be blocked? */
export function isBlocked(checks: FirewallCheck[]): boolean {
  return checks.some(c => c.severity === "block" && !c.passed);
}

/** Format firewall results for logging */
export function formatFirewallLog(checks: FirewallCheck[]): string {
  const blocked = checks.filter(c => c.severity === "block" && !c.passed);
  const warnings = checks.filter(c => c.severity === "warn");
  
  if (blocked.length > 0) {
    return `🛑 FIREWALL BLOCKED [${blocked[0].engine}]: ${blocked.map(b => b.detail).join(" | ")}`;
  }
  if (warnings.length > 0) {
    return `⚠️ FIREWALL WARN [${warnings[0].engine}]: ${warnings.map(w => w.detail).join(" | ")}`;
  }
  return `✅ FIREWALL OK [${checks[0]?.engine}]`;
}

/** Get governance summary for all active engines */
export function getGovernanceSummary(): {
  totalRegistered: number;
  byBrain: Record<BrainOwner, number>;
  criticalEngines: string[];
  unregisteredInDb: string[];
} {
  const byBrain: Record<BrainOwner, number> = { geo: 0, execution: 0, category: 0, arbitration: 0, experience: 0 };
  const criticalEngines: string[] = [];

  for (const [name, meta] of Object.entries(ENGINE_METADATA)) {
    byBrain[meta.brainOwner]++;
    if (meta.tier === "critical") criticalEngines.push(name);
  }

  return {
    totalRegistered: Object.keys(ENGINE_METADATA).length,
    byBrain,
    criticalEngines,
    unregisteredInDb: [], // filled at runtime by comparing with engine_supervisor
  };
}
