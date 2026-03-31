#!/usr/bin/env node
/**
 * CI Audit: Orbit Single Entry Enforcement
 * 
 * Ensures:
 * - No UI/hook/component imports orbit.services directly
 * - No UI/hook/component calls sendTextMessage/sendMediaMessage/etc directly
 * - No UI/hook/component does inline conversations_v2/chat_messages_v2 writes
 * - Only orbitDispatch is the public entry for user actions
 *
 * Run: node scripts/audit-orbit-single-entry.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// Files that are ALLOWED to use the internal orbit services/transport
const ALLOWED_ZONES = [
  "src/domains/orbit/",
  "src/families/orbit-dispatch/",
  "src/families/send/",
  "src/families/groups/",
  "src/families/broadcast/",
  "src/families/bridges/",
  "src/families/media/",
  "src/families/presence/",
  "src/repositories/",
  "src/lib/db/",
  "src/lib/orbit/",
  "src/lib/chat/messageService.ts",
  "src/lib/shared/communication-pipeline.ts",
  "src/lib/radar/contactBridge.ts",
  "src/stores/",
  "src/integrations/",
  "src/services/",
  "src/test/",
];

// Patterns that indicate direct orbit writes from unauthorized zones
const BLOCKED_PATTERNS = [
  {
    regex: /import\s+\{[^}]*(?:sendTextMessage|sendMediaMessage|sendVoiceMessage|markConversationRead)[^}]*\}\s+from\s+["']@\/domains\/orbit\/services/,
    label: "Direct import from orbit.services (use orbitDispatch instead)",
  },
  {
    regex: /from\s*\(\s*["']chat_messages_v2["']\s*\)\s*\.\s*(insert|update|upsert)\s*\(/,
    label: "Inline chat_messages_v2 write (use orbitDispatch or repository)",
  },
  {
    regex: /from\s*\(\s*["']conversations_v2["']\s*\)\s*\.\s*(insert|upsert)\s*\(/,
    label: "Inline conversations_v2 insert (use orbitDb or orbitDispatch)",
  },
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
  if (ALLOWED_ZONES.some(z => rel.startsWith(z))) continue;

  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

    for (const p of BLOCKED_PATTERNS) {
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
  console.error(`\n[ORBIT SINGLE ENTRY] ❌ ${violations.length} violation(s):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.pattern}`);
    console.error(`    ${v.code}`);
  }
  console.error(`\nFix: Use orbitDispatch({ type: '...' }) instead of direct imports.`);
  process.exit(1);
}

console.log("[ORBIT SINGLE ENTRY] ✅ PASS — all orbit actions route through orbitDispatch.");
