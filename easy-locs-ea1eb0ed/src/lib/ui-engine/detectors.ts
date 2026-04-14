/**
 * Visual anomaly detectors — overflow, clipping, overlap, z-index, duplicates.
 * Each returns affected HTMLElements for reporting and patching.
 */
import { isVisible, getText } from "./utils";

/** Find elements whose content overflows vertically and is clipped */
export function findVerticalClipping(root: HTMLElement = document.body): HTMLElement[] {
  const results: HTMLElement[] = [];
  const candidates = root.querySelectorAll("div, section, article, li, td, th, span, p, label, h1, h2, h3, h4");

  for (const el of candidates) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    const style = window.getComputedStyle(el);
    const overflow = style.overflowY;

    // Skip scroll containers — they're intentional
    if (overflow === "auto" || overflow === "scroll") continue;
    if (overflow !== "hidden") continue;

    // Check if content is actually clipped
    if (el.scrollHeight > el.clientHeight + 2) {
      results.push(el);
    }
  }
  return results.slice(0, 50); // Cap for perf
}

/** Find text elements that are visually truncated mid-word/sentence */
export function findTextClipping(root: HTMLElement = document.body): HTMLElement[] {
  const results: HTMLElement[] = [];
  const textEls = root.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, label, a, button, td, th, li, dt, dd");

  for (const el of textEls) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    const text = getText(el);
    if (!text || text.length < 3) continue;

    const style = window.getComputedStyle(el);

    // Skip elements with intentional truncation classes
    if (el.classList.contains("truncate") || el.classList.contains("line-clamp-1") ||
        el.classList.contains("line-clamp-2") || el.classList.contains("line-clamp-3")) continue;

    // Check for unintentional clipping
    if (style.overflow === "hidden" && style.textOverflow !== "ellipsis") {
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
        results.push(el);
      }
    }
  }
  return results.slice(0, 50);
}

/** Find overlapping sibling elements (collision detection) */
export function findElementOverlaps(root: HTMLElement = document.body): Array<{ a: HTMLElement; b: HTMLElement }> {
  const overlaps: Array<{ a: HTMLElement; b: HTMLElement }> = [];
  const containers = root.querySelectorAll("[class*='flex'], [class*='grid'], main, section, article");

  for (const container of containers) {
    const children = Array.from(container.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && isVisible(el));

    // Only check direct children for overlap — skip positioned/absolute
    const flowChildren = children.filter(c => {
      const pos = window.getComputedStyle(c).position;
      return pos === "static" || pos === "relative";
    });

    for (let i = 0; i < flowChildren.length - 1; i++) {
      const a = flowChildren[i];
      const b = flowChildren[i + 1];
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();

      // Check significant overlap (>4px)
      const overlapX = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
      const overlapY = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));

      if (overlapX > 4 && overlapY > 4) {
        overlaps.push({ a, b });
      }
    }
    if (overlaps.length > 30) break;
  }
  return overlaps;
}

/** Find duplicate visible text content (cards, labels rendered twice) */
export function findDuplicateContent(root: HTMLElement = document.body): HTMLElement[] {
  const duplicates: HTMLElement[] = [];
  const cards = root.querySelectorAll("[class*='card'], [class*='Card'], [data-card]");
  const seen = new Map<string, HTMLElement>();

  for (const card of cards) {
    if (!(card instanceof HTMLElement) || !isVisible(card)) continue;
    const text = getText(card).slice(0, 120).toLowerCase().trim();
    if (!text || text.length < 10) continue;

    if (seen.has(text)) {
      duplicates.push(card);
    } else {
      seen.set(text, card);
    }
  }
  return duplicates;
}

/** Find containers that strangle content (too small for children) */
export function findStranglingWrappers(root: HTMLElement = document.body): HTMLElement[] {
  const results: HTMLElement[] = [];
  const containers = root.querySelectorAll("div, section, article");

  for (const el of containers) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 20) continue; // Skip tiny elements

    const style = window.getComputedStyle(el);
    if (style.overflow !== "hidden" && style.overflow !== "clip") continue;

    // Content significantly bigger than container
    const deltaW = el.scrollWidth - el.clientWidth;
    const deltaH = el.scrollHeight - el.clientHeight;

    if (deltaW > 20 || deltaH > 20) {
      // Skip intentional scroll/clip containers
      if (el.classList.contains("scrollbar-none") || el.dataset.clip === "true") continue;
      if (el.closest("[class*='overflow-x-auto']") || el.closest("[class*='overflow-y-auto']")) continue;
      results.push(el);
    }
  }
  return results.slice(0, 30);
}

