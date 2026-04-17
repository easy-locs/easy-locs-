/**
 * LB1 Track 2 (#842) — Migration contract test.
 *
 * The full end-to-end behaviour of the dispatch path is exercised by the
 * generic harness in `ai-dispatch.integration.test.ts` (LB1 #836). What
 * THAT test cannot prove is that each migrated edge function actually
 * routes its AI calls through `dispatchAiCompletion` (and not the legacy
 * wrappers). This file adds that callsite-level invariant as a static
 * contract: parse each migrated `index.ts` and assert (a) it imports
 * `dispatchAiCompletion`, (b) it does NOT import `aiRoute` /
 * `aiRouteAndParse`, (c) every AI call goes through the dispatch entry
 * point, (d) it never calls the legacy entry points anywhere in the file
 * body.
 *
 * If a future change reintroduces a direct legacy call, this test fails
 * loudly — the integration harness alone could not catch that because
 * each edge function is a Deno module the harness does not import.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const FUNCTIONS_ROOT = join(
  __dirname,
  "..",
  "..",
  "supabase",
  "functions",
);

const MIGRATED_FUNCTIONS = [
  "goal-planner",
  "ai-rag",
  "ai-eval-runner",
  "ai-content-enrichment",
  "ai-entity-enrichment",
  "chief-agent",
] as const;

function readFn(slug: string): string {
  return readFileSync(join(FUNCTIONS_ROOT, slug, "index.ts"), "utf8");
}

// Strip /* ... */ and // ... line comments so comment mentions of the
// legacy symbols (which are deliberately kept as historical context)
// don't trip the assertions.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

describe("LB1 #842 Track 2 — migrated edge functions route AI through dispatchAiCompletion", () => {
  for (const slug of MIGRATED_FUNCTIONS) {
    describe(slug, () => {
      const raw = readFn(slug);
      const code = stripComments(raw);

      it("imports dispatchAiCompletion from the canonical execution module", () => {
        // Both `import { dispatchAiCompletion } from "..."` and
        // `import { dispatchAiCompletion as X }` shapes are accepted.
        expect(code).toMatch(
          /import\s*\{[^}]*\bdispatchAiCompletion\b[^}]*\}\s*from\s*["'][^"']*\/execution\/ai-dispatch\.ts["']/,
        );
      });

      it("does NOT import the legacy aiRoute / aiRouteAndParse wrappers", () => {
        // Match any import that pulls a symbol called aiRoute(AndParse)?
        // from the legacy ai-router module.
        const legacyImport =
          /import\s*\{[^}]*\baiRoute(AndParse)?\b[^}]*\}\s*from\s*["'][^"']*ai-router(\.ts)?["']/;
        expect(code).not.toMatch(legacyImport);
      });

      it("calls dispatchAiCompletion( at least once in the function body", () => {
        expect(code).toMatch(/\bdispatchAiCompletion\s*\(/);
      });

      it("does NOT invoke aiRoute( or aiRouteAndParse( anywhere", () => {
        expect(code).not.toMatch(/\baiRoute\s*\(/);
        expect(code).not.toMatch(/\baiRouteAndParse\s*\(/);
      });
    });
  }

  it("the migrated set covers every Track 2 target (no silent drops)", () => {
    expect(new Set(MIGRATED_FUNCTIONS).size).toBe(6);
  });
});
