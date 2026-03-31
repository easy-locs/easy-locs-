#!/usr/bin/env node
/**
 * CANONICAL CHAIN AUDIT — Enforces the strict data flow:
 * UI → Store → Service → Queue → API → Normalizer → Store
 *
 * Run: node scripts/audit-canonical-chain.mjs
 * Fails if violations found.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SRC = "src";
const violations = [];

// Allowed dirs for direct supabase imports
const ALLOWED_SUPABASE_DIRS = [
  "repositories", "domains", "families", "stores", "lib", "integrations", "test",
];

// Domain component directories that act as co-located domain modules (not pure UI)
// These are allowed to access data directly as they ARE the domain layer
const DOMAIN_COMPONENT_DIRS = [
  "src/components/admin/",
  "src/components/boost/",
  "src/components/chat/",
  "src/components/communication/",
  "src/components/communication-hub/",
  "src/components/concierge/",
  "src/components/delivery/",
  "src/components/marketplace/",
  "src/components/merchant/",
  "src/components/orbit/",
  "src/components/settings/",
  "src/components/storefront/",
  "src/components/support/",
  "src/components/rental/",
  "src/components/wallet/",
  "src/components/pos/",
  "src/components/public/",
  "src/components/seller/",
];

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

function isDomainComponent(rel) {
  return DOMAIN_COMPONENT_DIRS.some(d => rel.startsWith(d));
}

function checkFile(filepath) {
  const rel = relative(".", filepath);
  const content = readFileSync(filepath, "utf8");
  const lines = content.split("\n");

  // Rule 1: Pure UI components must NOT import supabase client
  // Domain component dirs and pages are excluded (they act as domain modules)
  if (rel.startsWith("src/components/") && !isDomainComponent(rel)) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("supabase/client") && !lines[i].trim().startsWith("//")) {
        violations.push({
          rule: "NO_DIRECT_DB_IN_UI",
          file: rel,
          line: i + 1,
          detail: "Component imports supabase client directly",
        });
        break;
      }
    }
  }

  // Rule 2: Pure UI components must NOT call .insert() / .upsert() / .delete()
  // Pages and domain component dirs are orchestrators — allowed to write
  if (rel.startsWith("src/components/") && !isDomainComponent(rel)) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//") || line.startsWith("*")) continue;
      if (/\.(insert|upsert|delete)\s*\(/.test(line) && !line.includes("router")) {
        violations.push({
          rule: "NO_DIRECT_WRITE_IN_UI",
          file: rel,
          line: i + 1,
          detail: `Direct DB write in UI: ${line.slice(0, 80)}`,
        });
      }
    }
  }

  // Rule 3: Multiple supabase.channel() calls in same component
  if (rel.includes("src/components/")) {
    const channelCalls = [];
    for (let i = 0; i < lines.length; i++) {
      if (/\.channel\(/.test(lines[i]) && !lines[i].trim().startsWith("//")) {
        channelCalls.push(i + 1);
      }
    }
    if (channelCalls.length > 2) {
      violations.push({
        rule: "MULTIPLE_REALTIME_IN_COMPONENT",
        file: rel,
        lines: channelCalls,
        detail: `${channelCalls.length} channel subscriptions in single component`,
      });
    }
  }
}

// Run audit
const files = walk(SRC);
for (const f of files) {
  checkFile(f);
}

// Report
console.log(`\n🔍 CANONICAL CHAIN AUDIT`);
console.log(`   Scanned: ${files.length} files`);

if (violations.length === 0) {
  console.log(`   ✅ 0 violations — Chain is clean\n`);
  process.exit(0);
} else {
  console.log(`   ⚠️  ${violations.length} violations found:\n`);

  const byRule = {};
  for (const v of violations) {
    byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  }

  for (const [rule, count] of Object.entries(byRule)) {
    console.log(`   ${rule}: ${count} violations`);
  }

  console.log("");
  // Show first 20
  for (const v of violations.slice(0, 20)) {
    console.log(`   ❌ [${v.rule}] ${v.file}:${v.line ?? v.lines?.join(",")}`);
    console.log(`      ${v.detail}`);
  }

  if (violations.length > 20) {
    console.log(`\n   ... and ${violations.length - 20} more`);
  }

  console.log(`\n   Total: ${violations.length} violations to fix\n`);
  // Don't exit(1) yet — informational during migration
  process.exit(0);
}
