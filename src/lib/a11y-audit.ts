/**
 * Accessibility Audit Utilities — WCAG 2.1 AA
 * Runtime helpers for contrast checking, keyboard navigation, and ARIA validation.
 */

/* ─── Contrast Ratio (WCAG 2.0 algorithm) ─── */

/** Parse hex (#rgb, #rrggbb) or rgb(r,g,b) to [r,g,b] */
export function parseColor(color: string): [number, number, number] | null {
  // hex
  const hex = color.replace("#", "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  // rgb(r, g, b)
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
  }
  // hsl(h, s%, l%)
  const hslMatch = color.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/);
  if (hslMatch) {
    return hslToRgb(+hslMatch[1], +hslMatch[2], +hslMatch[3]);
  }
  return null;
}

/** Convert HSL to RGB */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/** Relative luminance per WCAG 2.0 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG contrast ratio between two colors */
export function contrastRatio(color1: string, color2: string): number | null {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  if (!c1 || !c2) return null;
  const l1 = relativeLuminance(...c1);
  const l2 = relativeLuminance(...c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check if contrast meets WCAG AA */
export function meetsWCAG_AA(
  color1: string,
  color2: string,
  isLargeText = false
): boolean {
  const ratio = contrastRatio(color1, color2);
  if (ratio === null) return false;
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/** Check if contrast meets WCAG AAA */
export function meetsWCAG_AAA(
  color1: string,
  color2: string,
  isLargeText = false
): boolean {
  const ratio = contrastRatio(color1, color2);
  if (ratio === null) return false;
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

/* ─── Keyboard Navigation ─── */

/** ARIA-standard keyboard keys for interactive patterns */
export const KEYS = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
} as const;

/** Create keyboard handler for common ARIA patterns */
export function createArrowKeyHandler(
  items: HTMLElement[],
  options: {
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
    onSelect?: (el: HTMLElement, index: number) => void;
  } = {}
) {
  const { orientation = "vertical", loop = true, onSelect } = options;

  return (e: KeyboardEvent) => {
    const currentIndex = items.indexOf(e.target as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    const isVertical = orientation === "vertical" || orientation === "both";
    const isHorizontal = orientation === "horizontal" || orientation === "both";

    if (e.key === KEYS.ARROW_DOWN && isVertical) {
      nextIndex = currentIndex + 1;
    } else if (e.key === KEYS.ARROW_UP && isVertical) {
      nextIndex = currentIndex - 1;
    } else if (e.key === KEYS.ARROW_RIGHT && isHorizontal) {
      nextIndex = currentIndex + 1;
    } else if (e.key === KEYS.ARROW_LEFT && isHorizontal) {
      nextIndex = currentIndex - 1;
    } else if (e.key === KEYS.HOME) {
      nextIndex = 0;
    } else if (e.key === KEYS.END) {
      nextIndex = items.length - 1;
    } else if ((e.key === KEYS.ENTER || e.key === KEYS.SPACE) && onSelect) {
      e.preventDefault();
      onSelect(items[currentIndex], currentIndex);
      return;
    } else {
      return;
    }

    e.preventDefault();
    if (loop) {
      nextIndex = ((nextIndex % items.length) + items.length) % items.length;
    } else {
      nextIndex = Math.max(0, Math.min(nextIndex, items.length - 1));
    }
    items[nextIndex]?.focus();
  };
}

/* ─── ARIA Validation ─── */

export interface A11yIssue {
  element: string;
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
}

/** Quick DOM audit — call in dev mode only */
export function auditPage(): A11yIssue[] {
  if (typeof document === "undefined") return [];
  const issues: A11yIssue[] = [];

  // 1. Images without alt
  document.querySelectorAll("img").forEach((img) => {
    if (!img.hasAttribute("alt")) {
      issues.push({
        element: `<img src="${img.src?.slice(0, 60)}">`,
        rule: "img-alt",
        severity: "error",
        message: "Image missing alt attribute",
      });
    }
  });

  // 2. Buttons / links without accessible name
  document.querySelectorAll("button, a[href]").forEach((el) => {
    const name =
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.textContent?.trim();
    if (!name) {
      issues.push({
        element: `<${el.tagName.toLowerCase()}>`,
        rule: "accessible-name",
        severity: "error",
        message: "Interactive element has no accessible name",
      });
    }
  });

  // 3. Form inputs without labels
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    const input = el as HTMLInputElement;
    if (input.type === "hidden") return;
    const hasLabel =
      input.getAttribute("aria-label") ||
      input.getAttribute("aria-labelledby") ||
      input.id && document.querySelector(`label[for="${input.id}"]`) ||
      input.closest("label");
    if (!hasLabel) {
      issues.push({
        element: `<${el.tagName.toLowerCase()} type="${input.type}">`,
        rule: "label",
        severity: "error",
        message: "Form input missing associated label",
      });
    }
  });

  // 4. Check single H1
  const h1s = document.querySelectorAll("h1");
  if (h1s.length === 0) {
    issues.push({
      element: "document",
      rule: "heading-h1",
      severity: "warning",
      message: "Page has no H1 heading",
    });
  } else if (h1s.length > 1) {
    issues.push({
      element: "document",
      rule: "heading-h1",
      severity: "warning",
      message: `Page has ${h1s.length} H1 headings (should be 1)`,
    });
  }

  // 5. Check heading order (no skipping)
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  for (let i = 1; i < headings.length; i++) {
    const prevLevel = parseInt(headings[i - 1].tagName[1]);
    const currLevel = parseInt(headings[i].tagName[1]);
    if (currLevel > prevLevel + 1) {
      issues.push({
        element: `<${headings[i].tagName.toLowerCase()}>`,
        rule: "heading-order",
        severity: "warning",
        message: `Heading skips level: h${prevLevel} → h${currLevel}`,
      });
    }
  }

  // 6. Touch target size (44x44 minimum)
  document.querySelectorAll("button, a[href], [role='button']").forEach((el) => {
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
      issues.push({
        element: `<${el.tagName.toLowerCase()}> (${Math.round(rect.width)}x${Math.round(rect.height)})`,
        rule: "touch-target",
        severity: "warning",
        message: "Touch target smaller than 44x44px",
      });
    }
  });

  // 7. lang attribute
  if (!document.documentElement.getAttribute("lang")) {
    issues.push({
      element: "<html>",
      rule: "html-lang",
      severity: "error",
      message: "HTML element missing lang attribute",
    });
  }

  return issues;
}

/** Count issues by severity */
export function summarizeAudit(issues: A11yIssue[]): {
  errors: number;
  warnings: number;
  info: number;
  score: number;
} {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;
  // Score: 100 minus weighted deductions
  const score = Math.max(0, 100 - errors * 10 - warnings * 3 - info * 1);
  return { errors, warnings, info, score };
}

/* ─── Focus Management ─── */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Get all focusable elements within a container */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/** Restore focus to a specific element (e.g., after modal close) */
export function restoreFocus(element: HTMLElement | null) {
  if (element && typeof element.focus === "function") {
    requestAnimationFrame(() => element.focus());
  }
}

/** Generate a unique ID for ARIA relationships */
let idCounter = 0;
export function generateAriaId(prefix = "a11y"): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}
