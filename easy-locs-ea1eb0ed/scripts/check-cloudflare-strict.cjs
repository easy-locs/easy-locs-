#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'runtime');
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];

function check(name, passed, detail) {
  const status = passed ? 'PASS' : 'FAIL';
  results.push({ name, status, detail });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${status}] ${name}`);
  if (detail) console.log(`       ${detail}`);
}

// 1. _worker.js exists and has SPA fallback
const workerPath = path.join(ROOT, 'public', '_worker.js');
if (fs.existsSync(workerPath)) {
  const src = fs.readFileSync(workerPath, 'utf8');
  const hasFallback = src.includes('/index.html') && src.includes('404');
  check('_worker.js SPA fallback', hasFallback, hasFallback ? 'Found /index.html fetch on 404' : 'Missing SPA fallback for 404');
} else {
  check('_worker.js exists', false, 'public/_worker.js not found');
}

// 2. _headers CSP includes 'unsafe-inline' in script-src
const headersPath = path.join(ROOT, 'public', '_headers');
let headersSrc = '';
if (fs.existsSync(headersPath)) {
  headersSrc = fs.readFileSync(headersPath, 'utf8');
  const cspLine = headersSrc.split('\n').find(l => l.includes('Content-Security-Policy'));
  const scriptSrcMatch = cspLine && /script-src([^;]+)/.exec(cspLine);
  const hasUnsafeInline = scriptSrcMatch && scriptSrcMatch[1].includes("'unsafe-inline'");
  check("_headers CSP script-src has 'unsafe-inline'", !!hasUnsafeInline,
    hasUnsafeInline ? "script-src contains 'unsafe-inline'" : "Missing 'unsafe-inline' in script-src");
} else {
  check('_headers exists', false, 'public/_headers not found');
}

// 3. _headers does NOT have Cross-Origin-Embedder-Policy: credentialless
if (headersSrc) {
  const hasCoep = headersSrc.includes('Cross-Origin-Embedder-Policy: credentialless');
  check('_headers no COEP credentialless', !hasCoep,
    hasCoep ? 'Found Cross-Origin-Embedder-Policy: credentialless (blocks Stripe/Firebase)' : 'COEP credentialless not present');
}

// 4. _headers has worker-src 'self' blob:
if (headersSrc) {
  const hasWorkerSrc = headersSrc.includes("worker-src 'self' blob:");
  check("_headers has worker-src 'self' blob:", hasWorkerSrc,
    hasWorkerSrc ? "worker-src directive present" : "Missing worker-src 'self' blob: directive");
}

// 5. wrangler.toml has pages_build_output_dir = "dist" and name = "easy-locs"
const wranglerPath = path.join(ROOT, 'wrangler.toml');
if (fs.existsSync(wranglerPath)) {
  const wrangler = fs.readFileSync(wranglerPath, 'utf8');
  const hasOutputDir = wrangler.includes('pages_build_output_dir') && wrangler.includes('"dist"');
  const hasName = wrangler.includes('name') && (wrangler.includes('"easy-locs"') || wrangler.includes("'easy-locs'"));
  check('wrangler.toml pages_build_output_dir = "dist"', hasOutputDir,
    hasOutputDir ? 'Found pages_build_output_dir = "dist"' : 'Missing pages_build_output_dir = "dist"');
  check('wrangler.toml name = "easy-locs"', hasName,
    hasName ? 'Found name = "easy-locs"' : 'Missing name = "easy-locs"');
} else {
  check('wrangler.toml exists', false, 'wrangler.toml not found — skipping wrangler checks');
}

// 6. package.json: build:cf exists and contains SKIP_HEAVY_SEO=1
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const buildCf = pkg.scripts && pkg.scripts['build:cf'];
const hasBuildCf = typeof buildCf === 'string';
check('package.json has build:cf script', hasBuildCf,
  hasBuildCf ? `build:cf = "${buildCf}"` : 'Missing build:cf script');
if (hasBuildCf) {
  const hasSkipHeavySeo = buildCf.includes('SKIP_HEAVY_SEO');
  check('build:cf contains SKIP_HEAVY_SEO', hasSkipHeavySeo,
    hasSkipHeavySeo ? 'Found SKIP_HEAVY_SEO in build:cf' : 'build:cf missing SKIP_HEAVY_SEO=1');
}

// 7. package.json scripts: NO wrangler versions upload
const allScripts = Object.values(pkg.scripts || {}).join('\n');
const hasVersionsUpload = allScripts.includes('wrangler versions upload');
check('package.json no "wrangler versions upload"', !hasVersionsUpload,
  hasVersionsUpload ? 'Found forbidden "wrangler versions upload" in scripts' : '"wrangler versions upload" not found');

// 8. package.json devDependencies has wrangler
const hasDev = pkg.devDependencies && pkg.devDependencies['wrangler'];
const hasDep = pkg.dependencies && pkg.dependencies['wrangler'];
check('wrangler in devDependencies', !!(hasDev || hasDep),
  (hasDev || hasDep) ? `wrangler: ${hasDev || hasDep}` : 'wrangler not found in dependencies');

// Write report
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

const md = `# Cloudflare Strict Config Report

Generated: ${new Date().toISOString()}

## Results: ${passed} passed, ${failed} failed

${results.map(r => `- **[${r.status}]** ${r.name}${r.detail ? `\n  > ${r.detail}` : ''}`).join('\n')}

## Verdict: ${failed === 0 ? '✅ ALL CHECKS PASS' : `❌ ${failed} CHECK(S) FAILED`}
`;

fs.writeFileSync(path.join(OUT_DIR, 'CLOUDFLARE_STRICT_REPORT.md'), md);
console.log(`\nReport: docs/runtime/CLOUDFLARE_STRICT_REPORT.md`);
console.log(`Result: ${passed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);
