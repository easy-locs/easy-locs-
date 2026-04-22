#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'docs', 'runtime');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Patterns indicating eager access at module init level (outside function body)
// We look in db.ts specifically for the old patterns, then do a broader scan.
// Note: we only flag cases where the sub-client property itself is accessed (not method calls on it).
// Good: supabase.auth.onAuthStateChange(...)  — method call, fine inside functions
// Bad:  storage: supabase.storage,            — raw property access / eager assignment
// Bad:  supabase.rpc.bind(supabase)           — .bind() at init time
const EAGER_PATTERNS = [
  // Property shorthand: `storage: supabase.storage` (not followed by a dot or open-paren)
  /:\s*supabase\.(storage|functions|auth)\s*(?:[,;]|$)/,
  // Assignment: `= supabase.storage` (not followed by a dot)
  /=\s*supabase\.(storage|functions|auth)\s*(?:[,;]|$)/,
  // .bind(supabase) on any supabase sub-client
  /\bsupabase\.(rpc|auth|storage|functions|channel|removeChannel|getChannels|removeAllChannels)\s*\.bind\s*\(/,
];

function scanFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const violations = [];

  lines.forEach((line, i) => {
    // Skip comment lines
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    for (const pattern of EAGER_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({ file: filePath, line: i + 1, text: line.trim() });
        break;
      }
    }
  });
  return violations;
}

function walkDir(dir, ext = '.ts') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full, ext));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walkDir(SRC_DIR);
const allViolations = [];

for (const f of allFiles) {
  const v = scanFile(f);
  allViolations.push(...v);
}

const passed = allViolations.length === 0;

if (passed) {
  console.log('✅ No eager Supabase sub-client access found at module init time');
} else {
  console.log(`❌ Found ${allViolations.length} eager Supabase access violation(s):\n`);
  for (const v of allViolations) {
    const rel = path.relative(ROOT, v.file);
    console.log(`  ${rel}:${v.line}  →  ${v.text}`);
  }
}

// Write report
const md = `# Supabase Runtime Guard Report

Generated: ${new Date().toISOString()}

## Purpose

Detects eager module-init access to Supabase sub-clients (storage, auth, functions, channel bindings).
Eager access can cause failures in test environments where the Supabase client is mocked.

## Results

${passed
  ? '✅ **No violations found.** All Supabase sub-client access is lazy or deferred.'
  : `❌ **${allViolations.length} violation(s) found:**\n\n| File | Line | Code |\n|------|------|------|\n${allViolations.map(v => `| \`${path.relative(ROOT, v.file)}\` | ${v.line} | \`${v.text.replace(/\|/g, '\\|')}\` |`).join('\n')}`
}

## Rules

- \`supabase.storage\`, \`supabase.functions\`, \`supabase.auth\` must be accessed via lazy getters
- \`supabase.channel.bind()\`, \`supabase.rpc.bind()\` etc. must be replaced with arrow-fn wrappers
- All eager assignments at module top-level are forbidden
`;

fs.writeFileSync(path.join(OUT_DIR, 'SUPABASE_RUNTIME_GUARD.md'), md);
console.log(`\nReport: docs/runtime/SUPABASE_RUNTIME_GUARD.md`);

process.exit(passed ? 0 : 1);
