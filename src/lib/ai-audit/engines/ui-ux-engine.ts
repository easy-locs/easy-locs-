import type { AuditIssue } from "../types";

/** Static UI/UX audit — detects layout, spacing, overflow, hierarchy issues */
export function runUIUXAudit(): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();
  let id = 0;
  const uid = () => `uiux-${++id}`;

  // Check for text overflow in visible DOM
  if (typeof document !== "undefined") {
    const allElements = document.querySelectorAll("h1, h2, h3, h4, p, span, a, button, label");
    let overflowCount = 0;
    allElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && el.scrollWidth > rect.width + 2) {
        overflowCount++;
      }
    });
    if (overflowCount > 0) {
      issues.push({
        id: uid(), category: "ui_ux", severity: "medium",
        title: `${overflowCount} text overflow(s) detected`,
        description: `${overflowCount} elements have content overflowing their containers. This causes clipped text and poor readability.`,
        suggestedFix: "Add 'truncate', 'break-words', or 'text-wrap: balance' to affected elements.",
        autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now,
      });
    }

    // Check H1 count
    const h1s = document.querySelectorAll("h1");
    if (h1s.length === 0) {
      issues.push({
        id: uid(), category: "ui_ux", severity: "high",
        title: "Missing H1 heading",
        description: "The current page has no H1 heading, which hurts accessibility and SEO.",
        suggestedFix: "Add a single H1 element to the page for proper heading hierarchy.",
        autoFixable: false, businessImpact: "visibility", status: "open", detectedAt: now,
      });
    } else if (h1s.length > 1) {
      issues.push({
        id: uid(), category: "ui_ux", severity: "medium",
        title: `Multiple H1 headings (${h1s.length})`,
        description: "Multiple H1 tags break heading hierarchy. Each page should have exactly one H1.",
        suggestedFix: "Demote extra H1 elements to H2 or H3.",
        autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
      });
    }

    // Check images without alt text
    const imgs = document.querySelectorAll("img");
    let missingAlts = 0;
    imgs.forEach((img) => { if (!img.alt || img.alt.trim() === "") missingAlts++; });
    if (missingAlts > 0) {
      issues.push({
        id: uid(), category: "ui_ux", severity: "medium",
        title: `${missingAlts} image(s) missing alt text`,
        description: "Images without alt attributes harm accessibility and SEO.",
        suggestedFix: "Add descriptive alt text to all images.",
        autoFixable: true, businessImpact: "visibility", status: "open", detectedAt: now,
      });
    }

    // Check buttons without accessible labels
    const buttons = document.querySelectorAll("button");
    let unlabeled = 0;
    buttons.forEach((btn) => {
      if (!btn.textContent?.trim() && !btn.getAttribute("aria-label")) unlabeled++;
    });
    if (unlabeled > 0) {
      issues.push({
        id: uid(), category: "ui_ux", severity: "medium",
        title: `${unlabeled} button(s) without accessible label`,
        description: "Buttons without text or aria-label are inaccessible to screen readers.",
        suggestedFix: "Add aria-label to icon-only buttons.",
        autoFixable: true, businessImpact: "usability", status: "open", detectedAt: now,
      });
    }

    // Check viewport responsiveness
    if (window.innerWidth < 768) {
      const wideElements = document.querySelectorAll("[style*='width']");
      let fixedWidthCount = 0;
      wideElements.forEach((el) => {
        const style = (el as HTMLElement).style;
        if (style.width && !style.width.includes("%") && !style.width.includes("vw")) {
          fixedWidthCount++;
        }
      });
      if (fixedWidthCount > 3) {
        issues.push({
          id: uid(), category: "ui_ux", severity: "high",
          title: "Fixed-width elements on mobile",
          description: `${fixedWidthCount} elements use fixed pixel widths which may break on small screens.`,
          suggestedFix: "Replace fixed widths with responsive units (%, vw, or Tailwind responsive classes).",
          autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now,
        });
      }
    }

    // Check for consistent spacing
    const cards = document.querySelectorAll("[class*='card']");
    if (cards.length > 3) {
      const gaps = new Set<string>();
      cards.forEach((c) => {
        const computed = getComputedStyle(c);
        gaps.add(computed.padding);
      });
      if (gaps.size > 3) {
        issues.push({
          id: uid(), category: "ui_ux", severity: "low",
          title: "Inconsistent card padding",
          description: `${gaps.size} different padding values found across card components.`,
          suggestedFix: "Standardize padding using design tokens (e.g., p-4 or p-6).",
          autoFixable: false, businessImpact: "usability", status: "open", detectedAt: now,
        });
      }
    }
  }

  return issues;
}
