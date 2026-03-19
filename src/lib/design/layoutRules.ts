/**
 * Layout Normalization Rules — Enforces consistent structure across all pages.
 * Used by DINO audit and by runtime components.
 */

export interface LayoutRule {
  id: string;
  description: string;
  category: "spacing" | "card" | "form" | "image" | "header" | "typography" | "responsive";
  severity: "critical" | "major" | "minor";
  check: string; // CSS selector or logical check description
  expected: string;
}

export const LAYOUT_RULES: LayoutRule[] = [
  // ─── Spacing ───
  { id: "sp-01", description: "Page shell must have consistent horizontal padding", category: "spacing", severity: "major", check: ".page-content, [class*='page-']", expected: "padding-inline: var(--page-gutter)" },
  { id: "sp-02", description: "Cards must not overlap siblings", category: "spacing", severity: "critical", check: "[class*='card']", expected: "no negative margin causing overlap" },
  { id: "sp-03", description: "Grid gap must use spacing scale (8/12/16/24px)", category: "spacing", severity: "major", check: "grid, flex containers", expected: "gap uses standard spacing scale" },

  // ─── Card ───
  { id: "cd-01", description: "All cards must use same border-radius", category: "card", severity: "minor", check: "[class*='card'], .rounded-2xl", expected: "border-radius: var(--card-radius)" },
  { id: "cd-02", description: "Card images must have fixed aspect ratio", category: "card", severity: "major", check: "card img, card [class*='aspect']", expected: "aspect-ratio set or min-height reserved" },
  { id: "cd-03", description: "Card padding must be consistent", category: "card", severity: "minor", check: "[class*='card'] > div", expected: "padding: var(--card-padding)" },

  // ─── Form ───
  { id: "fm-01", description: "All inputs must have same height", category: "form", severity: "major", check: "input, select, textarea", expected: "height: var(--input-height)" },
  { id: "fm-02", description: "Form fields must stack with consistent gap", category: "form", severity: "major", check: "form > *, .form-field", expected: "gap: 12px or 16px" },
  { id: "fm-03", description: "Labels must use consistent font size and weight", category: "form", severity: "minor", check: "label", expected: "font-size: 0.875rem, font-weight: 500" },

  // ─── Image ───
  { id: "im-01", description: "Images must not cause layout shift", category: "image", severity: "critical", check: "img without width/height or aspect-ratio", expected: "explicit dimensions or aspect-ratio set" },
  { id: "im-02", description: "Hero images must have fixed min-height", category: "image", severity: "major", check: ".hero img, banner img", expected: "min-height: 160px or aspect-ratio" },

  // ─── Header ───
  { id: "hd-01", description: "Page header must have fixed height", category: "header", severity: "major", check: "header, .page-header", expected: "min-height reserved from first paint" },

  // ─── Typography ───
  { id: "ty-01", description: "Only one H1 per page", category: "typography", severity: "critical", check: "h1", expected: "count === 1" },
  { id: "ty-02", description: "No raw i18n keys visible", category: "typography", severity: "critical", check: "text content", expected: "no dots-as-separators, no translation keys" },

  // ─── Responsive ───
  { id: "rs-01", description: "No horizontal overflow on mobile", category: "responsive", severity: "critical", check: "body, main", expected: "overflow-x: hidden or contained" },
  { id: "rs-02", description: "Touch targets minimum 44x44px", category: "responsive", severity: "major", check: "button, a, [role='button']", expected: "min size var(--touch-min)" },
];

/**
 * Returns rules filtered by category or severity.
 */
export function getRules(filter?: { category?: string; severity?: string }): LayoutRule[] {
  return LAYOUT_RULES.filter(r => {
    if (filter?.category && r.category !== filter.category) return false;
    if (filter?.severity && r.severity !== filter.severity) return false;
    return true;
  });
}