const HARDCODED_HEX = /^#[0-9a-fA-F]{3,8}$/;
const HARDCODED_RGB = /^rgba?\(/;
const TOKEN_PATTERN = /^(hsl\(var\(|var\(|transparent|inherit|currentColor|initial|unset|none|0|rgba?\(0)/;
const COMPUTED_COLOR_PROPS = ["color", "backgroundColor", "borderColor", "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor"] as const;

/** Find elements using hardcoded color values instead of design tokens */
export function findHardcodedColors(root: HTMLElement = document.body): HTMLElement[] {
  const results: HTMLElement[] = [];

  const inlineAttr = root.querySelectorAll("[style]");
  for (const el of inlineAttr) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    const attr = el.getAttribute("style") ?? "";
    if (HARDCODED_HEX.test(attr.replace(/[^#0-9a-fA-F]/g, "").slice(0, 10))) {
      results.push(el);
      if (results.length >= 40) return results;
      continue;
    }
    for (const prop of COMPUTED_COLOR_PROPS) {
      const val = el.style.getPropertyValue(prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`));
      if (!val) continue;
      if (HARDCODED_HEX.test(val) || (HARDCODED_RGB.test(val) && !TOKEN_PATTERN.test(val))) {
        results.push(el);
        break;
      }
    }
    if (results.length >= 40) break;
  }

  const computedCandidates = root.querySelectorAll("div, section, article, header, footer, nav, button, a, span, p, h1, h2, h3, h4, li");
  for (const el of computedCandidates) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    if (results.includes(el)) continue;
    const cs = window.getComputedStyle(el);
    const bg = cs.backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      if (/^rgb\((?!0, 0, 0)/.test(bg)) {
        const cls = el.className ?? "";
        if (typeof cls === "string" &&
            !cls.includes("bg-") && !cls.includes("background") &&
            !el.getAttribute("style")?.includes("background") &&
            !el.closest("[class*='bg-']")) {
          results.push(el);
          if (results.length >= 40) break;
        }
      }
    }
  }
  return results;
}

/** Find cards/card-like elements missing data-card attribute */
export function findMissingCardAttributes(root: HTMLElement = document.body): HTMLElement[] {
  const results: HTMLElement[] = [];
  const cardCandidates = root.querySelectorAll(
    "[class*='card'], [class*='Card'], [class*='app-card'], [class*='card-medium'], [class*='card-listing']"
  );

  for (const el of cardCandidates) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    if (el.hasAttribute("data-card")) continue;
    if (el.closest("[data-card]")) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 40) continue;
    results.push(el);
    if (results.length >= 30) break;
  }
  return results;
}

/** Find elements with fixed pixel widths that break on small screens */
export function findNonResponsiveWidths(root: HTMLElement = document.body): HTMLElement[] {
  const results: HTMLElement[] = [];
  const candidates = root.querySelectorAll("div, section, article, aside, main");
  const fixedWidthClasses = /\bw-\[(\d+)px\]/;

  for (const el of candidates) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;

    const style = el.getAttribute("style");
    if (style) {
      const widthMatch = style.match(/width\s*:\s*(\d+)px/);
      if (widthMatch) {
        const px = parseInt(widthMatch[1], 10);
        if (px > 360 && !style.includes("max-width")) {
          results.push(el);
          if (results.length >= 20) break;
          continue;
        }
      }
    }

    const cls = el.className;
    if (typeof cls === "string") {
      const clsMatch = cls.match(fixedWidthClasses);
      if (clsMatch) {
        const px = parseInt(clsMatch[1], 10);
        if (px > 360 && !cls.includes("max-w-")) {
          results.push(el);
          if (results.length >= 20) break;
        }
      }
    }
  }
  return results;
}

/** Find inconsistent card heights within the same row */
export function findInconsistentHeights(root: HTMLElement = document.body): HTMLElement[] {
  const results: HTMLElement[] = [];
  const grids = root.querySelectorAll("[class*='grid-cols'], .flex.flex-wrap, .flex.gap");

  for (const grid of grids) {
    const children = Array.from(grid.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && isVisible(el));

    if (children.length < 2) continue;

    const heights = children.map(c => c.getBoundingClientRect().height);
    const maxH = Math.max(...heights);
    const minH = Math.min(...heights);

    // Flag if height variance > 40% of max
    if (maxH > 60 && (maxH - minH) / maxH > 0.4) {
      results.push(...children);
    }
  }
  return results.slice(0, 30);
}
