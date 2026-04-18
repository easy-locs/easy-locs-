#!/usr/bin/env node
/**
 * check-page-orphans.ts — Task #1004 (Hardening).
 *
 * Fails CI when any file under `src/pages/` is not referenced (by import
 * or lazy(() => import("@/pages/...")) or `<Route element={<Foo />}>`)
 * from anywhere else in `src/`. Catches dead pages introduced by
 * refactors that never made it into a route table.
 *
 * Pre-existing orphans are captured in
 * scripts/page-orphans-baseline.txt; the gate only fails on NEW
 * orphans. Refresh the baseline with `--update-baseline`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const PAGES = path.join(SRC, "pages");
const BASELINE = path.join(__dirname, "page-orphans-baseline.txt");

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function loadBaseline(): Set<string> {
  if (!fs.existsSync(BASELINE)) return new Set();
  return new Set(
    fs
      .readFileSync(BASELINE, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#")),
  );
}

function writeBaseline(orphans: string[]): void {
  const header =
    "# page-orphans-baseline — Task #1004.\n" +
    "# Each line is a path under src/pages/ that is currently not\n" +
    "# referenced from anywhere else in src/. Resolve the orphan (wire\n" +
    "# it into a route or delete it) and remove from this file.\n";
  fs.writeFileSync(
    BASELINE,
    header + Array.from(new Set(orphans)).sort().join("\n") + "\n",
    "utf8",
  );
}

function pageReferenceTokens(pageFile: string): string[] {
  // Build the candidate import specs that would resolve to this file.
  const rel = path.relative(SRC, pageFile).replace(/\\/g, "/");
  const noExt = rel.replace(/\.(ts|tsx)$/, "");
  const noIndex = noExt.replace(/\/index$/, "");
  const tokens = new Set<string>();
  // @/ alias variants
  tokens.add(`@/${noExt}`);
  tokens.add(`@/${noIndex}`);
  // Bare basename for grep heuristics (component name lookup)
  const base = path.basename(noIndex);
  if (base && /^[A-Z]/.test(base)) tokens.add(base);
  return Array.from(tokens);
}

function main(): void {
  if (!fs.existsSync(PAGES)) {
    console.log("[page-orphans] No src/pages directory — skipping.");
    return;
  }

  const update = process.argv.includes("--update-baseline");
  const pageFiles = walk(PAGES);
  const allSrcFiles = walk(SRC);

  // Build a single concatenated reference corpus (excluding the page
  // file itself) so we can grep it cheaply.
  const orphans: string[] = [];
  for (const page of pageFiles) {
    const rel = path.relative(ROOT, page).replace(/\\/g, "/");
    const tokens = pageReferenceTokens(page);
    let referenced = false;
    for (const other of allSrcFiles) {
      if (other === page) continue;
      const text = fs.readFileSync(other, "utf8");
      if (tokens.some((t) => text.includes(t))) {
        referenced = true;
        break;
      }
    }
    if (!referenced) orphans.push(rel);
  }

  if (update) {
    writeBaseline(orphans);
    console.log(
      `[page-orphans] baseline updated — ${orphans.length} known orphan(s) recorded at ${path.relative(ROOT, BASELINE)}.`,
    );
    return;
  }

  const baseline = loadBaseline();
  const newOrphans = orphans.filter((o) => !baseline.has(o));

  if (newOrphans.length > 0) {
    console.error(
      `[page-orphans] ${newOrphans.length} NEW orphan page(s) detected (not in baseline):`,
    );
    for (const o of newOrphans) console.error(`    - ${o}`);
    console.error(
      "\nFix by either wiring the page into a route table under src/routes/ " +
        "or deleting it. To intentionally accept a regression, run:\n" +
        "  npx tsx scripts/check-page-orphans.ts --update-baseline",
    );
    process.exit(1);
  }

  const stale = Array.from(baseline).filter((o) => !orphans.includes(o));
  if (stale.length > 0) {
    console.warn(
      `[page-orphans] baseline contains ${stale.length} stale entr(y/ies) — shrink with --update-baseline:`,
    );
    for (const o of stale) console.warn(`    - ${o}`);
  }

  console.log(
    `[page-orphans] OK — ${pageFiles.length} page(s); ${orphans.length} orphan(s) total, ${baseline.size} accepted via baseline, 0 NEW.`,
  );
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) main();
