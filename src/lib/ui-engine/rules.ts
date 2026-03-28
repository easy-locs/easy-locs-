import type { UiIssue, PageExpectation } from "./types";
import {
  findBrokenCards,
  findDottedLabels,
  findDuplicateHeadings,
  findEmptySections,
  findTinyTapTargets,
  findUntranslatedKeys,
  getText,
  hasHorizontalOverflow,
  isVisible,
  uiUid,
} from "./utils";
import {
  findVerticalClipping,
  findTextClipping,
  findElementOverlaps,
  findDuplicateContent,
  findStranglingWrappers,
  findInconsistentHeights,
} from "./detectors";

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

export function runUiRules(pathname: string): UiIssue[] {
  const page = getPageExpectation(pathname);
  const issues: UiIssue[] = [];

  // ── Horizontal overflow ──
  if (hasHorizontalOverflow()) {
    issues.push({
      id: uiUid("issue"),
      type: "overflow_x",
      severity: "high",
      route: pathname,
      message: "Horizontal overflow detected on page.",
      patchable: true,
      selector: "body, html",
    });
  }

  // ── Vertical clipping ──
  const clipped = findVerticalClipping();
  if (clipped.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "overflow_y_clip",
      severity: "high",
      route: pathname,
      message: `${clipped.length} elements have clipped vertical overflow.`,
      patchable: true,
      meta: { count: clipped.length },
    });
  }

  // ── Text clipping ──
  const textClips = findTextClipping();
  if (textClips.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "text_clipping",
      severity: "high",
      route: pathname,
      message: `${textClips.length} text elements are visually clipped.`,
      patchable: true,
      meta: { count: textClips.length, samples: textClips.slice(0, 3).map(e => getText(e).slice(0, 40)) },
    });
  }

  // ── Element overlaps ──
  const overlaps = findElementOverlaps();
  if (overlaps.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "element_overlap",
      severity: "critical",
      route: pathname,
      message: `${overlaps.length} element overlap collisions detected.`,
      patchable: true,
      meta: { count: overlaps.length },
    });
  }

  // ── Duplicate content (cards rendered twice) ──
  const dupes = findDuplicateContent();
  if (dupes.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "duplicate_content",
      severity: "medium",
      route: pathname,
      message: `${dupes.length} duplicate card/content blocks detected.`,
      patchable: false,
      meta: { count: dupes.length },
    });
  }

  // ── Strangling wrappers ──
  const strangled = findStranglingWrappers();
  if (strangled.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "wrapper_strangling",
      severity: "high",
      route: pathname,
      message: `${strangled.length} containers are strangling their content.`,
      patchable: true,
      meta: { count: strangled.length },
    });
  }

  // ── Inconsistent heights ──
  const inconsistent = findInconsistentHeights();
  if (inconsistent.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "inconsistent_height",
      severity: "low",
      route: pathname,
      message: `${inconsistent.length} elements have inconsistent heights in rows.`,
      patchable: false,
      meta: { count: inconsistent.length },
    });
  }

  // ── Tiny tap targets ──
  const tinyTargets = findTinyTapTargets();
  if (tinyTargets.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "tiny_tap_targets",
      severity: "medium",
      route: pathname,
      message: `${tinyTargets.length} tap targets are too small.`,
      patchable: true,
      meta: { count: tinyTargets.length },
    });
  }

  // ── Dotted labels ──
  const dotted = findDottedLabels();
  if (dotted.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "dotted_labels",
      severity: "medium",
      route: pathname,
      message: `${dotted.length} dotted labels found.`,
      patchable: true,
      meta: { samples: dotted.slice(0, 5).map(getText) },
    });
  }

  // ── Untranslated keys ──
  const untranslated = findUntranslatedKeys();
  if (untranslated.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "untranslated_keys",
      severity: "medium",
      route: pathname,
      message: `${untranslated.length} untranslated keys found.`,
      patchable: true,
      meta: { samples: untranslated.slice(0, 5).map(getText) },
    });
  }

  // ── Duplicate headings ──
  const duplicateHeadings = findDuplicateHeadings();
  if (duplicateHeadings.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "duplicate_heading",
      severity: "low",
      route: pathname,
      message: `${duplicateHeadings.length} duplicate headings found.`,
      patchable: false,
    });
  }

  // ── Card layout ──
  if (page.cardSelectors?.length) {
    const brokenCards = findBrokenCards(page.cardSelectors);
    if (brokenCards.length > 0) {
      issues.push({
        id: uiUid("issue"),
        type: "broken_card_layout",
        severity: "high",
        route: pathname,
        message: `${brokenCards.length} cards have broken layout.`,
        patchable: true,
        selector: page.cardSelectors.join(", "),
      });
    }
  }

  // ── Empty sections ──
  if (page.emptyStateSelectors?.length) {
    const empties = findEmptySections(page.emptyStateSelectors);
    if (empties.length > 0) {
      issues.push({
        id: uiUid("issue"),
        type: "empty_section",
        severity: "medium",
        route: pathname,
        message: `${empties.length} empty sections found.`,
        patchable: true,
      });
    }
  }

  // ── Missing CTA ──
  if (page.primaryCtaSelectors?.length) {
    const hasCta = page.primaryCtaSelectors
      .flatMap((s) => Array.from(document.querySelectorAll(s)))
      .some(isVisible);

    if (!hasCta) {
      issues.push({
        id: uiUid("issue"),
        type: "missing_primary_cta",
        severity: "critical",
        route: pathname,
        message: "No visible primary CTA detected.",
        patchable: false,
      });
    }
  }

  // ── Settings grouping ──
  if (page.pageType === "settings") {
    const settingRows = Array.from(
      document.querySelectorAll("[data-setting-row], .setting-row, [data-settings-card]")
    );
    const hugeCard = settingRows.some((el) => {
      if (!(el instanceof HTMLElement)) return false;
      return el.getBoundingClientRect().height > 420;
    });
    if (hugeCard) {
      issues.push({
        id: uiUid("issue"),
        type: "broken_settings_grouping",
        severity: "high",
        route: pathname,
        message: "Settings page grouping looks mixed or oversized.",
        patchable: false,
      });
    }
  }

  return issues;
}
