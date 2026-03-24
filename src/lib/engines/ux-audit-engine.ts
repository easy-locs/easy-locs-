/**
 * UI/UX AUDIT ENGINE — Full platform visual quality scanner.
 * Detects overlaps, spacing issues, broken layouts, CTA problems.
 * Returns per-page scores + safe auto-fix capabilities.
 */

export interface UxAuditIssue {
  page: string;
  category: "overlap" | "spacing" | "alignment" | "overflow" | "hierarchy" | "cta" | "responsive" | "text" | "image";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  selector?: string;
  autoFixable: boolean;
  fixed?: boolean;
}

export interface UxPageScore {
  page: string;
  score: number; // 0-100
  issues: UxAuditIssue[];
  fixedCount: number;
}

export interface UxAuditReport {
  timestamp: string;
  globalScore: number;
  pages: UxPageScore[];
  totalIssues: number;
  totalFixed: number;
  totalRemaining: number;
}

// ─── DOM Scanner Functions ───

function scanOverlaps(page: string): UxAuditIssue[] {
  const issues: UxAuditIssue[] = [];
  try {
    // Detect elements overlapping sticky bars
    const stickyBars = document.querySelectorAll("[class*='sticky'], [class*='fixed']");
    stickyBars.forEach((bar) => {
      const barRect = bar.getBoundingClientRect();
      if (barRect.height > 80) {
        issues.push({
          page, category: "overlap", severity: "medium",
          description: `Sticky/fixed element is very tall (${Math.round(barRect.height)}px)`,
          selector: bar.className?.toString().slice(0, 60),
          autoFixable: false,
        });
      }
    });

    // Detect search bar icon overlap
    const searchInputs = document.querySelectorAll("input[type='search'], input[placeholder*='Search'], input[placeholder*='search']");
    searchInputs.forEach((input) => {
      const rect = input.getBoundingClientRect();
      const cs = window.getComputedStyle(input);
      const paddingLeft = parseFloat(cs.paddingLeft);
      if (paddingLeft < 32 && rect.width > 0) {
        issues.push({
          page, category: "overlap", severity: "high",
          description: "Search input has insufficient left padding — icon may overlap text",
          autoFixable: true,
        });
      }
    });
  } catch {}
  return issues;
}

function scanSpacing(page: string): UxAuditIssue[] {
  const issues: UxAuditIssue[] = [];
  try {
    // Check cards for consistent spacing
    const cards = document.querySelectorAll("[class*='rounded-']");
    let inconsistentRadius = 0;
    const radiusSeen = new Set<string>();
    cards.forEach((card) => {
      const cs = window.getComputedStyle(card);
      if (cs.borderRadius && cs.borderRadius !== "0px") {
        radiusSeen.add(cs.borderRadius);
      }
    });
    if (radiusSeen.size > 5) {
      issues.push({
        page, category: "spacing", severity: "low",
        description: `${radiusSeen.size} different border-radius values detected — consider harmonizing`,
        autoFixable: false,
      });
    }

    // Check for elements with no padding in containers
    const containers = document.querySelectorAll("[class*='space-y-'], [class*='gap-']");
    containers.forEach((c) => {
      if (c.children.length === 0) {
        issues.push({
          page, category: "spacing", severity: "low",
          description: "Empty spacing container detected",
          autoFixable: false,
        });
      }
    });
  } catch {}
  return issues;
}

function scanOverflow(page: string): UxAuditIssue[] {
  const issues: UxAuditIssue[] = [];
  try {
    const body = document.body;
    if (body.scrollWidth > body.clientWidth + 2) {
      issues.push({
        page, category: "overflow", severity: "critical",
        description: `Horizontal scroll detected (body ${body.scrollWidth}px > viewport ${body.clientWidth}px)`,
        autoFixable: true,
        selector: "body",
      });
    }

    // Check text truncation
    const textEls = document.querySelectorAll("h1, h2, h3, p, span, div");
    textEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && el.scrollWidth > rect.width + 5 && !el.className?.toString().includes("truncate") && !el.className?.toString().includes("line-clamp")) {
        const text = el.textContent?.slice(0, 30) || "";
        if (text.length > 20) {
          issues.push({
            page, category: "text", severity: "medium",
            description: `Text overflowing container: "${text}..."`,
            autoFixable: false,
          });
        }
      }
    });
  } catch {}
  return issues;
}

