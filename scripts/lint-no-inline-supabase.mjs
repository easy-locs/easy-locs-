#!/usr/bin/env node
/**
 * Pre-commit / CI gate: blocks new inline supabase calls in pages/components/hooks.
 * Run: node scripts/lint-no-inline-supabase.mjs [file1] [file2] ...
 * If no files given, scans all src/pages, src/components, src/hooks.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BLOCKED = [
  /supabase\s*\)\s*\.\s*from\s*\(/,
  /supabase\s*\.\s*from\s*\(/,
  /supabase\s*\.\s*rpc\s*\(/,
  /supabase\s*\.\s*functions\s*\.\s*invoke\s*\(/,
  /supabase\s*\.\s*storage\s*\.\s*from\s*\(/,
];

const ALLOWED_DIRS = ["src/repositories/", "src/lib/", "src/services/", "src/integrations/"];
const AUTH_FILES = new Set([
  "src/pages/Login.tsx", "src/pages/Signup.tsx", "src/pages/ForgotPassword.tsx",
  "src/pages/ResetPassword.tsx", "src/pages/VerifyEmail.tsx", "src/pages/AuthCallbackPage.tsx",
  "src/pages/TenantSignup.tsx", "src/components/auth/AdminRoute.tsx",
  "src/components/auth/ProtectedRoute.tsx", "src/contexts/AuthContext.tsx",
  "src/stores/v2AuthStore.ts",
]);

const args = process.argv.slice(2);
let filesToCheck = args;

if (filesToCheck.length === 0) {
  function walk(dir, out = []) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (["node_modules", "dist", ".git"].includes(item)) continue;
        walk(full, out);
      } else if (/\.(ts|tsx)$/.test(item)) out.push(full);
    }
    return out;
  }
  filesToCheck = [
    ...walk(path.join(ROOT, "src/pages")),
    ...walk(path.join(ROOT, "src/components")),
    ...walk(path.join(ROOT, "src/hooks")),
  ];
}

let violations = 0;
for (const file of filesToCheck) {
  const rel = path.relative(ROOT, file);
  if (ALLOWED_DIRS.some(d => rel.startsWith(d))) continue;
  if (!fs.existsSync(file)) continue;

  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const pat of BLOCKED) {
      if (pat.test(lines[i])) {
        console.error(`❌ ${rel}:${i + 1} — inline supabase call blocked`);
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} violation(s). Move calls to src/repositories/ or src/lib/.`);
  process.exit(1);
}
console.log("✅ No new inline supabase calls.");
