#!/usr/bin/env -S npx tsx
/**
 * Phase-0 audit driver. The audit is implemented as POSIX shell + small
 * Node helpers (`.mjs`) because the work is overwhelmingly I/O over the
 * monorepo (find / grep / awk / sort) and these tools are 5–20x faster
 * than equivalent JS for whole-tree scans. This `.ts` entrypoint exists
 * so the suite can be invoked from any TypeScript-only environment that
 * does not have bash readily available, and so type-checked tooling can
 * import a single canonical driver.
 *
 * Usage:
 *   npx tsx scripts/audit/phase-0/run-all.ts
 *   npx tsx scripts/audit/phase-0/run-all.ts --check   # only the gate
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const steps: Array<{ name: string; cmd: string }> = [
  { name: "tables-policies",     cmd: "scripts/audit/phase-0/inventory-tables-policies.sh" },
  { name: "routes",              cmd: "scripts/audit/phase-0/inventory-routes.sh" },
  { name: "frontend-direct-db",  cmd: "scripts/audit/phase-0/inventory-frontend-direct-db.sh" },
  { name: "polling",             cmd: "scripts/audit/phase-0/inventory-polling.sh" },
  { name: "events-and-writers",  cmd: "scripts/audit/phase-0/inventory-events-and-writers.sh" },
  { name: "edge-functions",      cmd: "scripts/audit/phase-0/inventory-edge-functions.sh" },
  { name: "rpc-orphans",         cmd: "scripts/audit/phase-0/inventory-rpc-orphans.sh" },
  { name: "buttons",             cmd: "scripts/audit/phase-0/inventory-button-handlers.sh" },
  { name: "edge-orphans",        cmd: "scripts/audit/phase-0/derive-edge-orphans.sh" },
  { name: "consistency",         cmd: "scripts/audit/phase-0/check-consistency.sh" },
];

const onlyCheck = process.argv.includes("--check");
const toRun = onlyCheck ? steps.filter(s => s.name === "consistency") : steps;

let failed = 0;
for (const step of toRun) {
  process.stdout.write(`\n=== ${step.name} ===\n`);
  const r = spawnSync("bash", [step.cmd], { cwd: repoRoot, stdio: "inherit" });
  if (r.status !== 0) { failed++; console.error(`step failed: ${step.name}`); }
}
process.exit(failed === 0 ? 0 : 1);
