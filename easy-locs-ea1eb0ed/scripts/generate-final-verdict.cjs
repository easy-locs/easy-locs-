#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'runtime');
const TEST_RESULTS_DIR = path.join(ROOT, 'test-results');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });

const GATE_FILE = path.join(TEST_RESULTS_DIR, 'gate-results.json');
const BACKLOG_FILE = path.join(TEST_RESULTS_DIR, 'repair-backlog.json');

// Parse CLI args: --gate NAME --result pass/fail --detail "message"
const args = process.argv.slice(2);
let gateArg = null, resultArg = null, detailArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--gate') gateArg = args[++i];
  else if (args[i] === '--result') resultArg = args[++i];
  else if (args[i] === '--detail') detailArg = args[++i];
}

// Load existing gate results
let gates = {
  typecheck: 'pending',
  lint: 'pending',
  unit_tests: 'pending',
  cloudflare_strict: 'pending',
  supabase_lazy: 'pending',
  dist_assets: 'pending',
  secret_scan: 'pending',
  hosted_verification: 'pending',
};

if (fs.existsSync(GATE_FILE)) {
  try {
    const existing = JSON.parse(fs.readFileSync(GATE_FILE, 'utf8'));
    gates = { ...gates, ...existing };
  } catch {
    // ignore malformed file
  }
}

// If called with --gate, update and save
if (gateArg && resultArg) {
  gates[gateArg] = resultArg;
  if (detailArg) {
    gates[`${gateArg}_detail`] = detailArg;
  }
  fs.writeFileSync(GATE_FILE, JSON.stringify(gates, null, 2) + '\n');
  console.log(`✅ Recorded gate "${gateArg}" = ${resultArg}`);
  process.exit(0);
}

// Generate final verdict
const BASE_URL = process.env.BASE_URL || '';

const BLOCKER_GATES = ['typecheck', 'lint', 'unit_tests', 'cloudflare_strict', 'supabase_lazy', 'dist_assets', 'secret_scan'];

const failures = BLOCKER_GATES.filter(g => gates[g] === 'fail');
const pending = BLOCKER_GATES.filter(g => gates[g] === 'pending');
const passes = BLOCKER_GATES.filter(g => gates[g] === 'pass');

let verdict;
if (failures.length > 0) {
  verdict = 'DO_NOT_MERGE_BLOCKERS_FOUND';
} else if (gates.hosted_verification === 'pass' || BASE_URL) {
  verdict = 'SAFE_TO_MERGE';
} else {
  verdict = 'KEEP_OPEN_RUNTIME_VERIFICATION_REQUIRED';
}

// Build repair backlog from failures
const backlog = failures.map(gate => ({
  severity: 'BLOCKER',
  gate,
  detail: gates[`${gate}_detail`] || 'See gate output for details',
}));
fs.writeFileSync(BACKLOG_FILE, JSON.stringify(backlog, null, 2) + '\n');

const verdictIcon = verdict === 'SAFE_TO_MERGE' ? '✅' : verdict === 'DO_NOT_MERGE_BLOCKERS_FOUND' ? '❌' : '⚠️';
console.log(`\n${verdictIcon} VERDICT: ${verdict}`);
console.log(`  Passed: ${passes.join(', ') || 'none'}`);
if (pending.length) console.log(`  Pending: ${pending.join(', ')}`);
if (failures.length) console.log(`  FAILED: ${failures.join(', ')}`);

const gateRows = Object.entries(gates)
  .filter(([k]) => !k.endsWith('_detail'))
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join('\n');

const md = `# Final Deploy Verdict

Generated: ${new Date().toISOString()}

## ${verdictIcon} Verdict: \`${verdict}\`

${verdict === 'SAFE_TO_MERGE' ? 'All blocker gates passed. Safe to merge and deploy.' :
  verdict === 'DO_NOT_MERGE_BLOCKERS_FOUND' ? `**DO NOT MERGE.** ${failures.length} blocker gate(s) failed: ${failures.join(', ')}` :
  'All blocker gates passed but hosted verification is pending. Keep PR open until runtime verification completes.'}

## Gate Status

| Gate | Result |
|------|--------|
${gateRows}

## Blocker Failures

${failures.length === 0 ? 'None' : failures.map(f => `- **${f}**: ${gates[`${f}_detail`] || 'See gate output'}`).join('\n')}

## Repair Backlog

${backlog.length === 0 ? 'Empty — no failures.' : `Written to \`test-results/repair-backlog.json\``}
`;

fs.writeFileSync(path.join(OUT_DIR, 'FINAL_DEPLOY_VERDICT.md'), md);
console.log(`\nReport: docs/runtime/FINAL_DEPLOY_VERDICT.md`);
console.log(`Backlog: test-results/repair-backlog.json`);

process.exit(failures.length > 0 ? 1 : 0);
