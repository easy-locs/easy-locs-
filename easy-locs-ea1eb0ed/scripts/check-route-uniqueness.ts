#!/usr/bin/env node
/**
 * check-route-uniqueness.ts
 *
 * Guards against the regression fixed by Task #988: a duplicated
 * /admin/control/* block (24 lines of dead code shadowed by an earlier
 * identical block) and a duplicated /dashboard/command-center route.
 *
 * Scans every `src/routes/*.routes.tsx` file, extracts every
 * `<Route path="...">` literal (absolute paths only — relative children
 * are scoped to their parent and therefore cannot collide globally), and
 * fails the build when any path string appears more than once across the
 * entire pillar route set.
 *
 * Run:   npx tsx scripts/check-route-uniqueness.ts
 * CI:    wired as `npm run check:route-uniqueness`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface RouteOccurrence {
  file: string;
  path: string;
}

const BASELINE_FILENAME = "route-uniqueness-baseline.txt";

function loadBaseline(baselinePath: string): Set<string> {
  if (!fs.existsSync(baselinePath)) return new Set();
  return new Set(
    fs
      .readFileSync(baselinePath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#")),
  );
}

function writeBaseline(baselinePath: string, paths: string[]): void {
  const header =
    "# route-uniqueness-baseline — Task #1004.\n" +
    "# Each line is a route path that is currently duplicated and that\n" +
    "# the build accepts as a known regression. Resolve and remove from\n" +
    "# this file; never add new entries without a paired cleanup task.\n";
  fs.writeFileSync(
    baselinePath,
    header + Array.from(new Set(paths)).sort().join("\n") + "\n",
    "utf8",
  );
}

export function extractRoutePaths(source: string): string[] {
  const regex = /<Route\b[^>]*\bpath\s*=\s*"([^"]*)"/g;
  const paths: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(source)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

export function collectRouteOccurrences(routesDir: string): RouteOccurrence[] {
  const files = fs
    .readdirSync(routesDir)
    .filter((f) => f.endsWith(".routes.tsx"));

  const out: RouteOccurrence[] = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(routesDir, file), "utf8");
    for (const p of extractRoutePaths(source)) {
      // Relative (nested child) paths are scoped to a parent <Route> and
      // cannot collide globally — skip them, mirroring the rule used by
      // scripts/check-pillar-routes.ts.
      if (!p.startsWith("/")) continue;
      out.push({ file, path: p });
    }
  }
  return out;
}

export function findDuplicateRoutes(
  occurrences: RouteOccurrence[],
): Map<string, RouteOccurrence[]> {
  const byPath = new Map<string, RouteOccurrence[]>();
  for (const occ of occurrences) {
    const list = byPath.get(occ.path);
    if (list) list.push(occ);
    else byPath.set(occ.path, [occ]);
  }
  const dups = new Map<string, RouteOccurrence[]>();
  for (const [p, list] of byPath) {
    if (list.length > 1) dups.set(p, list);
  }
  return dups;
}

function main(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "..");
  const routesDir = path.join(repoRoot, "src", "routes");
  const baselinePath = path.join(here, BASELINE_FILENAME);
  const updateBaseline = process.argv.includes("--update-baseline");

  if (!fs.existsSync(routesDir)) {
    console.error(`[route-uniqueness] routes directory not found: ${routesDir}`);
    process.exit(1);
  }

  const occurrences = collectRouteOccurrences(routesDir);
  const dups = findDuplicateRoutes(occurrences);

  if (updateBaseline) {
    writeBaseline(baselinePath, Array.from(dups.keys()));
    console.log(
      `[route-uniqueness] baseline updated — ${dups.size} known duplicate(s) ` +
        `recorded at ${path.relative(repoRoot, baselinePath)}.`,
    );
    return;
  }

  const baseline = loadBaseline(baselinePath);
  const newDups = new Map<string, RouteOccurrence[]>();
  for (const [p, list] of dups) {
    if (!baseline.has(p)) newDups.set(p, list);
  }

  if (newDups.size > 0) {
    console.error(
      `[route-uniqueness] ${newDups.size} NEW duplicated route path(s) ` +
        `detected (not in baseline) across src/routes/*.routes.tsx:\n`,
    );
    for (const [p, list] of newDups) {
      console.error(`  "${p}" declared ${list.length} times:`);
      for (const occ of list) console.error(`    - ${occ.file}`);
    }
    console.error(
      "\nFix by removing the duplicate <Route path=\"...\"> declaration. " +
        "React Router silently shadows later duplicates with the first match, " +
        "so duplicates produce dead code (see Task #988). To intentionally " +
        "accept a regression (and pair it with a cleanup task), run:\n" +
        "  npx tsx scripts/check-route-uniqueness.ts --update-baseline",
    );
    process.exit(1);
  }

  // Detect baseline entries that are now resolved — encourage shrinking.
  const stale = Array.from(baseline).filter((p) => !dups.has(p));
  if (stale.length > 0) {
    console.warn(
      `[route-uniqueness] baseline contains ${stale.length} stale entr(y/ies) ` +
        `that are no longer duplicated — shrink it with --update-baseline:`,
    );
    for (const p of stale) console.warn(`    - ${p}`);
  }

  console.log(
    `[route-uniqueness] OK — ${occurrences.length} absolute route path(s); ` +
      `${dups.size} duplicate(s) total, ${baseline.size} accepted via baseline, ` +
      `0 NEW duplicates.`,
  );
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) main();
