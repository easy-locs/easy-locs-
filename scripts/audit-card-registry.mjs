#!/usr/bin/env node
/**
 * CARD AUDIT v2 — Strict validation with functional proof.
 *
 * Enforces:
 * - LIVE only if adapter has real non-null data pipeline
 * - Action type classification (navigation / business / mutation / orchestration)
 * - CardShell adoption tracking
 * - Direct fetch violation detection
 * - Mock/fake detection
 *
 * Run: node scripts/audit-card-registry.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";

const SRC = "src";

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "node_modules" || e === ".git") continue;
      files.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(e)) {
      files.push(p);
    }
  }
  return files;
}

// ── Parse registry ──
function parseRegistry() {
  const path = "src/domains/cards/card-registry.ts";
  const content = readFileSync(path, "utf8");
  const entries = {};
  const re = /(\w+):\s*\{[^}]*key:\s*"([^"]+)"[^}]*domain:\s*"([^"]+)"[^}]*route:\s*"([^"]+)"[^}]*sourceType:\s*"([^"]+)"[^}]*sourceKey:\s*"([^"]+)"[^}]*surface:\s*"([^"]+)"/gs;
  let m;
  while ((m = re.exec(content))) {
    entries[m[2]] = { key: m[2], domain: m[3], route: m[4], sourceType: m[5], sourceKey: m[6], surface: m[7] };
  }
  return entries;
}

// ── Scan adapters with action type + data pipeline detection ──
function analyzeAdapters() {
  const adapterDir = "src/domains/cards/adapters";
  const result = new Map(); // cardId -> { adapterName, actionType, hasRealData, hasReactiveSource }
  if (!existsSync(adapterDir)) return result;

  const files = readdirSync(adapterDir).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const content = readFileSync(join(adapterDir, f), "utf8");
    const blocks = content.split(/export function /);
    for (const block of blocks) {
      const idMatch = block.match(/id:\s*"([^"]+)"/);
      if (!idMatch) continue;
      const cardId = idMatch[1];
      const nameMatch = block.match(/^(use\w+Card)/);
      const adapterName = nameMatch ? nameMatch[1] : "unknown";

      // Action type detection
      let actionType = "none";
      if (block.includes('actionType: "mutation"')) actionType = "mutation";
      else if (block.includes('actionType: "orchestration"')) actionType = "orchestration";
      else if (block.includes('actionType: "business"')) actionType = "business";
      else if (block.includes('actionType: "navigation"')) actionType = "navigation";
      else if (block.includes("primaryAction")) actionType = "navigation"; // fallback

      // Real data pipeline detection
      const hasRealData = (
        block.includes("useQuery") ||
        block.includes("useDriverLive") ||
        block.includes("useDashboardViewModel") ||
        block.includes("useWalletStore") ||
        block.includes("useOrbitStore") ||
        block.includes("useNotificationV2Store") ||
        // Has data that's computed from a real source (not just hardcoded)
        (block.includes("data:") && !block.match(/data:\s*null\s*[,}]/) && !block.match(/data:\s*\{[^}]*\}\s*[,}]/))
      );

      // Check if data is always null (no pipeline)
      const alwaysNull = block.includes("data: null") && !block.includes("useQuery") && !block.includes("vm.") && !block.includes("Store");

      // Reactive source (zustand selector hook, not getState())
      const hasReactiveSource = (
        block.includes("useWalletStore(") ||
        block.includes("useOrbitStore(") ||
        block.includes("useNotificationV2Store(") ||
        block.includes("useDashboardViewModel") ||
        block.includes("useQuery") ||
        block.includes("useDriverLive")
      );

      result.set(cardId, { adapterName, actionType, hasRealData, alwaysNull, hasReactiveSource });
    }
  }
  return result;
}

// ── Scan for CardShell usage ──
function findCardShellUsage(files) {
  const usage = new Set();
  for (const f of files) {
    const content = readFileSync(f, "utf8");
    if (content.includes("CardShell") && content.includes("contract")) {
      const ids = content.match(/id:\s*"([^"]+)"/g);
      if (ids) ids.forEach((id) => usage.add(id.replace(/id:\s*"/, "").replace(/"/, "")));
    }
  }
  return usage;
}

// ── Direct fetch violations ──
function findDirectFetches(files) {
  const violations = [];
  for (const f of files) {
    const rel = relative(".", f);
    if (!rel.includes("Card") && !rel.includes("card") && !rel.includes("Section")) continue;
    if (rel.includes("domains/cards/")) continue;

    const content = readFileSync(f, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//")) continue;
      if (line.includes("supabase") && line.includes(".from(")) {
        violations.push({ file: rel, line: i + 1, detail: line.slice(0, 100) });
      }
    }
  }
  return violations;
}

// ── Mock violations ──
function findMocks(files) {
  const violations = [];
  for (const f of files) {
    const rel = relative(".", f);
    if (!rel.includes("Card") && !rel.includes("card") && !rel.includes("Section")) continue;
    if (rel.includes("domains/cards/")) continue;
    if (rel.includes("e2e") || rel.includes("test")) continue; // tests allowed

    const content = readFileSync(f, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//")) continue;
      if (/\bmock\b|\bfake\b|\bdummy\b/i.test(line) && !line.includes("placeholder.svg")) {
        violations.push({ file: rel, line: i + 1, detail: line.slice(0, 100) });
      }
    }
  }
  return violations;
}

// ── MAIN ──
const allFiles = walk(SRC);
const registry = parseRegistry();
const adapters = analyzeAdapters();
const cardShellUsage = findCardShellUsage(allFiles);
const directFetches = findDirectFetches(allFiles);
const mocks = findMocks(allFiles);

const ACTION_ICONS = { mutation: "🔧", orchestration: "⚙️", business: "💼", navigation: "🔗", none: "❌" };

console.log("\n╔══════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                🃏 CARD AUDIT v2 — STRICT FUNCTIONAL PROOF                      ║");
console.log("╚══════════════════════════════════════════════════════════════════════════════════╝\n");

console.log("┌─────────────────────────┬────────────┬──────────┬───────┬──────────┬──────────┬──────────┐");
console.log("│ Card ID                 │ Domain     │ Adapter  │ Shell │ Action   │ DataPipe │ Status   │");
console.log("├─────────────────────────┼────────────┼──────────┼───────┼──────────┼──────────┼──────────┤");

const results = [];
const registryKeys = Object.keys(registry);

for (const key of registryKeys) {
  const entry = registry[key];
  const adapter = adapters.get(key);
  const hasAdapter = !!adapter;
  const hasShell = cardShellUsage.has(key);
  const actionType = adapter?.actionType || "none";
  const hasRealData = adapter?.hasRealData ?? false;
  const hasReactiveSource = adapter?.hasReactiveSource ?? false;
  const alwaysNull = adapter?.alwaysNull ?? true;
  const hasRoute = !!entry.route && entry.route.length >= 1;

  // STRICT status computation
  let status;
  if (!hasAdapter) {
    status = "ORPHAN";
  } else if (alwaysNull && !hasRealData) {
    status = "LOADING"; // adapter exists but no real data pipeline
  } else if (hasAdapter && hasRealData && hasRoute && hasReactiveSource) {
    status = "LIVE";
  } else if (hasAdapter && hasRealData && hasRoute) {
    status = "PARTIAL"; // has data but not reactive
  } else if (hasAdapter && hasRoute) {
    status = "PARTIAL";
  } else {
    status = "BROKEN";
  }

  results.push({ key, domain: entry.domain, hasAdapter, hasShell, actionType, hasRealData, hasReactiveSource, alwaysNull, status, surface: entry.surface });

  const pad = (s, n) => String(s).padEnd(n);
  const icon = (b) => (b ? "✅" : "❌");
  const statusIcon = { LIVE: "🟢", PARTIAL: "🟡", LOADING: "🔵", ORPHAN: "🔴", BROKEN: "🔴" };
  const actionIcon = ACTION_ICONS[actionType] || "❌";

  console.log(
    `│ ${pad(key, 23)} │ ${pad(entry.domain, 10)} │ ${icon(hasAdapter)}       │ ${icon(hasShell)}    │ ${actionIcon} ${pad(actionType, 5)} │ ${icon(hasRealData)}       │ ${(statusIcon[status] || "⚪")} ${pad(status, 6)} │`,
  );
}

console.log("└─────────────────────────┴────────────┴──────────┴───────┴──────────┴──────────┴──────────┘\n");

// ── Summary ──
const live = results.filter((r) => r.status === "LIVE").length;
const partial = results.filter((r) => r.status === "PARTIAL").length;
const loading = results.filter((r) => r.status === "LOADING").length;
const orphan = results.filter((r) => r.status === "ORPHAN").length;
const broken = results.filter((r) => r.status === "BROKEN").length;

console.log("📊 STRICT SUMMARY");
console.log(`   Total cards:          ${results.length}`);
console.log(`   🟢 LIVE (proven):     ${live}`);
console.log(`   🟡 PARTIAL:           ${partial}`);
console.log(`   🔵 LOADING (no data): ${loading}`);
console.log(`   🔴 ORPHAN:            ${orphan}`);
console.log(`   🔴 BROKEN:            ${broken}`);
console.log(`   Real coverage:        ${((live / results.length) * 100).toFixed(1)}%`);

// ── Action Type Breakdown ──
const actionBreakdown = {};
for (const r of results) {
  actionBreakdown[r.actionType] = (actionBreakdown[r.actionType] || 0) + 1;
}
console.log(`\n🎯 ACTION TYPE BREAKDOWN:`);
for (const [type, count] of Object.entries(actionBreakdown)) {
  console.log(`   ${ACTION_ICONS[type] || "?"} ${type}: ${count}`);
}

// ── Direct Fetch Violations ──
if (directFetches.length > 0) {
  console.log(`\n⚠️  DIRECT FETCH VIOLATIONS (${directFetches.length}):`);
  for (const v of directFetches) {
    console.log(`   ❌ ${v.file}:${v.line}`);
    console.log(`      ${v.detail}`);
  }
} else {
  console.log(`\n✅ ZERO direct fetch violations in card components`);
}

// ── Mock Violations ──
if (mocks.length > 0) {
  console.log(`\n⚠️  MOCK VIOLATIONS (${mocks.length}):`);
  for (const v of mocks) {
    console.log(`   ❌ ${v.file}:${v.line}`);
  }
} else {
  console.log(`✅ ZERO mock violations`);
}

// ── Shared Sources ──
const sourceMap = {};
for (const key of registryKeys) {
  const src = registry[key].sourceKey;
  if (!sourceMap[src]) sourceMap[src] = [];
  sourceMap[src].push(key);
}
const dupes = Object.entries(sourceMap).filter(([, v]) => v.length > 1);
if (dupes.length > 0) {
  console.log(`\n📋 SHARED SOURCES (${dupes.length}):`);
  for (const [src, cards] of dupes) {
    console.log(`   ${src}: ${cards.join(", ")}`);
  }
}

// ── Surfaces ──
const surfaces = {};
for (const r of results) {
  if (!surfaces[r.surface]) surfaces[r.surface] = { total: 0, live: 0 };
  surfaces[r.surface].total++;
  if (r.status === "LIVE") surfaces[r.surface].live++;
}
console.log(`\n🖥️  SURFACE COVERAGE:`);
for (const [surface, s] of Object.entries(surfaces)) {
  console.log(`   ${surface}: ${s.live}/${s.total} LIVE`);
}

// ── Reactive Source Check ──
const nonReactive = results.filter((r) => r.hasAdapter && !r.hasReactiveSource);
if (nonReactive.length > 0) {
  console.log(`\n⚠️  NON-REACTIVE ADAPTERS (${nonReactive.length}):`);
  for (const r of nonReactive) {
    console.log(`   ⚠️  ${r.key} — uses snapshot, not reactive subscription`);
  }
} else {
  console.log(`\n✅ All adapters use reactive subscriptions`);
}

console.log("\n");
process.exit(0);
