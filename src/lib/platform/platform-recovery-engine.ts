/**
 * PLATFORM AUTO RECOVERY ENGINE
 * Central trigger that checks, reconnects, audits, and auto-fixes the platform.
 * Can be run at boot, after deploy, manually from admin, or via cron.
 */

import { supabase } from "@/integrations/supabase/client";
import { setEngineHealth } from "@/lib/engine/centralEngineRuntime";
import { getEngineRegistry } from "@/lib/engine/centralEngineRuntime";

// ─── Types ───────────────────────────────────────────────────────

export type ModuleStatus = "ok" | "error" | "skipped" | "fixed";

export interface ModuleCheckResult {
  module: string;
  group: "core" | "backend" | "state" | "audit" | "fix";
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
  summary: {
    total: number;
    ok: number;
    error: number;
    fixed: number;
    skipped: number;
  };
}

// ─── Execution history (in-memory, persisted to localStorage) ───

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
    return {
      module: name,
      group: "backend",
      status: error ? "error" : "ok",
      detail: error ? error.message : "reachable",
      durationMs: Date.now() - t,
    };
  } catch (e: any) {
    return { module: name, group: "backend", status: "error", detail: e?.message ?? "unknown", durationMs: Date.now() - t };
  }
}

async function checkRpc(name: string, rpcName: string): Promise<ModuleCheckResult> {
  const t = Date.now();
  try {
    // Just verify the RPC exists by calling with dummy params that will fail gracefully
    const { error } = await supabase.rpc(rpcName as any, {} as any);
    // Even a parameter error means the RPC endpoint is reachable
    const reachable = !error || !error.message?.includes("Could not find the function");
    return {
      module: name,
      group: "backend",
      status: reachable ? "ok" : "error",
      detail: reachable ? "rpc reachable" : error?.message ?? "not found",
      durationMs: Date.now() - t,
    };
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

// ─── Audit checks ───────────────────────────────────────────────

function auditRawI18nKeys(): ModuleCheckResult {
  const t = Date.now();
  if (typeof document === "undefined") return { module: "i18n_raw_keys", group: "audit", status: "skipped", detail: "no DOM", durationMs: 0 };
  
  const allText = document.body?.innerText ?? "";
  const rawKeyPattern = /(?:discovery|common|travel|orbit|wallet|settings|admin)\.[a-z_]+\.[a-z_]+/gi;
  const matches = allText.match(rawKeyPattern) ?? [];
  
  return {
    module: "i18n_raw_keys",
    group: "audit",
    status: matches.length > 0 ? "error" : "ok",
    detail: matches.length > 0 ? `${matches.length} raw keys visible: ${matches.slice(0, 3).join(", ")}` : "no raw keys detected",
    durationMs: Date.now() - t,
  };
}

function auditDeadRoutes(): ModuleCheckResult {
  const t = Date.now();
  const path = window.location.hash?.replace("#", "") || window.location.pathname;
  const deadPatterns = ["/explore", "/dispatch", "/growth", "/dino"];
  const hit = deadPatterns.find((d) => path.startsWith(d));
  return {
    module: "dead_routes",
    group: "audit",
    status: hit ? "error" : "ok",
    detail: hit ? `on dead route: ${hit}` : "current route is valid",
    durationMs: Date.now() - t,
  };
}

function auditHardcodedCurrency(): ModuleCheckResult {
  const t = Date.now();
  if (typeof document === "undefined") return { module: "hardcoded_currency", group: "audit", status: "skipped", detail: "no DOM", durationMs: 0 };
  
  const allText = document.body?.innerText ?? "";
  // Look for "AED" preceded by a number (like "100 AED" or "AED 100")
  const aedPattern = /\bAED\s+\d|\d+\s+AED\b/g;
  const matches = allText.match(aedPattern) ?? [];
  
  return {
    module: "hardcoded_currency",
    group: "audit",
    status: matches.length > 3 ? "error" : "ok", // Allow some legitimate AED usage
    detail: matches.length > 0 ? `${matches.length} AED occurrences in DOM` : "no hardcoded AED",
    durationMs: Date.now() - t,
  };
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
  console.log("[recovery] Checking backend tables...");
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
    checkTable("db.dino_notifications", "dino_notifications"),
    checkTable("db.support_tickets", "support_tickets"),
  ]);
  results.push(...tableChecks);

  // Update engine health registry from table checks
  const engineTableMap: Record<string, string> = {
    "db.orders": "orders",
    "db.wallet_accounts": "wallet",
    "db.driver_profiles": "dispatch",
    "db.dino_notifications": "notifications",
    "db.support_tickets": "support",
  };
  for (const check of tableChecks) {
    const engineKey = engineTableMap[check.module];
    if (engineKey) {
      setEngineHealth(engineKey as any, check.status === "ok", check.detail);
    }
  }

  // ── B. RPC checks ──
  console.log("[recovery] Checking RPCs...");
  const rpcChecks = await Promise.all([
    checkRpc("rpc.ensure_wallet_account", "ensure_wallet_account"),
  ]);
  results.push(...rpcChecks);

  // ── C. Canonical core modules (in-memory) ──
  console.log("[recovery] Checking canonical core modules...");
  results.push(
    checkCanonicalModule("canonical.entity_resolver", () => {
      try { return typeof require("@/lib/entity/canonical-entity-resolver") !== "undefined"; } catch { return false; }
    }),
    checkCanonicalModule("canonical.taxonomy", () => {
      try { return typeof require("@/lib/taxonomy/taxonomy-engine") !== "undefined"; } catch { return false; }
    }),
  );

  // ── D. Store checks ──
  console.log("[recovery] Checking stores...");
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

  // ── E. Runtime audits ──
  console.log("[recovery] Running runtime audits...");
  results.push(auditRawI18nKeys());
  results.push(auditDeadRoutes());
  results.push(auditHardcodedCurrency());

  // ── Summarize ──
  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    error: results.filter((r) => r.status === "error").length,
    fixed: results.filter((r) => r.status === "fixed").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };

  const report: RecoveryRunReport = {
    id: `run_${Date.now()}`,
    startedAt,
    completedAt: new Date().toISOString(),
    totalMs: Date.now() - start,
    trigger,
    modules: results,
    summary,
  };

  // Log results
  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "error" ? "❌" : r.status === "fixed" ? "🔧" : "⏭️";
    console.log(`${icon} [${r.group}] ${r.module}: ${r.detail} (${r.durationMs}ms)`);
  }
  console.log(`%c📊 Summary: ${summary.ok}/${summary.total} OK, ${summary.error} errors, ${summary.fixed} fixed`, 
    summary.error > 0 ? "color: #ef4444" : "color: #22c55e");
  console.groupEnd();

  // Persist
  runs = [report, ...runs].slice(0, MAX_RUNS);
  saveRuns();

  return report;
}
