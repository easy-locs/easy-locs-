import type { UiIssue, PageExpectation } from "./types";

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

export function runUiRules(pathname: string): UiIssue[] {
  const page = getPageExpectation(pathname);
  const issues: UiIssue[] = [];

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

  const tinyTargets = findTinyTapTargets();
  if (tinyTargets.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "tiny_tap_targets",
      severity: "medium",
      route: pathname,
      message: `${tinyTargets.length} tap targets are too small.`,
      patchable: true,
      selector: "button, a, [role='button']",
      meta: { count: tinyTargets.length },
    });
  }

  const dotted = findDottedLabels();
  if (dotted.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "dotted_labels",
      severity: "medium",
      route: pathname,
      message: `${dotted.length} dotted labels found.`,
      patchable: true,
      selector: "*",
      meta: { samples: dotted.slice(0, 5).map((el) => getText(el)) },
    });
  }

  const untranslated = findUntranslatedKeys();
  if (untranslated.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "untranslated_keys",
      severity: "medium",
      route: pathname,
      message: `${untranslated.length} untranslated keys found.`,
      patchable: true,
      selector: "*",
      meta: { samples: untranslated.slice(0, 5).map((el) => getText(el)) },
    });
  }

  const duplicateHeadings = findDuplicateHeadings();
  if (duplicateHeadings.length > 0) {
    issues.push({
      id: uiUid("issue"),
      type: "duplicate_heading",
      severity: "low",
      route: pathname,
      message: `${duplicateHeadings.length} duplicate headings found.`,
      patchable: false,
      selector: "h1,h2,h3",
    });
  }

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
        selector: page.emptyStateSelectors.join(", "),
      });
    }
  }

  if (page.primaryCtaSelectors?.length) {
    const hasCta = page.primaryCtaSelectors
      .flatMap((s) => Array.from(document.querySelectorAll(s)))
      .some((el) => isVisible(el));

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

  if (page.pageType === "settings") {
    const settingRows = Array.from(
      document.querySelectorAll("[data-setting-row], .setting-row, [data-settings-card]")
    );
    const hugeCard = settingRows.some((el) => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      return rect.height > 420;
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
