/**
 * Text Audit Engine — Detects and reports all text clipping issues.
 * Runs against live DOM, returns actionable findings per element.
 */
import { isVisible, getText, uiUid } from "./utils";

export interface TextAuditFinding {
  id: string;
  type:
    | "text_truncated_no_ellipsis"
    | "text_clipped_overflow"
    | "text_overflow_hidden_unintentional"
    | "title_too_long_for_card"
    | "label_doesnt_fit"
    | "text_overlap"
    | "fixed_width_strangling"
    | "whitespace_nowrap_dangerous"
    | "rtl_clipping";
  severity: "low" | "medium" | "high" | "critical";
  element: HTMLElement;
  text: string;
  containerWidth: number;
  scrollWidth: number;
  message: string;
  autoFixable: boolean;
}

/** Run a full text audit on the current page */
export function runTextAudit(root: HTMLElement = document.body): TextAuditFinding[] {
  const findings: TextAuditFinding[] = [];

  // 1. Find text clipped by overflow:hidden without ellipsis
  findClippedText(root, findings);

  // 2. Find elements with whitespace:nowrap that overflow
  findNowrapOverflow(root, findings);

  // 3. Find titles too long for their card containers
  findLongTitlesInCards(root, findings);

  // 4. Find labels/buttons/tabs where text doesn't fit
  findLabelsThatDontFit(root, findings);

  // 5. Find fixed-width containers strangling text
  findFixedWidthStrangling(root, findings);

  return findings;
}

function findClippedText(root: HTMLElement, findings: TextAuditFinding[]) {
  const els = root.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, label, a, td, th, li, dd, dt, div");

  for (const el of els) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    const text = getText(el);
    if (!text || text.length < 3) continue;

    // Skip intentional truncation
    if (el.classList.contains("truncate") || el.classList.contains("line-clamp-1") ||
        el.classList.contains("line-clamp-2") || el.classList.contains("line-clamp-3")) continue;

    const style = window.getComputedStyle(el);

    // Check horizontal clip
    if (style.overflow === "hidden" || style.overflowX === "hidden") {
      if (el.scrollWidth > el.clientWidth + 2) {
        // No ellipsis = text just vanishes
        if (style.textOverflow !== "ellipsis") {
          findings.push({
            id: uiUid("txt"),
            type: "text_clipped_overflow",
            severity: "high",
            element: el,
            text: text.slice(0, 60),
            containerWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            message: `Text clipped by overflow:hidden without ellipsis (${el.scrollWidth - el.clientWidth}px hidden)`,
            autoFixable: true,
          });
        }
      }
    }

    // Check vertical clip
    if (style.overflow === "hidden" || style.overflowY === "hidden") {
      if (el.scrollHeight > el.clientHeight + 4) {
        // Skip if it has line-clamp
        if (!style.webkitLineClamp && style.display !== "-webkit-box") {
          findings.push({
            id: uiUid("txt"),
            type: "text_truncated_no_ellipsis",
            severity: "high",
            element: el,
            text: text.slice(0, 60),
            containerWidth: el.clientHeight,
            scrollWidth: el.scrollHeight,
            message: `Text vertically clipped (${el.scrollHeight - el.clientHeight}px hidden)`,
            autoFixable: true,
          });
        }
      }
    }

    if (findings.length > 100) break;
  }
}

function findNowrapOverflow(root: HTMLElement, findings: TextAuditFinding[]) {
  const els = root.querySelectorAll("span, p, label, a, button, [role='tab'], td, th");

  for (const el of els) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    const text = getText(el);
    if (!text || text.length < 3) continue;

    // Skip intentional truncation
    if (el.classList.contains("truncate")) continue;

    const style = window.getComputedStyle(el);
    if (style.whiteSpace === "nowrap" && el.scrollWidth > el.clientWidth + 2) {
      // Badge/chip with px- is intentional
      if (el.classList.contains("rounded-full") && el.className.includes("px-")) continue;

      findings.push({
        id: uiUid("txt"),
        type: "whitespace_nowrap_dangerous",
        severity: "medium",
        element: el,
        text: text.slice(0, 60),
        containerWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        message: `white-space:nowrap causes ${el.scrollWidth - el.clientWidth}px overflow`,
        autoFixable: true,
      });
    }
    if (findings.length > 100) break;
  }
}

