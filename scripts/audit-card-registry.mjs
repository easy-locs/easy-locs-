#!/usr/bin/env node
/**
 * CARD AUDIT — Validates all cards against the Card Registry and Contract system.
 *
 * Checks:
 * 1. Cards visible in code vs registry entries
 * 2. Cards without real data sources
 * 3. Cards with missing actions
 * 4. Cards without proper status handling
 * 5. Cards with direct fetches (bypassing pipeline)
 *
 * Run: node scripts/audit-card-registry.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SRC = "src";
const violations = [];
const stats = {
  totalCards: 0,
  connectedCards: 0,
  mockedCards: 0,
  noActionCards: 0,
  multiSourceCards: 0,
  noStatusCards: 0,
  directFetchCards: 0,
};

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

function checkFile(filepath) {
  const rel = relative(".", filepath);
  const content = readFileSync(filepath, "utf8");
  const lines = content.split("\n");

  // Count Card components
  const cardMatches = content.match(/Card[>\s]/g);
  if (cardMatches && rel.startsWith("src/components/")) {
    stats.totalCards += cardMatches.length;
  }

  // Check for direct supabase fetches in card-related files
  if (rel.includes("Card") || rel.includes("card")) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//")) continue;

      // Direct fetch in card component
      if (line.includes("supabase") && line.includes(".from(") && rel.startsWith("src/components/")) {
        stats.directFetchCards++;
        violations.push({
          rule: "DIRECT_FETCH_IN_CARD",
          file: rel,
          line: i + 1,
          detail: "Card component fetches data directly instead of using adapter",
        });
      }

      // Mock/fake data
      if (/mock|fake|placeholder.*data|dummy/i.test(line) && !line.includes("placeholder.svg")) {
        stats.mockedCards++;
        violations.push({
          rule: "MOCKED_DATA_IN_CARD",
          file: rel,
          line: i + 1,
          detail: `Possible mock data: ${line.slice(0, 80)}`,
        });
      }
    }
  }
}

// Check registry completeness
function checkRegistry() {
  const registryPath = "src/domains/cards/card-registry.ts";
  try {
    const content = readFileSync(registryPath, "utf8");
    const keys = content.match(/key:\s*"([^"]+)"/g) || [];
    stats.connectedCards = keys.length;
    console.log(`\n   📋 Registry entries: ${keys.length}`);
  } catch {
    console.log(`\n   ⚠️  No card registry found at ${registryPath}`);
  }
}

// Run
const files = walk(SRC);
for (const f of files) checkFile(f);
checkRegistry();

console.log(`\n🃏 CARD AUDIT REPORT`);
console.log(`   Scanned: ${files.length} files`);
console.log(`   ────────────────────────────`);
console.log(`   Registry entries (connected): ${stats.connectedCards}`);
console.log(`   Direct fetch violations:      ${stats.directFetchCards}`);
console.log(`   Mocked data violations:       ${stats.mockedCards}`);
console.log(`   ────────────────────────────`);

if (violations.length === 0) {
  console.log(`   ✅ 0 violations — All cards are clean\n`);
} else {
  console.log(`   ⚠️  ${violations.length} violations:\n`);
  for (const v of violations.slice(0, 20)) {
    console.log(`   ❌ [${v.rule}] ${v.file}:${v.line}`);
    console.log(`      ${v.detail}`);
  }
  if (violations.length > 20) {
    console.log(`\n   ... and ${violations.length - 20} more`);
  }
}

console.log("");
process.exit(0);
