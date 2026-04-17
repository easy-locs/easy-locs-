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

  if (!fs.existsSync(routesDir)) {
    console.error(`[route-uniqueness] routes directory not found: ${routesDir}`);
    process.exit(1);
  }

  const occurrences = collectRouteOccurrences(routesDir);
  const dups = findDuplicateRoutes(occurrences);

  if (dups.size > 0) {
    console.error(
      `[route-uniqueness] ${dups.size} duplicated route path(s) detected ` +
        `across src/routes/*.routes.tsx:\n`,
    );
    for (const [p, list] of dups) {
      console.error(`  "${p}" declared ${list.length} times:`);
      for (const occ of list) console.error(`    - ${occ.file}`);
    }
    console.error(
      "\nFix by removing the duplicate <Route path=\"...\"> declaration. " +
        "React Router silently shadows later duplicates with the first match, " +
        "so duplicates produce dead code (see Task #988).",
    );
    process.exit(1);
  }

  console.log(
    `[route-uniqueness] OK — ${occurrences.length} absolute route path(s) ` +
      `across src/routes/*.routes.tsx are unique.`,
  );
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) main();
