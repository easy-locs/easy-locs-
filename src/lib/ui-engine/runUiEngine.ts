import type { UiEngineReport } from "./types";
import { getPageExpectation } from "./pageRegistry";
import { runUiRules } from "./rules";
import { computeUiScore } from "./scoring";
import { applySafePatches } from "./safePatches";

export function runUiEngine(pathname = window.location.pathname): UiEngineReport {
  const page = getPageExpectation(pathname);
  const issues = runUiRules(pathname);
  const patchResults = applySafePatches(issues.filter((i) => i.patchable));
  const score = computeUiScore(issues);

  return {
    route: pathname,
    pageType: page.pageType,
    generatedAt: new Date().toISOString(),
    issues,
    score,
    patchedCount: patchResults.filter((p) => p.patched).length,
  };
}
