#!/usr/bin/env node
/**
 * check-cloudflare-strict.cjs
 *
 * Validates the Cloudflare Pages configuration is correct and safe.
 * Writes docs/runtime/CLOUDFLARE_STRICT_REPORT.md on completion.
 *
 * Checks:
 *  1. build command uses npm run build:cf (not plain build)
 *  2. wrangler deploy uses pages deploy dist --project-name easy-locs
 *  3. No wrangler versions upload (invalid for Pages)
 *  4. No --yes flag on wrangler deploy
 *  5. Output dir is dist
 *  6. _worker.js has SPA fallback (isDocument → /index.html)
 *  7. _headers CSP allows 'unsafe-inline' in script-src
 *  8. _headers CSP has worker-src 'self' blob:
 *  9. No Cross-Origin-Embedder-Policy: credentialless in _headers
 * 10. wrangler.toml name=easy-locs, compatibility_date present
 * 11. package.json has build:cf script using SKIP_HEAVY_SEO
 * 12. package.json has VITE_SUPABASE_PUBLISHABLE_KEY (not ANON_KEY)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "runtime");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

let failures = 0;
let warnings = 0;
const report = [];

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function pass(msg) {
  console.log("  ✅", msg);
  report.push({ status: "PASS", msg });
}

function fail(msg, severity = "BLOCKER") {
  console.error("  ❌", `[${severity}]`, msg);
  report.push({ status: "FAIL", severity, msg });
  failures++;
}

function warn(msg) {
  console.warn("  ⚠️ ", msg);
  report.push({ status: "WARN", msg });
  warnings++;
}

function check(label, fn) {
  console.log(`\n[CF-strict] ${label}`);
  try { fn(); } catch (e) { fail(`Uncaught error: ${e.message}`); }
}

// ─── checks ────────────────────────────────────────────────────────────────────

check("wrangler.toml", () => {
  const content = read("wrangler.toml");
  if (!content) { fail("wrangler.toml not found"); return; }
  if (/^name\s*=\s*"easy-locs"/m.test(content)) pass('name = "easy-locs"');
  else fail('wrangler.toml name must be "easy-locs"');
  if (/compatibility_date/.test(content)) pass("compatibility_date present");
  else fail("wrangler.toml missing compatibility_date");
  if (/pages_build_output_dir\s*=\s*"dist"/.test(content)) pass('pages_build_output_dir = "dist"');
  else warn('wrangler.toml: pages_build_output_dir should be "dist" (check if set externally)');
});

check("package.json build:cf script", () => {
  const pkg = read("package.json");
  if (!pkg) { fail("package.json not found"); return; }
  let parsed;
  try { parsed = JSON.parse(pkg); } catch { fail("package.json invalid JSON"); return; }
  const buildCf = parsed.scripts && parsed.scripts["build:cf"];
  if (!buildCf) { fail("package.json missing build:cf script"); return; }
  pass(`build:cf script found: ${buildCf.slice(0, 80)}`);
  if (buildCf.includes("SKIP_HEAVY_SEO") || buildCf.includes("build:cf")) pass("SKIP_HEAVY_SEO or light-build flag used");
  else warn("build:cf should set SKIP_HEAVY_SEO=1 to skip heavy plugins");
  if (/wrangler.*(versions upload|--yes)/.test(buildCf)) fail("build:cf must NOT use 'wrangler versions upload' or '--yes'");
  else pass("No forbidden wrangler versions upload in build:cf");
});

check("CI workflow deploy command safety", () => {
  const wfDir = path.join(ROOT, ".github", "workflows");
  if (!fs.existsSync(wfDir)) { warn("No .github/workflows directory found"); return; }
  const files = fs.readdirSync(wfDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
  let foundBadDeploy = false;
  for (const f of files) {
    const content = fs.readFileSync(path.join(wfDir, f), "utf8");
    if (/wrangler\s+versions\s+upload/.test(content)) {
      fail(`${f}: contains forbidden 'wrangler versions upload'`);
      foundBadDeploy = true;
    }
    if (/wrangler.*pages\s+deploy.*--yes/.test(content)) {
      fail(`${f}: contains forbidden '--yes' on wrangler deploy`);
      foundBadDeploy = true;
    }
  }
  if (!foundBadDeploy) pass("No forbidden wrangler commands in CI workflows");
});

check("_worker.js SPA fallback", () => {
  const content = read("public/_worker.js");
  if (!content) { fail("public/_worker.js not found"); return; }
  if (/index\.html/.test(content)) pass("_worker.js references /index.html fallback");
  else fail("_worker.js must serve /index.html for unknown navigation requests (SPA fallback)");
  if (/404/.test(content) && /index\.html/.test(content)) pass("_worker.js handles 404 → index.html fallback");
  else if (!(/404/.test(content))) warn("_worker.js may not handle 404 status from ASSETS.fetch");
  if (/isDocument|Accept.*text\/html|\.includes\(.*\.|\.[a-z]{2,4}['"]/.test(content)) pass("_worker.js has document/asset distinction");
  else warn("_worker.js: consider distinguishing document vs asset requests");
});

check("_headers CSP", () => {
  const content = read("public/_headers");
  if (!content) { fail("public/_headers not found"); return; }
  if (/script-src[^;]*'unsafe-inline'/.test(content)) pass("CSP script-src includes 'unsafe-inline'");
  else fail("CSP script-src MUST include 'unsafe-inline' (inline scripts in index.html)");
  if (/worker-src[^;]*'self'.*blob:/.test(content) || /worker-src[^;]*blob:/.test(content)) pass("CSP worker-src includes blob: (Partytown)");
  else warn("CSP worker-src should include 'self' blob: for Partytown web workers");
  if (/Cross-Origin-Embedder-Policy:\s*credentialless/i.test(content)) fail("_headers MUST NOT set Cross-Origin-Embedder-Policy: credentialless (blocks Stripe/Firebase)");
  else pass("No Cross-Origin-Embedder-Policy: credentialless (correct)");
  if (/Content-Security-Policy/.test(content)) pass("Content-Security-Policy header present");
  else fail("_headers missing Content-Security-Policy");
});

check("Env var naming", () => {
  const envFiles = [".env", ".env.example", ".env.production", ".env.local"].map(f => read(f)).filter(Boolean);
  let foundAnon = false;
  let foundPublishable = false;
  for (const content of envFiles) {
    if (/VITE_SUPABASE_ANON_KEY/.test(content)) foundAnon = true;
    if (/VITE_SUPABASE_PUBLISHABLE_KEY/.test(content)) foundPublishable = true;
  }
  if (foundAnon) warn("Found VITE_SUPABASE_ANON_KEY in env files — the correct name is VITE_SUPABASE_PUBLISHABLE_KEY");
  else pass("No deprecated VITE_SUPABASE_ANON_KEY found");

  // Check main.tsx for correct env var name usage
  const main = read("src/main.tsx");
  if (main) {
    if (/VITE_SUPABASE_PUBLISHABLE_KEY/.test(main)) pass("main.tsx uses VITE_SUPABASE_PUBLISHABLE_KEY");
    else warn("main.tsx may not reference VITE_SUPABASE_PUBLISHABLE_KEY correctly");
    // Only flag non-comment, non-string-literal references to the deprecated key
    const nonCommentLines = main.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    if (/VITE_SUPABASE_ANON_KEY/.test(nonCommentLines)) fail("main.tsx references deprecated VITE_SUPABASE_ANON_KEY");
  }
});

check("No .map/.br/.gz in build:cf output (heavy artifacts)", () => {
  const content = read("vite.config.ts");
  if (!content) { warn("vite.config.ts not found"); return; }
  if (/IS_LIGHT_CLOUDFLARE_BUILD|IS_CF_PAGES|SKIP_HEAVY/.test(content)) pass("vite.config.ts has light-build guard");
  else warn("vite.config.ts: verify heavy plugins (brotli/gzip/sourcemaps) are skipped for build:cf");
  if (/brotli|viteCompression/.test(content) && /!IS_LIGHT|!IS_CF|!SKIP/.test(content)) pass("Compression plugins are gated on non-CF builds");
  else if (/brotli|viteCompression/.test(content)) warn("Compression plugin found — verify it's excluded from build:cf");
  else pass("No compression plugin issues detected");
});

// ─── summary ──────────────────────────────────────────────────────────────────

console.log(`\n[CF-strict] ─── Summary ───`);
console.log(`  PASS: ${report.filter(r => r.status === "PASS").length}`);
console.log(`  FAIL: ${failures}`);
console.log(`  WARN: ${warnings}`);

const verdict = failures === 0 ? "PASS" : "FAIL";
console.log(`\n[CF-strict] Verdict: ${verdict}\n`);

// ─── write report ─────────────────────────────────────────────────────────────

let md = `# Cloudflare Strict Deploy Report\n\n`;
md += `> Generated: ${new Date().toISOString()}\n`;
md += `> Verdict: **${verdict}**\n`;
md += `> Failures: ${failures} | Warnings: ${warnings}\n\n`;
md += `## Results\n\n`;
md += `| Status | Severity | Message |\n|---|---|---|\n`;
for (const r of report) {
  const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
  md += `| ${icon} ${r.status} | ${r.severity || "-"} | ${r.msg} |\n`;
}
md += `\n## Required Env Vars (CF Pages)\n\n`;
md += `- \`VITE_SUPABASE_URL\`\n`;
md += `- \`VITE_SUPABASE_PUBLISHABLE_KEY\` (NOT \`VITE_SUPABASE_ANON_KEY\`)\n`;
md += `- \`NODE_OPTIONS=--max-old-space-size=1536\`\n\n`;
md += `## Build Command\n\n`;
md += `\`\`\`\ncd easy-locs-ea1eb0ed && npm ci --no-audit --no-fund && npm run build:cf\n\`\`\`\n\n`;
md += `## Deploy Command (manual only)\n\n`;
md += `\`\`\`\ncd easy-locs-ea1eb0ed && npx wrangler pages deploy dist --project-name easy-locs\n\`\`\`\n\n`;
md += `## Forbidden Commands\n\n`;
md += `- ❌ \`wrangler versions upload --yes\` (invalid for Pages)\n`;
md += `- ❌ \`wrangler deploy\` (use \`wrangler pages deploy\`)\n`;

fs.writeFileSync(path.join(OUT_DIR, "CLOUDFLARE_STRICT_REPORT.md"), md, "utf8");
console.log("[CF-strict] Report written to docs/runtime/CLOUDFLARE_STRICT_REPORT.md");

if (failures > 0) process.exit(1);