function findLongTitlesInCards(root: HTMLElement, findings: TextAuditFinding[]) {
  const cards = root.querySelectorAll(
    "[class*='rounded-2xl'], [class*='rounded-xl'], [data-card], [class*='Card']"
  );

  for (const card of cards) {
    if (!(card instanceof HTMLElement) || !isVisible(card)) continue;
    const cardRect = card.getBoundingClientRect();
    if (cardRect.width < 80) continue;

    const titles = card.querySelectorAll("h1, h2, h3, h4, h5, h6, [class*='font-bold'], [class*='font-semibold']");
    for (const title of titles) {
      if (!(title instanceof HTMLElement) || !isVisible(title)) continue;
      const text = getText(title);
      if (!text || text.length < 15) continue;

      const titleRect = title.getBoundingClientRect();
      // Title overflows card horizontally
      if (titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2) {
        findings.push({
          id: uiUid("txt"),
          type: "title_too_long_for_card",
          severity: "high",
          element: title,
          text: text.slice(0, 60),
          containerWidth: cardRect.width,
          scrollWidth: titleRect.width,
          message: `Title overflows card boundary by ${Math.round(titleRect.right - cardRect.right)}px`,
          autoFixable: true,
        });
      }
    }
    if (findings.length > 100) break;
  }
}

function findLabelsThatDontFit(root: HTMLElement, findings: TextAuditFinding[]) {
  const els = root.querySelectorAll("button, [role='tab'], [role='button'], label, .badge");

  for (const el of els) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    const text = getText(el);
    if (!text || text.length < 2) continue;

    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 4) {
      // Skip if it has explicit truncation
      if (el.classList.contains("truncate") || el.classList.contains("line-clamp-1")) continue;

      findings.push({
        id: uiUid("txt"),
        type: "label_doesnt_fit",
        severity: "medium",
        element: el,
        text: text.slice(0, 60),
        containerWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        message: `Label/button text doesn't fit (overflow: ${el.scrollWidth - el.clientWidth}px H, ${el.scrollHeight - el.clientHeight}px V)`,
        autoFixable: true,
      });
    }
    if (findings.length > 100) break;
  }
}

function findFixedWidthStrangling(root: HTMLElement, findings: TextAuditFinding[]) {
  const els = root.querySelectorAll("[class*='w-['], [class*='max-w-[']");

  for (const el of els) {
    if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
    const text = getText(el);
    if (!text || text.length < 5) continue;

    // Check if fixed width causes text overflow
    if (el.scrollWidth > el.clientWidth + 4) {
      const style = window.getComputedStyle(el);
      // Skip scroll containers
      if (style.overflowX === "auto" || style.overflowX === "scroll") continue;

      findings.push({
        id: uiUid("txt"),
        type: "fixed_width_strangling",
        severity: "medium",
        element: el,
        text: text.slice(0, 60),
        containerWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        message: `Fixed-width container strangles text (${el.scrollWidth - el.clientWidth}px clipped)`,
        autoFixable: false,
      });
    }
    if (findings.length > 100) break;
  }
}

/** Auto-fix findings that are safe to patch */
export function autoFixTextFindings(findings: TextAuditFinding[]): number {
  let fixed = 0;

  for (const f of findings) {
    if (!f.autoFixable) continue;
    const el = f.element;
    if (el.hasAttribute("data-text-audit-fixed")) continue;

    switch (f.type) {
      case "text_clipped_overflow":
      case "text_truncated_no_ellipsis":
        el.style.overflow = "visible";
        el.style.textOverflow = "unset";
        el.setAttribute("data-text-audit-fixed", f.id);
        fixed++;
        break;

      case "whitespace_nowrap_dangerous":
        el.style.whiteSpace = "normal";
        el.style.overflowWrap = "break-word";
        el.setAttribute("data-text-audit-fixed", f.id);
        fixed++;
        break;

      case "title_too_long_for_card":
        el.style.overflowWrap = "break-word";
        el.style.wordBreak = "normal";
        el.style.overflow = "visible";
        el.setAttribute("data-text-audit-fixed", f.id);
        fixed++;
        break;

      case "label_doesnt_fit":
        el.style.whiteSpace = "normal";
        el.style.overflow = "visible";
        el.style.height = "auto";
        el.style.minHeight = el.style.minHeight || "36px";
        el.setAttribute("data-text-audit-fixed", f.id);
        fixed++;
        break;
    }
  }

  return fixed;
}
