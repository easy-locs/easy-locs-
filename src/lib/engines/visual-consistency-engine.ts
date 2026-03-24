/**
 * VISUAL CONSISTENCY ENGINE — Harmonizes design tokens across all surfaces.
 * Audits cards, radius, shadows, CTA styles, badges, headers.
 */

export interface ConsistencyIssue {
  type: "radius" | "shadow" | "spacing" | "color" | "cta_style" | "badge_style" | "header" | "section";
  severity: "high" | "medium" | "low";
  description: string;
  page?: string;
  autoFixable: boolean;
  fixed?: boolean;
}

export interface ConsistencyScore {
  cardConsistency: number;   // 0-100
  ctaConsistency: number;
  spacingConsistency: number;
  colorConsistency: number;
  total: number;
}

export interface ConsistencyReport {
  timestamp: string;
  score: ConsistencyScore;
  issues: ConsistencyIssue[];
  fixedCount: number;
}

// ─── Design Token Standards ───
const STANDARD_RADIUS = ["0.75rem", "1rem", "1.25rem", "1.5rem", "1.75rem"]; // xl, 2xl, [28px], 3xl
const STANDARD_SHADOWS = ["none", "0 1px 2px", "0 4px 6px", "0 10px 15px", "0 20px 25px"];

function scanCardConsistency(): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  try {
    const cards = document.querySelectorAll("[class*='bg-card'], [class*='border-border']");
    const radiusValues = new Map<string, number>();

    cards.forEach((card) => {
      const cs = window.getComputedStyle(card);
      const r = cs.borderRadius;
      if (r && r !== "0px") {
        radiusValues.set(r, (radiusValues.get(r) || 0) + 1);
      }
    });

    if (radiusValues.size > 4) {
      issues.push({
        type: "radius", severity: "medium",
        description: `${radiusValues.size} different border-radius values — harmonize to 2-3 standard tokens`,
        autoFixable: false,
      });
    }

    // Check shadow consistency
    const shadowValues = new Set<string>();
    cards.forEach((card) => {
      const cs = window.getComputedStyle(card);
      if (cs.boxShadow && cs.boxShadow !== "none") {
        shadowValues.add(cs.boxShadow.slice(0, 30));
      }
    });
    if (shadowValues.size > 3) {
      issues.push({
        type: "shadow", severity: "low",
        description: `${shadowValues.size} different box-shadow values detected`,
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

function scanCTAConsistency(): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  try {
    const primaryButtons = document.querySelectorAll("button[class*='bg-primary'], a[class*='bg-primary']");
    const sizes = new Set<string>();

    primaryButtons.forEach((btn) => {
      const cs = window.getComputedStyle(btn);
      const key = `${Math.round(parseFloat(cs.paddingTop))}x${Math.round(parseFloat(cs.paddingLeft))}`;
      sizes.add(key);
    });

    if (sizes.size > 3) {
      issues.push({
        type: "cta_style", severity: "medium",
        description: `Primary CTAs have ${sizes.size} different padding sizes — standardize`,
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

function scanSpacingConsistency(): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  try {
    const sections = document.querySelectorAll("section, [class*='space-y-']");
    const gaps = new Set<string>();

    sections.forEach((s) => {
      const cs = window.getComputedStyle(s);
      if (cs.gap && cs.gap !== "normal") gaps.add(cs.gap);
      if (cs.rowGap && cs.rowGap !== "normal") gaps.add(cs.rowGap);
    });

    if (gaps.size > 5) {
      issues.push({
        type: "spacing", severity: "low",
        description: `${gaps.size} different gap values across sections`,
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

function scanBadgeConsistency(): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  try {
    const badges = document.querySelectorAll("[class*='rounded-full'][class*='px-']");
    const styles = new Set<string>();

    badges.forEach((b) => {
      const cs = window.getComputedStyle(b);
      const key = `${cs.fontSize}-${Math.round(parseFloat(cs.paddingLeft))}-${Math.round(parseFloat(cs.paddingTop))}`;
      styles.add(key);
    });

    if (styles.size > 4) {
      issues.push({
        type: "badge_style", severity: "low",
        description: `${styles.size} different badge styles — consider standardizing`,
        autoFixable: false,
      });
    }
  } catch {}
  return issues;
}

// ─── Safe Auto-Fixes ───

function applyConsistencyFixes(issues: ConsistencyIssue[]): number {
  let fixed = 0;
  // Currently only reporting — safe fixes would require very targeted selectors
  return fixed;
}

// ─── Main Runner ───

export function runVisualConsistencyAudit(): ConsistencyReport {
  const allIssues = [
    ...scanCardConsistency(),
    ...scanCTAConsistency(),
    ...scanSpacingConsistency(),
    ...scanBadgeConsistency(),
  ];

  const fixedCount = applyConsistencyFixes(allIssues);

  const cardPenalty = allIssues.filter((i) => i.type === "radius" || i.type === "shadow").length * 10;
  const ctaPenalty = allIssues.filter((i) => i.type === "cta_style").length * 12;
  const spacingPenalty = allIssues.filter((i) => i.type === "spacing").length * 8;
  const colorPenalty = allIssues.filter((i) => i.type === "color" || i.type === "badge_style").length * 6;

  const score: ConsistencyScore = {
    cardConsistency: Math.max(0, 100 - cardPenalty),
    ctaConsistency: Math.max(0, 100 - ctaPenalty),
    spacingConsistency: Math.max(0, 100 - spacingPenalty),
    colorConsistency: Math.max(0, 100 - colorPenalty),
    total: Math.max(0, Math.round(100 - (cardPenalty + ctaPenalty + spacingPenalty + colorPenalty) / 4)),
  };

  return {
    timestamp: new Date().toISOString(),
    score,
    issues: allIssues,
    fixedCount,
  };
}
