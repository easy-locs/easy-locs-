/**
 * PLATFORM AUTO RECOVERY ENGINE
 * Central trigger that checks, reconnects, audits, auto-fixes, and heals the platform.
 */

import { supabase } from "@/integrations/supabase/client";
import { setEngineHealth } from "@/lib/engine/centralEngineRuntime";
import { getEngineRegistry } from "@/lib/engine/centralEngineRuntime";
import { runAutoFix, type AutoFixResult } from "./platform-auto-fix";
import { runAllHealthChecks, type HealthCheckResult } from "./platform-health-checks";

// ─── Types ───────────────────────────────────────────────────────

export type ModuleStatus = "ok" | "error" | "skipped" | "fixed";

export interface ModuleCheckResult {
  module: string;
  group: "core" | "backend" | "state" | "audit" | "fix" | "health" | "autofix";
  status: ModuleStatus;
  detail: string;
  durationMs: number;
}

export interface RecoveryRunReport {
  id: string;
  startedAt: string;
  completedAt: string;
  totalMs: number;
  trigger: "boot" | "manual" | "cron" | "deploy";
  modules: ModuleCheckResult[];
  autoFixes: AutoFixResult[];
  healthChecks: HealthCheckResult[];
  summary: {
    total: number;
    ok: number;
    error: number;
    fixed: number;
    skipped: number;
    autoFixesApplied: number;
    healthIssues: number;
  };
}

// ─── Execution history ──────────────────────────────────────────

const STORAGE_KEY = "platform_recovery_runs_v1";
const MAX_RUNS = 50;
let runs: RecoveryRunReport[] = [];

function loadRuns(): RecoveryRunReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) runs = JSON.parse(raw);
  } catch {}
  return runs;
}

function saveRuns() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
  } catch {}
}

export function getRecoveryRuns(): RecoveryRunReport[] {
  if (runs.length === 0) loadRuns();
  return [...runs];
}

export function getLastRun(): RecoveryRunReport | null {
  if (runs.length === 0) loadRuns();
  return runs[0] ?? null;
}

// ─── Individual checks ──────────────────────────────────────────

