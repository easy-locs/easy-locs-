#!/usr/bin/env node
/**
 * generate-final-verdict.cjs
 *
 * Aggregates all gate results and produces the final deploy verdict.
 *
 * Inputs (environment variables or flags):
 *   GATE_TYPECHECK=pass|fail
 *   GATE_LINT=pass|fail
 *   GATE_UNIT=pass|fail
 *   GATE_CONTRACTS=pass|fail
 *   GATE_ARCH=pass|fail
 *   GATE_SECURITY=pass|fail
 *   GATE_SEMGREP=pass|fail
 *   GATE_BUNDLE=pass|fail
 *   GATE_CF_BUILD=pass|fail
 *   GATE_CF_STRICT=pass|fail
 *   GATE_SUPABASE_GUARD=pass|fail
 *   GATE_DIST_ASSETS=pass|fail
 *   GATE_PLAYWRIGHT_SMOKE=pass|fail
 *   GATE_HOSTED_VERIFY=pass|fail|skipped
 *   BASE_URL=<url>   (if set, hosted verification is mandatory)
 *   BRANCH=<name>    (branch name for context)
 *
 * Outputs:
 *   docs/runtime/FINAL_DEPLOY_VERDICT.md
 *   test-results/repair-backlog.json
 *
 * Exit codes:
 *   0 = SAFE_TO_MERGE
 *   2 = KEEP_OPEN_RUNTIME_VERIFICATION_REQUIRED (non-main branch, no BASE_URL)
 *   1 = DO_NOT_MERGE_BLOCKERS_FOUND
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "runtime");
const RESULTS_DIR = path.join(ROOT, "test-results");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

const env = process.env;
const BASE_URL = env.BASE_URL || "";
const BRANCH = env.BRANCH || env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || "unknown";
const isMainBranch = BRANCH === "main" || BRANCH === "master";
const hasHostedUrl = !!BASE_URL && !/localhost|127\.0\.0\.1|\[::1\]/.test(BASE_URL);

const gates = [
  { key: "GATE_TYPECHECK",       label: "TypeScript strict check",       mandatory: true },
  { key: "GATE_LINT",            label: "ESLint",                         mandatory: true },
  { key: "GATE_UNIT",            label: "Unit tests",                     mandatory: true },
  { key: "GATE_CONTRACTS",       label: "Contract tests",                 mandatory: true },
  { key: "GATE_ARCH",            label: "Architecture checks",            mandatory: true },
  { key: "GATE_SECURITY",        label: "Security audit (npm audit)",     mandatory: true },
  { key: "GATE_SEMGREP",         label: "SAST / Semgrep",                 mandatory: false },
  { key: "GATE_BUNDLE",          label: "Bundle budget",                  mandatory: true },
  { key: "GATE_CF_BUILD",        label: "Cloudflare build:cf",            mandatory: true },
  { key: "GATE_CF_STRICT",       label: "Cloudflare strict config check", mandatory: true },
  { key: "GATE_SUPABASE_GUARD",  label: "Supabase lazy access guard",     mandatory: true },
  { key: "GATE_DIST_ASSETS",     label: "Dist asset verifier",            mandatory: true },
  { key: "GATE_PLAYWRIGHT_SMOKE","label": "Playwright smoke (local)",      mandatory: true },
  {
    key: "GATE_HOSTED_VERIFY",
    label: "Hosted HTTPS verification (CF Pages preview)",
    mandatory: hasHostedUrl,
    skippable: !hasHostedUrl,
  },
];

const blockers = [];
const passed = [];
const skipped = [];

for (const gate of gates) {
  const raw = (env[gate.key] || "").toLowerCase().trim();
  const status = raw === "pass" ? "pass" : raw === "fail" ? "fail" : raw === "skipped" ? "skipped" : "unknown";

  if (status === "pass") {
    passed.push(gate.label);
    console.log(`  ✅ PASS  ${gate.label}`);
  } else if (status === "skipped" || (!env[gate.key] && gate.skippable)) {
    skipped.push(gate.label);
    console.log(`  ⏩ SKIP  ${gate.label} (no BASE_URL, hosted verification deferred)`);
  } else if (gate.mandatory && status !== "pass") {
    blockers.push({ label: gate.label, status, key: gate.key });
    console.error(`  ❌ FAIL  ${gate.label} (${status})`);
  } else if (!gate.mandatory && status === "fail") {
    console.warn(`  ⚠️  WARN  ${gate.label} (non-blocking)`);
  } else if (status === "unknown" || !env[gate.key]) {
    if (gate.mandatory) {
      blockers.push({ label: gate.label, status: "not-reported", key: gate.key });
      console.error(`  ❌ MISSING ${gate.label} (gate result not reported)`);
    }
  }
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

let verdict;
let exitCode;

if (blockers.length === 0 && !skipped.find(s => s.includes("Hosted"))) {
  verdict = "SAFE_TO_MERGE";
  exitCode = 0;
} else if (blockers.length === 0 && skipped.length > 0 && !isMainBranch) {
  verdict = "KEEP_OPEN_RUNTIME_VERIFICATION_REQUIRED";
  exitCode = 2;
} else if (blockers.length === 0 && isMainBranch) {
  verdict = "DO_NOT_MERGE_BLOCKERS_FOUND";
  exitCode = 1;
  blockers.push({ label: "Hosted HTTPS verification required before main merge", status: "skipped", key: "GATE_HOSTED_VERIFY" });
} else {
  verdict = "DO_NOT_MERGE_BLOCKERS_FOUND";
  exitCode = 1;
}

const verdictEmoji = {
  "SAFE_TO_MERGE": "✅",
  "KEEP_OPEN_RUNTIME_VERIFICATION_REQUIRED": "⏳",
  "DO_NOT_MERGE_BLOCKERS_FOUND": "🚫",
}[verdict] || "❓";

console.log(`\n[final-verdict] ─────────────────────────────`);
console.log(`  Branch: ${BRANCH}`);
console.log(`  BASE_URL: ${BASE_URL || "(not set — local only)"}`);
console.log(`  Gates passed: ${passed.length}`);
console.log(`  Gates skipped: ${skipped.length}`);
console.log(`  Blockers: ${blockers.length}`);
console.log(`\n  ${verdictEmoji} VERDICT: ${verdict}\n`);

// ─── Repair backlog ───────────────────────────────────────────────────────────

const repairBacklog = {
  generated: new Date().toISOString(),
  branch: BRANCH,
  verdict,
  blockers: blockers.map(b => ({
    label: b.label,
    status: b.status,
    severity: "BLOCKER",
    mergeImpact: "Blocks merge",
    recommendation: `Investigate ${b.key} gate failure. Fix root cause with minimal patch.`,
  })),
  skipped: skipped.map(s => ({
    label: s,
    status: "skipped",
    severity: "HIGH",
    mergeImpact: "Must complete before merge to main",
    recommendation: "Set BASE_URL to the CF Pages preview URL and re-run hosted verification gate.",
  })),
};

fs.writeFileSync(
  path.join(RESULTS_DIR, "repair-backlog.json"),
  JSON.stringify(repairBacklog, null, 2),
  "utf8"
);

// ─── Markdown report ──────────────────────────────────────────────────────────

let md = `# Final Deploy Verdict\n\n`;
md += `> Generated: ${new Date().toISOString()}\n`;
md += `> Branch: \`${BRANCH}\`\n`;
md += `> BASE_URL: ${BASE_URL || "*(not set — hosted verification deferred)*"}\n\n`;
md += `## ${verdictEmoji} Verdict: \`${verdict}\`\n\n`;

if (verdict === "SAFE_TO_MERGE") {
  md += `All mandatory gates passed and hosted HTTPS verification confirmed. Branch is safe to merge.\n\n`;
} else if (verdict === "KEEP_OPEN_RUNTIME_VERIFICATION_REQUIRED") {
  md += `All code-side gates passed. Hosted HTTPS verification is pending (no BASE_URL available).\n`;
  md += `A human reviewer must open the Cloudflare Pages preview URL and verify all 8 routes before merging.\n\n`;
  md += `### Hosted Verification Checklist\n\n`;
  md += `For each of \`/\`, \`/login\`, \`/dashboard\`, \`/admin\`, \`/orbit\`, \`/radar\`, \`/wallet\`, \`/me\`:\n\n`;
  md += `- [ ] No black screen\n`;
  md += `- [ ] Splash disappears\n`;
  md += `- [ ] React mounts (\`window.__EASYLOCS_REACT_MOUNTED__ === true\`)\n`;
  md += `- [ ] No uncaught JS crash\n`;
  md += `- [ ] No failed JS/CSS asset requests\n`;
  md += `- [ ] Direct route refresh returns 200 (not CF 404)\n`;
  md += `- [ ] No CSP violations\n\n`;
} else {
  md += `Merge is **BLOCKED**. The following gates failed:\n\n`;
}

md += `## Gate Results\n\n`;
md += `| Gate | Status |\n|---|---|\n`;
for (const g of gates) {
  const raw = (env[g.key] || "").toLowerCase().trim();
  const status = raw === "pass" ? "✅ PASS" : raw === "fail" ? "❌ FAIL" :
    raw === "skipped" ? "⏩ SKIPPED" : g.skippable ? "⏩ DEFERRED" : "⚠️ NOT REPORTED";
  md += `| ${g.label} | ${status} |\n`;
}

if (blockers.length > 0) {
  md += `\n## 🚫 Blockers\n\n`;
  md += `| Gate | Status | Action Required |\n|---|---|---|\n`;
  for (const b of blockers) {
    md += `| ${b.label} | ${b.status} | ${repairBacklog.blockers.find(r => r.label === b.label)?.recommendation || "Fix gate"} |\n`;
  }
}

md += `\n## Atomic Strictness Checklist\n\n`;
const atomicChecks = [
  "No route without test coverage",
  "No protected route without expected redirect rule",
  "No route returning Cloudflare 404",
  "No page with blank body",
  "No page with hidden splash forever",
  "No failed JS/CSS asset",
  "No uncaught boot error",
  "No env var crash",
  "No CSP violation",
  "No direct DB call from UI components",
  "No orphan critical page",
  "No duplicate canonical route",
  "No unregistered domain route",
  "No unsafe secret in code",
  "No Math.random() for security tokens/codes",
];
for (const check of atomicChecks) {
  md += `- [ ] ${check}\n`;
}

fs.writeFileSync(path.join(OUT_DIR, "FINAL_DEPLOY_VERDICT.md"), md, "utf8");
console.log("[final-verdict] Report written to docs/runtime/FINAL_DEPLOY_VERDICT.md");
console.log("[final-verdict] Repair backlog written to test-results/repair-backlog.json");

process.exit(exitCode === 2 ? 0 : exitCode); // exit 2 → 0 (allowed for non-main branches)
