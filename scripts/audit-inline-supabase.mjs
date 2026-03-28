#!/usr/bin/env node
/**
 * CI Audit: detect all inline supabase calls in UI layers.
 * Allowed zones: src/repositories/, src/lib/, src/services/, src/integrations/
 * Auth-only exceptions: supabase.auth.* in auth pages/components.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BLOCKED_PATTERNS = [
  /supabase\s*\)\s*\.\s*from\s*\(/,
  /supabase\s*\.\s*from\s*\(/,
  /supabase\s*\)\s*\.\s*from\s*\(/,
  /supabase\s*\.\s*rpc\s*\(/,
  /supabase\s*\.\s*functions\s*\.\s*invoke\s*\(/,
  /supabase\s*\.\s*storage\s*\.\s*from\s*\(/,
];

// Auth calls are legitimate in these files
const AUTH_EXCEPTIONS = [
  "src/pages/Login.tsx",
  "src/pages/Signup.tsx",
  "src/pages/ForgotPassword.tsx",
  "src/pages/ResetPassword.tsx",
  "src/pages/VerifyEmail.tsx",
  "src/pages/AuthCallbackPage.tsx",
  "src/pages/TenantSignup.tsx",
  "src/components/auth/AdminRoute.tsx",
  "src/components/auth/ProtectedRoute.tsx",
  "src/contexts/AuthContext.tsx",
  "src/stores/v2AuthStore.ts",
];

// These dirs are allowed to use supabase directly
const ALLOWED_DIRS = [
  "src/repositories/",
  "src/lib/",
  "src/services/",
  "src/integrations/",
];

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (["node_modules", "dist", ".git", "supabase"].includes(item)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(item)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(path.join(ROOT, "src"));
const offenders = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);

  // Skip allowed directories
  if (ALLOWED_DIRS.some(d => rel.startsWith(d))) continue;

  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  const hits = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(line)) {
        hits.push({ line: i + 1, text: line.trim(), pattern: pattern.source });
      }
    }
    // Also check supabase.auth.* but skip auth exception files
    if (/supabase\s*\.\s*auth\s*\./.test(line) && !AUTH_EXCEPTIONS.includes(rel)) {
      hits.push({ line: i + 1, text: line.trim(), pattern: "supabase.auth.*" });
    }
  }

  if (hits.length > 0) {
    offenders.push({ file: rel, hits });
  }
}

if (offenders.length > 0) {
  console.error(`\n[INLINE AUDIT] ❌ ${offenders.length} file(s) with inline supabase calls:\n`);
  let total = 0;
  for (const o of offenders) {
    console.error(`  ${o.file} (${o.hits.length} calls)`);
    for (const h of o.hits.slice(0, 3)) {
      console.error(`    L${h.line}: ${h.text.slice(0, 100)}`);
    }
    if (o.hits.length > 3) console.error(`    ... +${o.hits.length - 3} more`);
    total += o.hits.length;
  }
  console.error(`\nTotal: ${offenders.length} files, ${total} inline calls.`);
  // Exit 1 to fail CI when enforced
  // process.exit(1);
  process.exit(0); // Soft mode during migration
}

console.log("[INLINE AUDIT] ✅ PASS — 0 inline supabase calls in UI layer.");
