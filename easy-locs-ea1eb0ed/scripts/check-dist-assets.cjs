#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
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

function info(name, detail) {
  results.push({ name, status: 'INFO', detail });
  console.log(`ℹ️  [INFO] ${name}: ${detail}`);
}

// Check dist/ exists at all
if (!fs.existsSync(DIST_DIR)) {
  check('dist/ directory exists', false, 'dist/ not found — run a build first');
  const md = `# Dist Asset Report\n\nGenerated: ${new Date().toISOString()}\n\n❌ dist/ directory not found. Run build first.\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'DIST_ASSET_REPORT.md'), md);
  console.log('\nReport: docs/runtime/DIST_ASSET_REPORT.md');
  process.exit(1);
}

// 1. dist/index.html exists
const indexPath = path.join(DIST_DIR, 'index.html');
const indexExists = fs.existsSync(indexPath);
check('dist/index.html exists', indexExists, indexExists ? '' : 'index.html missing from dist/');

let brokenAssets = [];
let chunkSizes = [];

if (indexExists) {
  const html = fs.readFileSync(indexPath, 'utf8');

  // 2. All referenced JS/CSS assets exist
  const assetRefs = [];
  // <script src="...">
  const scriptRe = /<script[^>]+src="([^"]+)"/g;
  let m;
  while ((m = scriptRe.exec(html)) !== null) assetRefs.push(m[1]);
  // <link href="...">
  const linkRe = /<link[^>]+href="([^"]+)"/g;
  while ((m = linkRe.exec(html)) !== null) assetRefs.push(m[1]);
  // modulepreload
  const preloadRe = /rel="modulepreload"[^>]+href="([^"]+)"/g;
  while ((m = preloadRe.exec(html)) !== null) assetRefs.push(m[1]);

  const localRefs = [...new Set(assetRefs)].filter(r => r.startsWith('/') && !r.startsWith('//'));
  for (const ref of localRefs) {
    const filePath = path.join(DIST_DIR, ref);
    if (!fs.existsSync(filePath)) {
      brokenAssets.push(ref);
    }
  }
  check(`All ${localRefs.length} referenced JS/CSS assets exist`, brokenAssets.length === 0,
    brokenAssets.length > 0 ? `Missing: ${brokenAssets.join(', ')}` : '');
}

// 3. No .map files in dist/assets/
const assetsDir = path.join(DIST_DIR, 'assets');
if (fs.existsSync(assetsDir)) {
  const mapFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.map'));
  check('No .map files in dist/assets/', mapFiles.length === 0,
    mapFiles.length > 0 ? `Found: ${mapFiles.join(', ')}` : '');

  // 4. No .br or .gz files in dist/assets/
  const compFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.br') || f.endsWith('.gz'));
  check('No .br/.gz files in dist/assets/', compFiles.length === 0,
    compFiles.length > 0 ? `Found: ${compFiles.join(', ')}` : '');

  // 5. vendor-react chunk exists and is under 460KB
  const vendorReact = fs.readdirSync(assetsDir).find(f => f.includes('vendor-react') && f.endsWith('.js'));
  if (vendorReact) {
    const size = fs.statSync(path.join(assetsDir, vendorReact)).size;
    const sizeKb = Math.round(size / 1024);
    check(`vendor-react chunk < 460KB`, sizeKb < 460, `vendor-react: ${sizeKb}KB (${vendorReact})`);
  } else {
    check('vendor-react chunk exists', false, 'No vendor-react*.js found in dist/assets/');
  }

  // 6. Chunk sizes summary
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  for (const f of jsFiles.sort()) {
    const size = fs.statSync(path.join(assetsDir, f)).size;
    chunkSizes.push({ name: f, sizeKb: Math.round(size / 1024) });
  }
  if (chunkSizes.length > 0) {
    info('Chunk sizes', chunkSizes.map(c => `${c.name}: ${c.sizeKb}KB`).join(', '));
  }
}

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

const chunkTable = chunkSizes.length > 0
  ? `\n## Chunk Sizes\n\n| Chunk | Size |\n|-------|------|\n${chunkSizes.map(c => `| ${c.name} | ${c.sizeKb}KB |`).join('\n')}\n`
  : '';

const md = `# Dist Asset Report

Generated: ${new Date().toISOString()}

## Results: ${passed} passed, ${failed} failed

${results.filter(r => r.status !== 'INFO').map(r => `- **[${r.status}]** ${r.name}${r.detail ? `\n  > ${r.detail}` : ''}`).join('\n')}
${chunkTable}
## Verdict: ${failed === 0 ? '✅ ALL CHECKS PASS' : `❌ ${failed} CHECK(S) FAILED`}
`;

fs.writeFileSync(path.join(OUT_DIR, 'DIST_ASSET_REPORT.md'), md);
console.log(`\nReport: docs/runtime/DIST_ASSET_REPORT.md`);
console.log(`Result: ${passed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);