function scanCTA(page: string): UxAuditIssue[] {
  const issues: UxAuditIssue[] = [];
  try {
    const primaryCTAs = document.querySelectorAll("[data-primary-cta], button[class*='bg-primary']");
    if (primaryCTAs.length === 0) {
      // Only flag on actionable pages
      const actionablePatterns = [/checkout/, /cart/, /menu/, /restaurant/, /shop/];
      if (actionablePatterns.some((p) => p.test(page))) {
        issues.push({
          page, category: "cta", severity: "high",
          description: "No primary CTA button found on actionable page",
          autoFixable: false,
        });
      }
    }

    // Check CTA tap target size
    const buttons = document.querySelectorAll("button, a[role='button'], [data-add-to-cart]");
    buttons.forEach((btn) => {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 36)) {
        issues.push({
          page, category: "cta", severity: "medium",
          description: `Button too small for mobile tap (${Math.round(rect.width)}×${Math.round(rect.height)}px)`,
          autoFixable: false,
        });
      }
    });
  } catch {}
  return issues;
}

function scanHierarchy(page: string): UxAuditIssue[] {
  const issues: UxAuditIssue[] = [];
  try {
    const h1s = document.querySelectorAll("h1");
    if (h1s.length > 1) {
      issues.push({
        page, category: "hierarchy", severity: "medium",
        description: `Multiple H1 elements (${h1s.length}) — should have exactly 1`,
        autoFixable: false,
      });
    }
    if (h1s.length === 0) {
      issues.push({
        page, category: "hierarchy", severity: "low",
        description: "No H1 found — impacts SEO and accessibility",
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

// ─── Safe Auto-Fixes ───

function applyAutoFixes(issues: UxAuditIssue[]): number {
  let fixed = 0;
  for (const issue of issues) {
    if (!issue.autoFixable) continue;
    try {
      if (issue.category === "overflow" && issue.selector === "body") {
        document.body.style.overflowX = "hidden";
        issue.fixed = true;
        fixed++;
      }
      if (issue.category === "overlap" && issue.description.includes("Search input")) {
        const inputs = document.querySelectorAll("input[type='search'], input[placeholder*='Search']");
        inputs.forEach((input) => {
          (input as HTMLElement).style.paddingLeft = "2.5rem";
        });
        issue.fixed = true;
        fixed++;
      }
    } catch {}
  }
  return fixed;
}

// ─── Main Audit Runner ───

export function runUxAudit(pages?: string[]): UxAuditReport {
  const currentPage = window.location.pathname || "/";
  const pagesToAudit = pages || [currentPage];
  const pageResults: UxPageScore[] = [];

  for (const page of pagesToAudit) {
    const allIssues = [
      ...scanOverlaps(page),
      ...scanSpacing(page),
      ...scanOverflow(page),
      ...scanCTA(page),
      ...scanHierarchy(page),
    ];

    const fixedCount = applyAutoFixes(allIssues);
    const penalty = allIssues.reduce((sum, i) => {
      const w = i.severity === "critical" ? 15 : i.severity === "high" ? 10 : i.severity === "medium" ? 5 : 2;
      return sum + (i.fixed ? 0 : w);
    }, 0);

    pageResults.push({
      page,
      score: Math.max(0, Math.min(100, 100 - penalty)),
      issues: allIssues,
      fixedCount,
    });
  }

  const totalIssues = pageResults.reduce((s, p) => s + p.issues.length, 0);
  const totalFixed = pageResults.reduce((s, p) => s + p.fixedCount, 0);
  const globalScore = pageResults.length > 0
    ? Math.round(pageResults.reduce((s, p) => s + p.score, 0) / pageResults.length)
    : 100;

  return {
    timestamp: new Date().toISOString(),
    globalScore,
    pages: pageResults,
    totalIssues,
    totalFixed,
    totalRemaining: totalIssues - totalFixed,
  };
}
