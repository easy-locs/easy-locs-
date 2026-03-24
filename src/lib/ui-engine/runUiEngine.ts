import type { UiEngineReport, PageExpectation } from "./types";
import { runUiRules } from "./rules";
import { computeUiScore } from "./scoring";
import { applySafePatches } from "./safePatches";

function getPageExpectation(pathname: string): PageExpectation {
  const registry: PageExpectation[] = [
    { routePattern: /^\/$|^\/orbit$|^\/home$/, pageType: "marketplace_home" },
    { routePattern: /^\/food|^\/shops|^\/services/, pageType: "category_list" },
    { routePattern: /^\/s\/|^\/menu\//, pageType: "merchant_page" },
    { routePattern: /^\/cart$/, pageType: "cart" },
    { routePattern: /^\/checkout$/, pageType: "checkout" },
    { routePattern: /^\/settings/, pageType: "settings" },
    { routePattern: /^\/wallet/, pageType: "wallet" },
    { routePattern: /^\/orders/, pageType: "orders" },
  ];
  return registry.find((p) => p.routePattern.test(pathname)) ?? { routePattern: /.*/, pageType: "generic" };
}

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
