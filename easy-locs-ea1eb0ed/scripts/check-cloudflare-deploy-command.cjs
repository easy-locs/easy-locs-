#!/usr/bin/env node
/**
 * check-cloudflare-deploy-command.cjs
 *
 * Regression guard: verifies that the Cloudflare deployment configuration
 * does NOT use the invalid `--yes` flag with `wrangler versions upload`, and
 * that the correct build/deploy commands are in place.
 *
 * Run with:  node scripts/check-cloudflare-deploy-command.cjs
 *
 * Background:
 *   Wrangler 4.x removed `--yes` from `wrangler versions upload`. Using it
 *   causes the deploy step to fail. This script catches that regression before
 *   it reaches the CF Pages CI pipeline.
 *
 *   For Cloudflare Pages projects, the correct deploy command is:
 *     npx wrangler pages deploy dist --project-name easy-locs
 *   NOT:
 *     wrangler versions upload ... --yes   (Workers Script command, invalid here)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
let warnings = 0;

function fail(msg) {
  console.error("[cf-deploy-check] FAIL:", msg);
  failures += 1;
}

function warn(msg) {
  console.warn("[cf-deploy-check] WARN:", msg);
  warnings += 1;
}

function ok(msg) {
  console.log("[cf-deploy-check] OK:", msg);
}

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

// Strip comment lines before checking (lines starting with #)
function stripComments(text) {
  return text.split("\n").filter(l => !l.trim().startsWith("#")).join("\n");
}

// ─── 1. wrangler.toml must exist ───────────────────────────────────────────
const wranglerToml = read("wrangler.toml");
if (wranglerToml === null) {
  fail("wrangler.toml not found — create it with pages_build_output_dir = \"dist\"");
} else {
  ok("wrangler.toml exists");

  // Must NOT contain `--yes` with `versions upload` in executable lines
  if (/versions\s+upload.*--yes/i.test(stripComments(wranglerToml))) {
    fail(
      "wrangler.toml contains `versions upload ... --yes` in a non-comment line — " +
      "this flag is INVALID in Wrangler 4.x. " +
      "Use `wrangler pages deploy dist` for Cloudflare Pages projects."
    );
  } else {
    ok("wrangler.toml does not contain `versions upload --yes` in executable lines");
  }

  // Should define pages_build_output_dir
  if (!wranglerToml.includes("pages_build_output_dir")) {
    warn(
      "wrangler.toml is missing `pages_build_output_dir` — " +
      "add `pages_build_output_dir = \"dist\"` so Wrangler knows where to find built assets."
    );
  } else {
    ok("wrangler.toml defines pages_build_output_dir");
  }

  // Should have a name
  if (!/^\s*name\s*=/m.test(wranglerToml)) {
    fail("wrangler.toml is missing `name` — add `name = \"easy-locs\"`");
  } else {
    ok("wrangler.toml defines name");
  }

  // Should NOT hardcode secrets
  const secretPattern = /VITE_SUPABASE_(URL|PUBLISHABLE_KEY|ANON_KEY)\s*=\s*"https?:\/\//;
  if (secretPattern.test(wranglerToml)) {
    fail(
      "wrangler.toml appears to contain a hardcoded Supabase secret. " +
      "Use the CF Pages dashboard → Settings → Environment Variables instead."
    );
  } else {
    ok("wrangler.toml contains no hardcoded Supabase secrets");
  }
}

// ─── 2. package.json must have build:cf ────────────────────────────────────
const pkg = JSON.parse(read("package.json") || "{}");
if (!pkg.scripts || !pkg.scripts["build:cf"]) {
  fail(
    "package.json is missing the `build:cf` script. " +
    "Add: \"build:cf\": \"cross-env SKIP_HEAVY_SEO=1 vite build\""
  );
} else {
  ok("package.json has build:cf script: " + pkg.scripts["build:cf"]);

  // build:cf must NOT use --yes
  if (/--yes/.test(pkg.scripts["build:cf"])) {
    fail("build:cf script contains `--yes` — remove it");
  }
}

// ─── 3. No GitHub workflow or script must use `versions upload --yes` ──────
const ciDir = path.join(ROOT, ".github", "workflows");
if (fs.existsSync(ciDir)) {
  for (const file of fs.readdirSync(ciDir)) {
    if (!/\.(yml|yaml)$/.test(file)) continue;
    const content = fs.readFileSync(path.join(ciDir, file), "utf8");
    // Strip YAML comment lines before checking
    const nonCommentContent = content.split("\n")
      .filter(l => !l.trim().startsWith("#"))
      .join("\n");
    if (/versions\s+upload.*--yes/i.test(nonCommentContent)) {
      fail(
        `.github/workflows/${file} contains \`versions upload --yes\` in a non-comment line. ` +
        "Replace with `wrangler pages deploy dist --project-name easy-locs`."
      );
    }
  }
  ok("No GitHub workflow uses `versions upload --yes` in executable lines");
}

// ─── 4. scripts/ must not contain the invalid deploy pattern ───────────────
const scriptsDir = path.join(ROOT, "scripts");
const thisFile = path.basename(__filename);
if (fs.existsSync(scriptsDir)) {
  for (const file of fs.readdirSync(scriptsDir)) {
    if (!/\.(sh|cjs|mjs|ts|js)$/.test(file)) continue;
    if (file === thisFile) continue; // skip self — error messages contain the pattern
    const content = fs.readFileSync(path.join(scriptsDir, file), "utf8");
    // Strip comment/string literals that legitimately reference the bad pattern for documentation
    const nonCommentLines = content.split("\n")
      .filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("#") && !l.trim().startsWith("*"))
      .join("\n");
    if (/versions\s+upload.*--yes/i.test(nonCommentLines)) {
      fail(
        `scripts/${file} contains \`versions upload --yes\` in executable code. ` +
        "Replace with `wrangler pages deploy dist`."
      );
    }
  }
  ok("No script in scripts/ uses `versions upload --yes` in executable code");
}

// ─── Summary ────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n[cf-deploy-check] ${failures} failure(s), ${warnings} warning(s). Fix failures before deploying.`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`\n[cf-deploy-check] 0 failures, ${warnings} warning(s). Deployment should work but review warnings.`);
} else {
  console.log("\n[cf-deploy-check] All Cloudflare deployment checks passed.");
}
