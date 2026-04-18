#!/usr/bin/env node
/**
 * Build-time invariants check ("big tech" guardrail).
 *
 * Runs before vite build. Fails fast if any of the regression-prone
 * bugs that have recurred in this codebase ever sneak back in via a
 * stale-snapshot rebase from a concurrent task agent.
 *
 * Add new invariants here whenever a class of bug recurs.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;

function fail(msg) {
  console.error("[invariants] FAIL:", msg);
  failures += 1;
}

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function checkNoConflictMarkers() {
  const dirs = ["src", "public", "scripts"];
  const markers = /^(<{7} |={7}$|>{7} )/m;
  let count = 0;
  function walk(dir) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) return;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        walk(child);
      } else if (/\.(ts|tsx|js|jsx|cjs|mjs|json|md|html|css)$/.test(entry.name)) {
        const txt = fs.readFileSync(path.join(ROOT, child), "utf8");
        if (markers.test(txt)) {
          fail(`Git conflict marker found in ${child}`);
          count += 1;
        }
      }
    }
  }
  for (const d of dirs) walk(d);
  if (count === 0) console.log("[invariants] OK: no leftover conflict markers");
}

function checkNoDuplicateAdminControlShellPageRoutes() {
  const file = "src/routes/admin.routes.tsx";
  const txt = read(file);
  if (txt == null) return;
  // The route block referencing AdminControlShellPage is the canonical
  // ReferenceError source. The component is no longer imported here.
  if (txt.includes("AdminControlShellPage")) {
    fail(
      `${file}: dead symbol AdminControlShellPage referenced. ` +
        `Routes must use AdminShellWithChunkBoundary instead. ` +
        `(Recurrent regression — see commits a560191832, 5e872a06bf.)`,
    );
  } else {
    console.log("[invariants] OK: admin.routes.tsx free of AdminControlShellPage");
  }
}

function checkNoDuplicateProfileLoadTimeout() {
  const file = "src/components/auth/SuperAdminGate.tsx";
  const txt = read(file);
  if (txt == null) return;
  const matches = txt.match(/PROFILE_LOAD_TIMEOUT_MS\s*=\s*\d+/g) || [];
  if (matches.length > 1) {
    fail(`${file}: PROFILE_LOAD_TIMEOUT_MS declared ${matches.length} times (must be 1)`);
  } else {
    console.log("[invariants] OK: SuperAdminGate has single PROFILE_LOAD_TIMEOUT_MS");
  }
}

function checkNoDuplicateCronAlertThresholdsCard() {
  const file = "src/pages/admin/AdminMergeConflictRecoveryPage.tsx";
  const txt = read(file);
  if (txt == null) return;
  const matches = txt.match(/^function\s+CronAlertThresholdsCard\s*\(/gm) || [];
  if (matches.length > 1) {
    fail(`${file}: CronAlertThresholdsCard declared ${matches.length} times (must be 1)`);
  } else {
    console.log("[invariants] OK: CronAlertThresholdsCard declared once");
  }
}

checkNoConflictMarkers();
checkNoDuplicateAdminControlShellPageRoutes();
checkNoDuplicateProfileLoadTimeout();
checkNoDuplicateCronAlertThresholdsCard();

if (failures > 0) {
  console.error(`\n[invariants] ${failures} invariant(s) failed — refusing to build.`);
  process.exit(1);
}
console.log("\n[invariants] all build invariants OK");
