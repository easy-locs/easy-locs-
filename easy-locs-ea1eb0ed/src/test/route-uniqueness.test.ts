/**
 * Route uniqueness governance test (Task #991).
 *
 * Backstop for Task #988, which removed a duplicated /admin/control/* block
 * (24 lines of dead code shadowed by an earlier identical block) and a
 * duplicated /dashboard/command-center route. React Router silently picks
 * the first matching <Route>, so duplicates produce dead code that is hard
 * to spot in review. This test fails the build whenever any absolute
 * `<Route path="...">` literal appears more than once across the pillar
 * route files (every `.tsx` under `src/routes`, including `index.tsx`).
 */
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  collectRouteOccurrences,
  findDuplicateRoutes,
  extractRoutePaths,
} from "../../scripts/check-route-uniqueness";

const routesDir = path.resolve(__dirname, "..", "routes");

describe("src/routes/*.tsx — route uniqueness", () => {
  it("declares every absolute route path at most once", () => {
    const occurrences = collectRouteOccurrences(routesDir);
    const duplicates = findDuplicateRoutes(occurrences);

    if (duplicates.size > 0) {
      const detail = Array.from(duplicates.entries())
        .map(([p, list]) => `  "${p}" declared in: ${list.map((o) => o.file).join(", ")}`)
        .join("\n");
      throw new Error(
        `Duplicate route path(s) detected across src/routes/*.tsx:\n${detail}\n\n` +
          "Remove the duplicate <Route path=\"...\"> declaration — React Router " +
          "silently shadows later duplicates with the first match (see Task #988).",
      );
    }

    expect(duplicates.size).toBe(0);
  });

  it("extractRoutePaths picks up every <Route path=\"...\"> literal", () => {
    const sample = `
      <Route path="/foo" element={<X />} />
      <Route
        path="/bar/:id"
        element={<Y />}
      />
      <Route path="nested" element={<Z />} />
    `;
    expect(extractRoutePaths(sample)).toEqual(["/foo", "/bar/:id", "nested"]);
  });

  it("findDuplicateRoutes flags repeated absolute paths across files", () => {
    const dups = findDuplicateRoutes([
      { file: "a.routes.tsx", path: "/admin/control/runs" },
      { file: "a.routes.tsx", path: "/admin/control/runs" },
      { file: "b.routes.tsx", path: "/dashboard/command-center" },
    ]);
    expect(Array.from(dups.keys())).toEqual(["/admin/control/runs"]);
  });
});
