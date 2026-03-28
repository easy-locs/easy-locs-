import type { UiEngineReport, PageExpectation } from "./types";
import { runUiRules } from "./rules";
import { computeUiScore } from "./scoring";
import { applySafePatches } from "./safePatches";
import { runTextAudit, autoFixTextFindings } from "./textAudit";

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

  // Run text-specific audit and auto-fix
  const textFindings = runTextAudit();
  const textFixed = autoFixTextFindings(textFindings);

  if (import.meta.env.DEV && textFindings.length > 0) {
    console.log(
      `[TextAudit] ${pathname}: ${textFindings.length} findings, ${textFixed} auto-fixed`,
      textFindings.slice(0, 5).map(f => ({ type: f.type, text: f.text, msg: f.message }))
    );
  }

  const score = computeUiScore(issues);

  return {
    route: pathname,
    pageType: page.pageType,
    generatedAt: new Date().toISOString(),
    issues,
    score,
    patchedCount: patchResults.filter((p) => p.patched).length + textFixed,
  };
}
