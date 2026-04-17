import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROUTER_PATH = "supabase/functions/_shared/ai-router.ts";

// Strip /* ... */ and // ... line comments. Comment mentions of the
// retired symbols (kept intentionally as historical migration notes —
// e.g. "migrated from aiRoute() to dispatchAiCompletion()") must not
// trip these assertions; we only want to catch live code references.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === "dist" || name === "build") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

describe("LB Closeout #845 — aiRoute / aiRouteAndParse exports retired", () => {
  const routerSrc = readFileSync(ROUTER_PATH, "utf8");

  it("ai-router.ts no longer declares an export named aiRoute", () => {
    expect(routerSrc).not.toMatch(/export\s+(async\s+)?function\s+aiRoute\s*\(/);
    expect(routerSrc).not.toMatch(/export\s*\{\s*[^}]*\baiRoute\b[^}]*\}/);
  });

  it("ai-router.ts no longer declares an export named aiRouteAndParse", () => {
    expect(routerSrc).not.toMatch(/export\s+(async\s+)?function\s+aiRouteAndParse\s*\(/);
    expect(routerSrc).not.toMatch(/export\s*\{\s*[^}]*\baiRouteAndParse\b[^}]*\}/);
  });

  it("ai-router.ts no longer imports envDefaultChatConfig (the seed for the retired wrappers)", () => {
    expect(routerSrc).not.toMatch(/^\s*envDefaultChatConfig,?\s*$/m);
  });

  it("ai-router.ts no longer defines normalizeAnthropicResponse (only used by retired aiRouteAndParse)", () => {
    expect(routerSrc).not.toMatch(/function\s+normalizeAnthropicResponse\s*\(/);
  });

  it("no source file imports aiRoute or aiRouteAndParse from _shared/ai-router.ts", () => {
    const roots = ["supabase/functions", "src"];
    const offenders: string[] = [];
    const importRe =
      /import\s*\{[^}]*\b(aiRoute|aiRouteAndParse)\b[^}]*\}\s*from\s*["'][^"']*ai-router(\.ts)?["']/;
    for (const root of roots) {
      try {
        statSync(root);
      } catch {
        continue;
      }
      for (const file of walk(root)) {
        if (file.endsWith("/lb-closeout-845-aiRoute-retired.test.ts")) continue;
        if (file.endsWith("/lb1-track2-migration.contract.test.ts")) continue;
        const src = stripComments(readFileSync(file, "utf8"));
        if (importRe.test(src)) offenders.push(file);
      }
    }
    expect(offenders, `Files still importing the retired wrappers:\n${offenders.join("\n")}`)
      .toEqual([]);
  });

  it("no source file invokes aiRoute( or aiRouteAndParse( as a function (excluding aiRouteForAgent)", () => {
    const roots = ["supabase/functions", "src"];
    const offenders: string[] = [];
    // `\b(aiRoute|aiRouteAndParse)\s*\(` would also match `aiRouteForAgent(`
    // because there's no word boundary between `e` and `F`. The negative
    // lookahead pins the match to the retired symbols only.
    const callRe = /\b(?:aiRoute(?!ForAgent)|aiRouteAndParse)\s*\(/;
    for (const root of roots) {
      try {
        statSync(root);
      } catch {
        continue;
      }
      for (const file of walk(root)) {
        if (file.endsWith("/lb-closeout-845-aiRoute-retired.test.ts")) continue;
        if (file.endsWith("/lb1-track2-migration.contract.test.ts")) continue;
        const src = stripComments(readFileSync(file, "utf8"));
        if (callRe.test(src)) offenders.push(file);
      }
    }
    expect(offenders, `Files still calling the retired wrappers:\n${offenders.join("\n")}`)
      .toEqual([]);
  });
});
