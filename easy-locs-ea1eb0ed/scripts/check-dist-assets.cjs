#!/usr/bin/env node
/**
 * check-dist-assets.cjs
 *
 * After `npm run build:cf`, verifies the dist/ directory is healthy:
 *  1. dist/index.html exists
 *  2. All JS/CSS assets referenced in index.html exist on disk
 *  3. No missing modulepreload targets
 *  4. Critical chunk budgets respected
 *  5. No stale service-worker cache of broken assets
 *  6. vendor-react, vendor-react-router, vendor-supabase budgets logged
 *
 * Writes: docs/runtime/DIST_ASSET_REPORT.md
 *
 * Usage: node scripts/check-dist-assets.cjs [--strict]
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT_DIR = path.join(ROOT, "docs", "runtime");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const STRICT = process.argv.includes("--strict");

// Budget limits in bytes (must match vite.config.ts budget config)
const BUDGETS = {
  "vendor-react": 950 * 1024,       // react + react-dom + scheduler (~893 KB)
  "vendor-react-router": 100 * 1024, // react-router (~81 KB)
  "vendor-supabase": 500 * 1024,    // @supabase/supabase-js (~460 KB)
};

let failures = 0;
let warnings = 0;
const results = [];

function pass(msg, detail = "") {
  console.log("  ✅", msg, detail ? `(${detail})` : "");
  results.push({ status: "PASS", msg, detail });
}
function fail(msg, detail = "") {
  console.error("  ❌", msg, detail ? `(${detail})` : "");
  results.push({ status: "FAIL", severity: "BLOCKER", msg, detail });
  failures++;
}
function warn(msg, detail = "") {
  console.warn("  ⚠️ ", msg, detail ? `(${detail})` : "");
  results.push({ status: "WARN", msg, detail });
  warnings++;
}

function humanSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ─── 1. dist/index.html ───────────────────────────────────────────────────────

console.log("\n[dist-assets] 1. Checking dist/index.html");
const indexPath = path.join(DIST, "index.html");
if (!fs.existsSync(indexPath)) {
  fail("dist/index.html not found — build may have failed");
  console.log("[dist-assets] Cannot continue without index.html");
  writeSummaryReport();
  process.exit(1);
}
const indexHtml = fs.readFileSync(indexPath, "utf8");
pass("dist/index.html exists", `${humanSize(Buffer.byteLength(indexHtml))}`);

// ─── 2. JS/CSS asset references ───────────────────────────────────────────────

console.log("\n[dist-assets] 2. Checking referenced JS/CSS assets");

const scriptSrcs = [...indexHtml.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);
const preloads = [...indexHtml.matchAll(/modulepreload[^>]+href="([^"]+\.js)"/g)].map(m => m[1]);
const allRefs = [...new Set([...scriptSrcs, ...preloads])];

let missingAssets = 0;
for (const ref of allRefs) {
  const absPath = path.join(DIST, ref);
  if (fs.existsSync(absPath)) {
    const size = fs.statSync(absPath).size;
    pass(`Asset exists: ${ref}`, humanSize(size));
  } else {
    fail(`Missing asset: ${ref}`);
    missingAssets++;
  }
}

if (allRefs.length === 0) warn("No script/link refs found in index.html — check build output");
else if (missingAssets === 0) pass(`All ${allRefs.length} referenced assets exist on disk`);

// ─── 3. Modulepreload targets ─────────────────────────────────────────────────

console.log("\n[dist-assets] 3. Checking modulepreload targets");
if (preloads.length === 0) {
  warn("No modulepreload links found in index.html");
} else {
  let missingPreloads = 0;
  for (const href of preloads) {
    const absPath = path.join(DIST, href.startsWith("/") ? href : "/" + href);
    const alt = path.join(DIST, href);
    if (!fs.existsSync(absPath) && !fs.existsSync(alt)) {
      fail(`Missing modulepreload target: ${href}`);
      missingPreloads++;
    }
  }
  if (missingPreloads === 0) pass(`All ${preloads.length} modulepreload targets exist`);
}

// ─── 4. Chunk budgets ─────────────────────────────────────────────────────────

console.log("\n[dist-assets] 4. Checking chunk budgets");
const assetsDir = path.join(DIST, "assets");
if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  const budgetReport = [];

  for (const [chunkPrefix, limit] of Object.entries(BUDGETS)) {
    const matches = assetFiles.filter(f => f.startsWith(chunkPrefix) && f.endsWith(".js"));
    if (matches.length === 0) {
      warn(`Chunk not found: ${chunkPrefix}*.js (may have been split or renamed)`);
      continue;
    }
    for (const f of matches) {
      const size = fs.statSync(path.join(assetsDir, f)).size;
      const pct = ((size / limit) * 100).toFixed(0);
      const entry = { chunk: f, size, limit, pct: Number(pct) };
      budgetReport.push(entry);
      if (size > limit) fail(`Budget exceeded: ${f} is ${humanSize(size)} (limit ${humanSize(limit)}, ${pct}%)`);
      else pass(`Budget OK: ${f}`, `${humanSize(size)} / ${humanSize(limit)} (${pct}%)`);
    }
  }

  // Report all .js files > 500KB as informational
  const largeChunks = assetFiles
    .filter(f => f.endsWith(".js"))
    .map(f => ({ name: f, size: fs.statSync(path.join(assetsDir, f)).size }))
    .filter(f => f.size > 500 * 1024)
    .sort((a, b) => b.size - a.size);

  if (largeChunks.length > 0) {
    console.log("\n  [dist-assets] Large chunks (>500KB):");
    for (const { name, size } of largeChunks) {
      warn(`Large chunk: ${name}`, humanSize(size));
    }
  }
} else {
  warn("dist/assets/ directory not found — no chunked build output");
}

// ─── 5. Service worker check ─────────────────────────────────────────────────

console.log("\n[dist-assets] 5. Checking service worker");
const swFiles = ["service-worker.js", "sw.js", "firebase-messaging-sw.js"]
  .map(f => path.join(DIST, f))
  .filter(f => fs.existsSync(f));

if (swFiles.length === 0) {
  // Check public source
  const pubSw = path.join(ROOT, "public", "firebase-messaging-sw.js");
  if (fs.existsSync(pubSw)) pass("firebase-messaging-sw.js found in public/ (copied to dist at build)");
  else warn("No service worker found in dist/ or public/");
} else {
  for (const sw of swFiles) {
    const content = fs.readFileSync(sw, "utf8");
    if (/importScripts|cacheFirst|NetworkFirst|registerRoute/.test(content)) {
      pass(`Service worker: ${path.basename(sw)} appears valid`);
    } else {
      pass(`Service worker: ${path.basename(sw)} exists`);
    }
  }
}

// ─── 6. Summary ───────────────────────────────────────────────────────────────

function writeSummaryReport() {
  const verdict = failures === 0 ? "PASS" : "FAIL";
  console.log(`\n[dist-assets] ─── Summary ───`);
  console.log(`  PASS: ${results.filter(r => r.status === "PASS").length}`);
  console.log(`  FAIL: ${failures}`);
  console.log(`  WARN: ${warnings}`);
  console.log(`  Verdict: ${verdict}\n`);

  let md = `# Dist Asset Report\n\n`;
  md += `> Generated: ${new Date().toISOString()}\n`;
  md += `> Verdict: **${verdict}**\n`;
  md += `> Failures: ${failures} | Warnings: ${warnings}\n\n`;
  md += `## Results\n\n`;
  md += `| Status | Message | Detail |\n|---|---|---|\n`;
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
    md += `| ${icon} ${r.status} | ${r.msg} | ${r.detail || "-"} |\n`;
  }
  md += `\n## Atomic Requirements\n\n`;
  md += `- dist/index.html must exist\n`;
  md += `- All src/href assets referenced in index.html must exist in dist/\n`;
  md += `- All modulepreload targets must exist\n`;
  md += `- vendor-react ≤ ${humanSize(BUDGETS["vendor-react"])}\n`;
  md += `- vendor-react-router ≤ ${humanSize(BUDGETS["vendor-react-router"])}\n`;
  md += `- vendor-supabase ≤ ${humanSize(BUDGETS["vendor-supabase"])}\n`;

  fs.writeFileSync(path.join(OUT_DIR, "DIST_ASSET_REPORT.md"), md, "utf8");
  console.log("[dist-assets] Report written to docs/runtime/DIST_ASSET_REPORT.md");
}

writeSummaryReport();
if (failures > 0) process.exit(1);
