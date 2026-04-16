#!/usr/bin/env node
// Reachability-based orphan detector.
// BFS from entry points, resolving @/ alias and relative imports.
// Any .ts/.tsx/.js/.jsx file in src/ that isn't reached is an orphan.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("easy-locs-ea1eb0ed");
const SRC = path.join(ROOT, "src");
const ALIAS_PREFIX = "@/";
const ALIAS_TARGET = SRC + path.sep;

const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function exists(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }

function resolveImport(fromFile, spec) {
  if (!spec) return null;
  // Skip bare module (node_modules)
  let abs;
  if (spec.startsWith(ALIAS_PREFIX)) {
    abs = path.join(SRC, spec.slice(ALIAS_PREFIX.length));
  } else if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) {
    abs = spec.startsWith("/") ? path.join(ROOT, spec.replace(/^\/+/, "")) : path.resolve(path.dirname(fromFile), spec);
  } else {
    return null; // bare / external
  }
  // Try as-is, then with extensions, then as directory/index
  if (exists(abs)) return abs;
  for (const ext of EXTS) if (exists(abs + ext)) return abs + ext;
  if (isDir(abs)) {
    for (const ext of EXTS) {
      const cand = path.join(abs, "index" + ext);
      if (exists(cand)) return cand;
    }
  }
  // Maybe spec includes extension that doesn't match (e.g. .js → .ts)
  const ext = path.extname(abs);
  if (ext) {
    const base = abs.slice(0, -ext.length);
    for (const e of EXTS) if (exists(base + e)) return base + e;
  }
  return null;
}

const IMPORT_RE = /(?:^|\s|[;,({])import\s+(?:[^'"`]*?from\s+)?["']([^"'`]+)["']/g;
const DYN_IMPORT_RE = /\bimport\s*\(\s*["']([^"'`]+)["']\s*\)/g;
const EXPORT_FROM_RE = /\bexport\s+(?:\*|\{[^}]*\}|[\w$*]+\s+)\s*from\s+["']([^"'`]+)["']/g;
const REQUIRE_RE = /\brequire\s*\(\s*["']([^"'`]+)["']\s*\)/g;

function extractImports(content) {
  const specs = new Set();
  for (const re of [IMPORT_RE, DYN_IMPORT_RE, EXPORT_FROM_RE, REQUIRE_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) specs.add(m[1]);
  }
  return [...specs];
}

// Collect all src files
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "_legacy") continue;
      walk(p, acc);
    } else if (EXTS.includes(path.extname(e.name)) || p.endsWith(".d.ts")) {
      acc.push(p);
    }
  }
  return acc;
}

const allFiles = walk(SRC);
const fileSet = new Set(allFiles);

// Entry points: main.tsx + all test files + stories + routes index + app-route-registry
const entries = [];
const mainTsx = path.join(SRC, "main.tsx");
if (exists(mainTsx)) entries.push(mainTsx);
for (const f of allFiles) {
  const base = path.basename(f);
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(base)) entries.push(f);
  else if (/\.stories\.(ts|tsx|js|jsx)$/.test(base)) entries.push(f);
  else if (f.endsWith(".d.ts")) entries.push(f);
  else if (f.includes(`${path.sep}test${path.sep}`) || f.endsWith(`${path.sep}setupTests.ts`)) entries.push(f);
}

// Also treat vite.config.ts, vitest.config.ts, etc. as roots — but they live outside src, so their imports into src count.
const externalRoots = [
  path.join(ROOT, "vite.config.ts"),
  path.join(ROOT, "vitest.config.ts"),
  path.join(ROOT, "vitest.contracts.config.ts"),
  path.join(ROOT, "playwright.config.ts"),
  path.join(ROOT, "vite-plugin-feeds.ts"),
  path.join(ROOT, "vite-plugin-indexnow.ts"),
  path.join(ROOT, "vite-plugin-og-images.ts"),
  path.join(ROOT, "vite-plugin-prerender.ts"),
  path.join(ROOT, "vite-plugin-seo-validate.ts"),
  path.join(ROOT, "vite-plugin-sitemap.ts"),
  path.join(ROOT, "vite-seo-data.ts"),
].filter(exists);

// Also walk e2e and tests directories for any references
function walkOpt(dir, acc = []) {
  if (!isDir(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkOpt(p, acc);
    else if (EXTS.includes(path.extname(e.name))) acc.push(p);
  }
  return acc;
}
for (const d of ["e2e", "tests", "scripts", "api", "supabase/functions", "lambda-handlers", "orchestrator", "infra"]) {
  externalRoots.push(...walkOpt(path.join(ROOT, d)));
}

const reachable = new Set();
const queue = [];

function enqueue(file) {
  if (!file) return;
  if (reachable.has(file)) return;
  if (!fileSet.has(file)) return;
  reachable.add(file);
  queue.push(file);
}

for (const f of entries) enqueue(f);

// Process external roots: extract their imports into src, add those as reachable.
for (const r of externalRoots) {
  let content;
  try { content = fs.readFileSync(r, "utf8"); } catch { continue; }
  for (const spec of extractImports(content)) {
    const resolved = resolveImport(r, spec);
    if (resolved && fileSet.has(resolved)) enqueue(resolved);
  }
}

// BFS
while (queue.length) {
  const f = queue.shift();
  let content;
  try { content = fs.readFileSync(f, "utf8"); } catch { continue; }
  for (const spec of extractImports(content)) {
    const resolved = resolveImport(f, spec);
    if (resolved && fileSet.has(resolved)) enqueue(resolved);
  }
}

const orphans = allFiles.filter(f => !reachable.has(f)).sort();
for (const o of orphans) {
  console.log(path.relative(".", o));
}
console.error(`Total src files: ${allFiles.length}`);
console.error(`Reachable: ${reachable.size}`);
console.error(`Orphans: ${orphans.length}`);
