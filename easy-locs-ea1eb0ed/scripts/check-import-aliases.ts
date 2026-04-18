#!/usr/bin/env node
/**
 * check-import-aliases.ts — Task #1004 (Hardening).
 *
 * Fails CI when any TypeScript/TSX source file in `src/` imports a path
 * via the `@/` alias that does not resolve to an existing file under
 * `src/`. Catches dead imports introduced by refactors before they
 * become runtime crashes.
 *
 * Usage:
 *   npx tsx scripts/check-import-aliases.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const BASELINE = path.join(__dirname, "import-aliases-baseline.txt");

const EXTS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css"];
const INDEX_EXTS = EXTS.map((e) => `/index${e}`);

const IMPORT_RE = /(?:import|export)[^"'`]*?from\s+["']@\/([^"']+)["']/g;
const SIDE_IMPORT_RE = /import\s+["']@\/([^"']+)["']/g;
const DYNAMIC_RE = /import\(\s*["']@\/([^"']+)["']\s*\)/g;

interface Broken {
  file: string;
  spec: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function resolves(spec: string): boolean {
  const base = path.join(SRC, spec);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return true;
  for (const ext of EXTS) if (fs.existsSync(base + ext)) return true;
  for (const idx of INDEX_EXTS) if (fs.existsSync(base + idx)) return true;
  return false;
}

function extract(source: string): string[] {
  const specs = new Set<string>();
  for (const re of [IMPORT_RE, SIDE_IMPORT_RE, DYNAMIC_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) specs.add(m[1]);
  }
  return [...specs];
}

export function findBrokenImports(srcDir = SRC): Broken[] {
  const files = walk(srcDir);
  const broken: Broken[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const spec of extract(source)) {
      if (!resolves(spec)) broken.push({ file: path.relative(ROOT, file), spec: `@/${spec}` });
    }
  }
  return broken;
}

function loadBaseline(): Set<string> {
  if (!fs.existsSync(BASELINE)) return new Set();
  return new Set(
    fs.readFileSync(BASELINE, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#")),
  );
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli && process.argv.includes("--update-baseline")) {
  const broken = findBrokenImports();
  const lines = broken.map((b) => `${b.file}  →  ${b.spec}`).sort();
  fs.writeFileSync(BASELINE, lines.join("\n") + (lines.length ? "\n" : ""));
  console.log(`[check-import-aliases] baseline updated (${lines.length} entries).`);
  process.exit(0);
}
if (isCli) {
  if (!fs.existsSync(SRC)) {
    console.error(`[check-import-aliases] missing src dir at ${SRC}`);
    process.exit(2);
  }
  const broken = findBrokenImports();
  const baseline = loadBaseline();
  const fmt = (b: Broken) => `${b.file}  →  ${b.spec}`;
  const regressions = broken.filter((b) => !baseline.has(fmt(b)));

  if (regressions.length === 0) {
    if (broken.length > 0) {
      console.log(
        `[check-import-aliases] OK — ${broken.length} known broken @/ import(s) match baseline; no new regressions.`,
      );
    } else {
      console.log("[check-import-aliases] OK — all @/ imports resolve");
    }
    process.exit(0);
  }

  console.error(
    `[check-import-aliases] FAIL — ${regressions.length} NEW broken @/ import(s) beyond baseline:`,
  );
  for (const b of regressions.slice(0, 50)) console.error(`  ${fmt(b)}`);
  if (regressions.length > 50) console.error(`  …and ${regressions.length - 50} more`);
  console.error(
    `\nIf this regression is intentional (e.g. an existing path was removed), run:\n` +
      `  npx tsx scripts/check-import-aliases.ts --update-baseline`,
  );
  process.exit(1);
}

