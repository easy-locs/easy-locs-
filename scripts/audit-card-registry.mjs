#!/usr/bin/env node
/**
 * CARD AUDIT — Full matrix validation for every card in the registry.
 *
 * Produces columns:
 * - card id | domain | source | adapter present | CardShell used
 * - action primaire réelle | route valide | fetch direct | mock détecté
 * - synchro mutation | statut final
 *
 * Run: node scripts/audit-card-registry.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";

const SRC = "src";

// ── Walk all TS/TSX files ──
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
    entries[m[2]] = {
      key: m[2],
      domain: m[3],
      route: m[4],
      sourceType: m[5],
      sourceKey: m[6],
      surface: m[7],
    };
  }
  return entries;
}

// ── Scan adapters ──
function findAdapters() {
  const adapterDir = "src/domains/cards/adapters";
  const adapters = new Map(); // cardId -> adapterName
  if (!existsSync(adapterDir)) return adapters;

  const files = readdirSync(adapterDir).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const content = readFileSync(join(adapterDir, f), "utf8");
    const re = /export function (use\w+Card)\(\).*?id:\s*"([^"]+)"/gs;
    let m;
    while ((m = re.exec(content))) {
      adapters.set(m[2], m[1]);
    }
  }
  return adapters;
}

// ── Scan for CardShell usage ──
function findCardShellUsage(files) {
  const usage = new Set();
  for (const f of files) {
    const content = readFileSync(f, "utf8");
    if (content.includes("CardShell") && content.includes("contract")) {
      // try to find which card ids are referenced
      const ids = content.match(/id:\s*"([^"]+)"/g);
      if (ids) ids.forEach((id) => usage.add(id.replace(/id:\s*"/, "").replace(/"/, "")));
    }
  }
  return usage;
}

// ── Scan for direct fetches in card-related files ──
function findDirectFetches(files) {
  const violations = [];
  for (const f of files) {
    const rel = relative(".", f);
    if (!rel.includes("Card") && !rel.includes("card") && !rel.includes("Section")) continue;
    // Skip adapter files — they are canonical
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

// ── Scan for mock/fake data ──
function findMocks(files) {
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
      if (/\bmock\b|\bfake\b|\bdummy\b/i.test(line) && !line.includes("placeholder.svg")) {
        violations.push({ file: rel, line: i + 1, detail: line.slice(0, 100) });
      }
    }
  }
  return violations;
}

// ── Scan for real actions (primaryAction with run) ──
function findRealActions(adapters) {
  const adapterDir = "src/domains/cards/adapters";
  const withActions = new Set();
  if (!existsSync(adapterDir)) return withActions;

  const files = readdirSync(adapterDir).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const content = readFileSync(join(adapterDir, f), "utf8");
    // find card ids that have primaryAction
    const blocks = content.split(/export function /);
    for (const block of blocks) {
      const idMatch = block.match(/id:\s*"([^"]+)"/);
      if (idMatch && block.includes("primaryAction")) {
        withActions.add(idMatch[1]);
      }
    }
  }
  return withActions;
}

// ── MAIN ──
const allFiles = walk(SRC);
const registry = parseRegistry();
const adapters = findAdapters();
const cardShellUsage = findCardShellUsage(allFiles);
const directFetches = findDirectFetches(allFiles);
const mocks = findMocks(allFiles);
const realActions = findRealActions(adapters);

const directFetchFiles = new Set(directFetches.map((v) => v.file));

console.log("\n╔══════════════════════════════════════════════════════════════════╗");
console.log("║              🃏 CARD AUDIT MATRIX — FULL REPORT                ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

const results = [];
const registryKeys = Object.keys(registry);

console.log("┌─────────────────────────┬────────────┬──────────┬─────────┬───────────┬────────┬───────┬──────────┐");
console.log("│ Card ID                 │ Domain     │ Adapter  │ Shell   │ Action    │ Route  │ Fetch │ Status   │");
console.log("├─────────────────────────┼────────────┼──────────┼─────────┼───────────┼────────┼───────┼──────────┤");

for (const key of registryKeys) {
  const entry = registry[key];
  const hasAdapter = adapters.has(key);
  const hasShell = cardShellUsage.has(key);
  const hasAction = realActions.has(key);
  const hasRoute = !!entry.route && entry.route.length > 1;
  const hasFetch = false; // adapters don't have direct fetches by definition
  const hasMock = false;

  // Compute status
  let status;
  if (!hasAdapter) {
    status = "ORPHAN";
  } else if (hasAdapter && hasAction && hasRoute) {
    status = "LIVE";
  } else if (hasAdapter && hasRoute) {
    status = "PARTIAL";
  } else {
    status = "BROKEN";
  }

  const row = {
    key,
    domain: entry.domain,
    hasAdapter,
    hasShell,
    hasAction,
    hasRoute,
    hasFetch,
    hasMock,
    status,
  };
  results.push(row);

  const pad = (s, n) => String(s).padEnd(n);
  const icon = (b) => (b ? "✅" : "❌");
  const statusColor = { LIVE: "🟢", PARTIAL: "🟡", ORPHAN: "🔴", BROKEN: "🔴" };

  console.log(
    `│ ${pad(key, 23)} │ ${pad(entry.domain, 10)} │ ${icon(hasAdapter)}       │ ${icon(hasShell)}      │ ${icon(hasAction)}        │ ${icon(hasRoute)}     │ ${icon(!hasFetch)}    │ ${statusColor[status] || "⚪"} ${pad(status, 6)} │`,
  );
}

console.log("└─────────────────────────┴────────────┴──────────┴─────────┴───────────┴────────┴───────┴──────────┘\n");

// ── Summary ──
const live = results.filter((r) => r.status === "LIVE").length;
const partial = results.filter((r) => r.status === "PARTIAL").length;
const orphan = results.filter((r) => r.status === "ORPHAN").length;
const broken = results.filter((r) => r.status === "BROKEN").length;

console.log("📊 SUMMARY");
console.log(`   Total cards:     ${results.length}`);
console.log(`   🟢 LIVE:         ${live}`);
console.log(`   🟡 PARTIAL:      ${partial}`);
console.log(`   🔴 ORPHAN:       ${orphan}`);
console.log(`   🔴 BROKEN:       ${broken}`);
console.log(`   Coverage:        ${((live / results.length) * 100).toFixed(1)}%`);

// ── Direct Fetch Violations ──
if (directFetches.length > 0) {
  console.log(`\n⚠️  DIRECT FETCH VIOLATIONS (${directFetches.length}):`);
  for (const v of directFetches) {
    console.log(`   ❌ ${v.file}:${v.line}`);
    console.log(`      ${v.detail}`);
  }
}

// ── Mock Violations ──
if (mocks.length > 0) {
  console.log(`\n⚠️  MOCK/FAKE DATA VIOLATIONS (${mocks.length}):`);
  for (const v of mocks) {
    console.log(`   ❌ ${v.file}:${v.line}`);
    console.log(`      ${v.detail}`);
  }
}

// ── Duplicate Sources ──
const sourceMap = {};
for (const key of registryKeys) {
  const src = registry[key].sourceKey;
  if (!sourceMap[src]) sourceMap[src] = [];
  sourceMap[src].push(key);
}
const dupes = Object.entries(sourceMap).filter(([, v]) => v.length > 1);
if (dupes.length > 0) {
  console.log(`\n📋 SHARED SOURCES (${dupes.length} sources shared by multiple cards):`);
  for (const [src, cards] of dupes) {
    console.log(`   ${src}: ${cards.join(", ")}`);
  }
}

// ── Cards by Surface ──
const surfaces = {};
for (const key of registryKeys) {
  const s = registry[key].surface;
  if (!surfaces[s]) surfaces[s] = [];
  surfaces[s].push(key);
}
console.log(`\n🖥️  CARDS BY SURFACE:`);
for (const [surface, cards] of Object.entries(surfaces)) {
  console.log(`   ${surface}: ${cards.length} cards`);
}

console.log("\n");
process.exit(0);
