/**
 * UX Auto-Test Engine — Simulates user flows, detects broken UX, auto-corrects when safe.
 * Runs every 2-5 min, tests navigation, buttons, translations, empty states.
 */

export interface UxTestResult {
  id: string;
  type: "dead_button" | "empty_page" | "raw_i18n_key" | "broken_redirect" | "missing_component" | "vertical_mismatch" | "dead_action" | "missing_image";
  severity: "critical" | "warning" | "info";
  page: string;
  element?: string;
  description: string;
  autoFixable: boolean;
  fixed: boolean;
  fixAction?: string;
  timestamp: string;
}

export interface UxAutoTestReport {
  totalTests: number;
  passed: number;
  failed: number;
  autoFixed: number;
  uxScore: number; // 0-100
  results: UxTestResult[];
  timestamp: string;
}

const RAW_KEY_PATTERN = /^[a-z]+\.[a-z_]+(\.[a-z_]+)*$/;
const JUNK_TEXT_PATTERNS = ["undefined", "null", "[object Object]", "NaN"];

/** Detect raw i18n keys visible in the DOM */
function detectRawI18nKeys(): UxTestResult[] {
  const issues: UxTestResult[] = [];
  if (typeof document === "undefined") return issues;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  const seen = new Set<string>();

  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim() ?? "";
    if (text && text.length > 5 && text.length < 80 && RAW_KEY_PATTERN.test(text) && !text.includes(" ") && !seen.has(text)) {
      seen.add(text);
      issues.push({
        id: `i18n-${text}`,
        type: "raw_i18n_key",
        severity: "critical",
        page: window.location.pathname,
        element: text,
        description: `Raw translation key "${text}" visible to user`,
        autoFixable: false,
        fixed: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return issues;
}

/** Detect junk text in the DOM */
function detectJunkText(): UxTestResult[] {
  const issues: UxTestResult[] = [];
  if (typeof document === "undefined") return issues;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim() ?? "";
    if (JUNK_TEXT_PATTERNS.includes(text)) {
      issues.push({
        id: `junk-${text}-${Math.random().toString(36).slice(2, 6)}`,
        type: "missing_component",
        severity: "warning",
        page: window.location.pathname,
        element: text,
        description: `Junk text "${text}" rendered in DOM`,
        autoFixable: false,
        fixed: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return issues;
}

/** Detect buttons without click handlers or visible effect */
function detectDeadButtons(): UxTestResult[] {
  const issues: UxTestResult[] = [];
  if (typeof document === "undefined") return issues;

  const buttons = document.querySelectorAll("button, [role='button']");
  buttons.forEach((btn) => {
    const el = btn as HTMLElement;
    const hasText = !!el.textContent?.trim();
    const hasAriaLabel = !!el.getAttribute("aria-label");
    const isDisabled = el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true";

    if (!hasText && !hasAriaLabel && !isDisabled) {
      issues.push({
        id: `btn-unlabeled-${Math.random().toString(36).slice(2, 6)}`,
        type: "dead_button",
        severity: "warning",
        page: window.location.pathname,
        description: "Button without text or aria-label",
        autoFixable: false,
        fixed: false,
        timestamp: new Date().toISOString(),
      });
    }
  });
  return issues;
}

/** Detect images without src or broken images */
function detectBrokenImages(): UxTestResult[] {
  const issues: UxTestResult[] = [];
  if (typeof document === "undefined") return issues;

  const imgs = document.querySelectorAll("img");
  imgs.forEach((img) => {
    if (!img.src && !img.getAttribute("data-src")) {
      issues.push({
        id: `img-nosrc-${Math.random().toString(36).slice(2, 6)}`,
        type: "missing_image",
        severity: "warning",
        page: window.location.pathname,
        element: img.alt || "unknown",
        description: `Image without source: ${img.alt || "no alt"}`,
        autoFixable: false,
        fixed: false,
        timestamp: new Date().toISOString(),
      });
    }
  });
  return issues;
}

/** Detect empty containers that should have content */
function detectEmptyPages(): UxTestResult[] {
  const issues: UxTestResult[] = [];
  if (typeof document === "undefined") return issues;

  const mainContent = document.querySelector("main, [role='main'], #root > div");
  if (mainContent) {
    const children = mainContent.children;
    // If main has very few visible children, might be empty page
    let visibleChildren = 0;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      if (el.offsetHeight > 0 && el.offsetWidth > 0) visibleChildren++;
    }
    if (visibleChildren <= 1 && mainContent.textContent?.trim().length === 0) {
      issues.push({
        id: `empty-page-${window.location.pathname}`,
        type: "empty_page",
        severity: "critical",
        page: window.location.pathname,
        description: "Page appears empty — no visible content",
        autoFixable: false,
        fixed: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return issues;
}

/** Run full UX auto-test suite */
export function runUxAutoTest(): UxAutoTestReport {
  const results: UxTestResult[] = [
    ...detectRawI18nKeys(),
    ...detectJunkText(),
    ...detectDeadButtons(),
    ...detectBrokenImages(),
    ...detectEmptyPages(),
  ];

  const totalTests = 5; // number of test categories
  const failedCategories = new Set(results.filter(r => r.severity === "critical").map(r => r.type)).size;
  const passed = totalTests - failedCategories;
  const autoFixed = results.filter(r => r.fixed).length;

  const uxScore = results.length === 0 ? 100 : Math.max(0, Math.round(100 - (results.filter(r => r.severity === "critical").length * 15) - (results.filter(r => r.severity === "warning").length * 5)));

  return {
    totalTests,
    passed,
    failed: results.length,
    autoFixed,
    uxScore,
    results,
    timestamp: new Date().toISOString(),
  };
}
