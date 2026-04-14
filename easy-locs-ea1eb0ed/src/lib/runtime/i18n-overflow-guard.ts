import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";

export interface I18nOverflowIssue {
  type: "text_overflow" | "button_overflow" | "label_truncation" | "rtl_misalignment" | "missing_translation" | "placeholder_visible" | "font_fallback";
  element?: string;
  text?: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface I18nOverflowReport {
  timestamp: string;
  scanCount: number;
  issues: I18nOverflowIssue[];
  score: number;
  status: "clean" | "warnings" | "degraded";
  totalTextElements: number;
  overflowingElements: number;
}

let lastReport: I18nOverflowReport | null = null;
let scanCount = 0;

function detectTextOverflow(): I18nOverflowIssue[] {
  const issues: I18nOverflowIssue[] = [];
  try {
    const textElements = document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, label, a, button, td, th, li");
    textElements.forEach(el => {
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        const text = el.textContent?.slice(0, 50) || "";
        if (text.length > 3) {
          issues.push({
            type: "text_overflow",
            element: el.tagName.toLowerCase(),
            text,
            detail: `Text overflows container (${el.scrollWidth}px > ${el.clientWidth}px)`,
            severity: "medium",
          });
        }
      }
    });
  } catch {}
  return issues;
}

function detectButtonOverflow(): I18nOverflowIssue[] {
  const issues: I18nOverflowIssue[] = [];
  try {
    document.querySelectorAll("button, [role='button'], a.btn, .button").forEach(el => {
      const text = el.textContent?.trim() || "";
      if (text.length > 30) {
        issues.push({
          type: "button_overflow",
          element: "button",
          text: text.slice(0, 40),
          detail: `Button text too long (${text.length} chars) — may overflow on mobile`,
          severity: "high",
        });
      }
      if (el.scrollWidth > el.clientWidth + 5 && el.clientWidth > 0) {
        issues.push({
          type: "button_overflow",
          element: "button",
          text: text.slice(0, 40),
          detail: `Button content overflows (${el.scrollWidth}px > ${el.clientWidth}px)`,
          severity: "high",
        });
      }
    });
  } catch {}
  return issues;
}

function detectMissingTranslations(): I18nOverflowIssue[] {
  const issues: I18nOverflowIssue[] = [];
  try {
    const textNodes: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim() || "";
      if (text) textNodes.push(text);
    }

    const dotKeyPattern = /^[a-z]+\.[a-z_]+(\.[a-z_]+)*$/;
    const untranslated = textNodes.filter(t => dotKeyPattern.test(t));
    for (const key of untranslated.slice(0, 10)) {
      issues.push({
        type: "missing_translation",
        text: key,
        detail: `Raw i18n key visible in UI: "${key}"`,
        severity: "critical",
      });
    }

    const placeholderPattern = /^\{\{?\s*\w+\s*\}?\}$/;
    const placeholders = textNodes.filter(t => placeholderPattern.test(t));
    for (const ph of placeholders.slice(0, 5)) {
      issues.push({
        type: "placeholder_visible",
        text: ph,
        detail: `Unresolved placeholder visible: "${ph}"`,
        severity: "high",
      });
    }
  } catch {}
  return issues;
}

function detectRtlMisalignment(): I18nOverflowIssue[] {
  const issues: I18nOverflowIssue[] = [];
  try {
    const htmlDir = document.documentElement.dir;
    if (htmlDir === "rtl") {
      const ltrElements: Element[] = [];
      document.querySelectorAll("[style*='text-align: left'], [style*='margin-left'], [style*='padding-left']").forEach(el => {
        ltrElements.push(el);
      });
      if (ltrElements.length > 5) {
        issues.push({
          type: "rtl_misalignment",
          detail: `${ltrElements.length} elements with hardcoded LTR styles in RTL mode`,
          severity: "high",
        });
      }
    }
  } catch {}
  return issues;
}

export function runI18nOverflowScan(): I18nOverflowReport {
  scanCount++;
  const issues: I18nOverflowIssue[] = [
    ...detectTextOverflow(),
    ...detectButtonOverflow(),
    ...detectMissingTranslations(),
    ...detectRtlMisalignment(),
  ];

  let totalTextElements = 0;
  try {
    totalTextElements = document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, label, a, button").length;
  } catch {}

  const overflowingElements = issues.filter(i => i.type === "text_overflow" || i.type === "button_overflow").length;
  const criticals = issues.filter(i => i.severity === "critical").length;
  const highs = issues.filter(i => i.severity === "high").length;
  const score = Math.max(0, 100 - criticals * 30 - highs * 15 - (issues.length - criticals - highs) * 3);

  let status: I18nOverflowReport["status"] = "clean";
  if (criticals > 0) status = "degraded";
  else if (issues.length > 0) status = "warnings";

  const report: I18nOverflowReport = {
    timestamp: new Date().toISOString(),
    scanCount,
    issues,
    score,
    status,
    totalTextElements,
    overflowingElements,
  };

  lastReport = report;

  if (criticals > 0) {
    reportAnomaly("data_quality_issue", "i18n-overflow-guard",
      `${criticals} raw i18n keys visible in UI`, "critical");
  }

  reportHealth("i18n-quality", status === "degraded" ? "degraded" : "ok",
    undefined, issues.length > 0 ? `${issues.length} i18n issues, ${overflowingElements} overflows, score ${score}/100` : undefined);

  return report;
}

export function getLastI18nOverflowReport(): I18nOverflowReport | null {
  return lastReport;
}
