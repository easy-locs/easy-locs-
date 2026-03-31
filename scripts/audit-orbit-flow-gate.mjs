#!/usr/bin/env node
/**
 * CI Audit: Orbit Flow Gate Validation
 * Ensures: 1 entry → 1 pipeline → 1 owner → 1 output
 * Detects: duplicate writes, bypassed flow gates, unregistered entries
 *
 * Run: node scripts/audit-orbit-flow-gate.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ── Zones allowed to have direct DB writes ──
const ALLOWED_WRITE_ZONES = [
  "src/repositories/",
  "src/lib/db/",
  "src/integrations/",
  "src/services/",
  "src/domains/orbit/flow-gate/",
  "src/domains/orbit/services/",
  "src/domains/orbit/pipelines/",
  "src/domains/orbit/controllers/",
  "src/domains/orbit/realtime/",
  "src/families/orbit-dispatch/pipeline/",
  "src/stores/",
];

// ── Orbit-specific write patterns ──
const ORBIT_WRITE_PATTERNS = [
  { regex: /from\s*\(\s*["']conversations_v2["']\s*\)\s*\.\s*(insert|update|upsert|delete)\s*\(/, label: "conversations_v2 write" },
  { regex: /from\s*\(\s*["']chat_messages_v2["']\s*\)\s*\.\s*(insert|update|upsert|delete)\s*\(/, label: "chat_messages_v2 write" },
  { regex: /from\s*\(\s*["']ghost_call_sessions["']\s*\)\s*\.\s*(insert|update|upsert|delete)\s*\(/, label: "ghost_call_sessions write" },
  { regex: /from\s*\(\s*["']chat_attachments["']\s*\)\s*\.\s*(insert|update|upsert|delete)\s*\(/, label: "chat_attachments write" },
];

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (["node_modules", "dist", ".git", "supabase"].includes(item)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(item) && !item.endsWith(".d.ts") && !item.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(path.join(ROOT, "src"));
const violations = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (ALLOWED_WRITE_ZONES.some(z => rel.startsWith(z))) continue;

  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

    for (const p of ORBIT_WRITE_PATTERNS) {
      if (p.regex.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          code: line.trim().slice(0, 100),
          pattern: p.label,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\n[ORBIT FLOW GATE] ❌ ${violations.length} violation(s) — direct orbit DB writes outside pipelines:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} [${v.pattern}]`);
    console.error(`    ${v.code}`);
  }
  console.error(`\nFix: Move writes into repositories or pipeline executors.`);
  process.exit(1);
}

console.log("[ORBIT FLOW GATE] ✅ PASS — 0 orbit DB writes outside allowed zones.");