async function checkTable(name: string, table: string): Promise<ModuleCheckResult> {
  const t = Date.now();
  try {
    const { error } = await (supabase as any).from(table).select("id").limit(1);
    return { module: name, group: "backend", status: error ? "error" : "ok", detail: error ? error.message : "reachable", durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: name, group: "backend", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

async function checkRpc(name: string, rpcName: string): Promise<ModuleCheckResult> {
  const t = Date.now();
  try {
    const { error } = await supabase.rpc(rpcName as any, {} as any);
    const reachable = !error || !error.message?.includes("Could not find the function");
    return { module: name, group: "backend", status: reachable ? "ok" : "error", detail: reachable ? "rpc reachable" : error?.message ?? "not found", durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: name, group: "backend", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

function checkCanonicalModule(name: string, testFn: () => boolean): ModuleCheckResult {
  const t = Date.now();
  try {
    const ok = testFn();
    return { module: name, group: "core", status: ok ? "ok" : "error", detail: ok ? "loaded" : "missing", durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: name, group: "core", status: "error", detail: e?.message ?? "crash", durationMs: Date.now() - t };
  }
}

function checkStore(name: string, storeFn: () => any): ModuleCheckResult {
  const t = Date.now();
  try {
    const state = storeFn();
    return { module: name, group: "state", status: state !== undefined ? "ok" : "error", detail: state !== undefined ? "hydrated" : "empty", durationMs: Date.now() - t };
  } catch (e: any) {
    return { module: name, group: "state", status: "error", detail: e?.message ?? "crash", durationMs: Date.now() - t };
  }
}

// ─── Main execution ─────────────────────────────────────────────

export async function runPlatformRecovery(
  trigger: RecoveryRunReport["trigger"] = "manual"
): Promise<RecoveryRunReport> {
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const results: ModuleCheckResult[] = [];

  console.group(`%c🔧 Platform Recovery [${trigger}]`, "color: #3b82f6; font-weight: bold");

  // ── A. Backend connectivity ──
  console.log("[recovery] Checking backend...");
  const tableChecks = await Promise.all([
    checkTable("db.storefront_pages", "storefront_pages"),
    checkTable("db.seed_merchants", "seed_merchants"),
    checkTable("db.wallet_accounts", "wallet_accounts"),
    checkTable("db.conversations_v2", "conversations_v2"),
    checkTable("db.chat_messages_v2", "chat_messages_v2"),
    checkTable("db.orbit_profiles_v2", "orbit_profiles_v2"),
    checkTable("db.boost_campaigns", "boost_campaigns"),
    checkTable("db.boost_slots", "boost_slots"),
    checkTable("db.boost_impressions", "boost_impressions"),
    checkTable("db.boost_leads", "boost_leads"),
    checkTable("db.orders", "orders"),
    checkTable("db.driver_profiles", "driver_profiles"),
    checkTable("db.notifications", "notifications"),
    checkTable("db.support_tickets", "support_tickets"),
  ]);
  results.push(...tableChecks);

  const engineTableMap: Record<string, string> = {
    "db.orders": "orders",
    "db.wallet_accounts": "wallet",
    "db.driver_profiles": "dispatch",
    "db.notifications": "notifications",
    "db.support_tickets": "support",
  };
  for (const check of tableChecks) {
    const engineKey = engineTableMap[check.module];
    if (engineKey) {
      setEngineHealth(engineKey as any, check.status === "ok", check.detail);
    }
  }

  // ── B. RPC checks ──
  const rpcChecks = await Promise.all([
    checkRpc("rpc.ensure_wallet_account", "ensure_wallet_account"),
  ]);
  results.push(...rpcChecks);

  // ── C. Canonical core ──
  results.push(
    checkCanonicalModule("canonical.entity_resolver", () => {
      try { return typeof require("@/lib/entity/canonical-entity-resolver") !== "undefined"; } catch { return false; }
    }),
    checkCanonicalModule("canonical.taxonomy", () => {
      try { return typeof require("@/lib/taxonomy/taxonomy-engine") !== "undefined"; } catch { return false; }
    }),
  );

  // ── D. Stores ──
  try {
    const { useLocationStore } = await import("@/stores/locationStore");
    results.push(checkStore("store.geo", () => useLocationStore.getState()));
  } catch {
    results.push({ module: "store.geo", group: "state", status: "error", detail: "import failed", durationMs: 0 });
  }
  try {
    const { useOrbitStore } = await import("@/stores/orbitStore");
    results.push(checkStore("store.orbit", () => useOrbitStore.getState()));
  } catch {
    results.push({ module: "store.orbit", group: "state", status: "error", detail: "import failed", durationMs: 0 });
  }
  try {
    const { useWalletStore } = await import("@/stores/walletStore");
    results.push(checkStore("store.wallet", () => useWalletStore.getState()));
  } catch {
    results.push({ module: "store.wallet", group: "state", status: "error", detail: "import failed", durationMs: 0 });
  }

  // ── E. Auto-fix engine ──
  console.log("[recovery] Running auto-fix...");
  const autoFixes = await runAutoFix();
  for (const fix of autoFixes) {
    results.push({
      module: `autofix.${fix.fix}`,
      group: "autofix",
      status: fix.applied ? "fixed" : "ok",
      detail: fix.detail,
      durationMs: 0,
    });
  }

  // ── F. Health checks ──
  console.log("[recovery] Running health checks...");
  const healthChecks = await runAllHealthChecks();
  for (const hc of healthChecks) {
    results.push({
      module: `health.${hc.module}`,
      group: "health",
      status: hc.healthy ? "ok" : "error",
      detail: hc.detail,
      durationMs: 0,
    });
  }

  // ── Summarize ──
  const summary = {
    total: results.length,
    ok: results.filter(r => r.status === "ok").length,
    error: results.filter(r => r.status === "error").length,
    fixed: results.filter(r => r.status === "fixed").length,
    skipped: results.filter(r => r.status === "skipped").length,
    autoFixesApplied: autoFixes.filter(f => f.applied).length,
    healthIssues: healthChecks.filter(h => !h.healthy).length,
  };

  const report: RecoveryRunReport = {
    id: `run_${Date.now()}`,
    startedAt,
    completedAt: new Date().toISOString(),
    totalMs: Date.now() - start,
    trigger,
    modules: results,
    autoFixes,
    healthChecks,
    summary,
  };

  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "error" ? "❌" : r.status === "fixed" ? "🔧" : "⏭️";
    console.log(`${icon} [${r.group}] ${r.module}: ${r.detail} (${r.durationMs}ms)`);
  }
  console.log(`%c📊 Summary: ${summary.ok}/${summary.total} OK | ${summary.error} errors | ${summary.fixed} fixed | ${summary.autoFixesApplied} auto-fixes | ${summary.healthIssues} health issues`,
    summary.error > 0 ? "color: #ef4444" : "color: #22c55e");
  console.groupEnd();

  runs = [report, ...runs].slice(0, MAX_RUNS);
  saveRuns();

  return report;
}
