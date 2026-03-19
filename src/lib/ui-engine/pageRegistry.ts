import type { PageExpectation } from "./types";

export const PAGE_REGISTRY: PageExpectation[] = [
  {
    routePattern: /^\/$|^\/orbit$|^\/home$/,
    pageType: "marketplace_home",
    requiredSelectors: ["input[type='search'], [data-search], .search-bar", "[data-marketplace-home], main"],
    primaryCtaSelectors: ["[data-primary-cta]", "button", "a"],
    emptyStateSelectors: ["[data-empty-state]"],
    cardSelectors: ["[data-card='merchant']", "[data-card='listing']", ".merchant-card", ".restaurant-card"],
  },
  {
    routePattern: /^\/food|^\/shops|^\/services|^\/property|^\/travel/,
    pageType: "category_list",
    primaryCtaSelectors: ["[data-primary-cta]", "button", "a"],
    cardSelectors: ["[data-card='merchant']", "[data-card='listing']", ".merchant-card", ".restaurant-card"],
  },
  {
    routePattern: /^\/food\/restaurant\/|^\/store\/|^\/merchant\//,
    pageType: "merchant_page",
    requiredSelectors: ["img, [data-cover-image]", "[data-product-row], [data-product-card], button"],
    primaryCtaSelectors: ["[data-add-to-cart]", "button"],
    cardSelectors: ["[data-product-row]", "[data-product-card]"],
  },
  {
    routePattern: /^\/cart$/,
    pageType: "cart",
    requiredSelectors: ["[data-cart-item], [data-empty-state], main"],
    primaryCtaSelectors: ["[data-checkout-cta], button"],
  },
  {
    routePattern: /^\/checkout$/,
    pageType: "checkout",
    requiredSelectors: ["form, [data-checkout-form], main"],
    primaryCtaSelectors: ["[data-submit-order], button[type='submit'], button"],
  },
  {
    routePattern: /^\/settings(\/.*)?$/,
    pageType: "settings",
    requiredSelectors: ["[data-settings-page], main"],
    cardSelectors: ["[data-setting-row], .setting-row"],
  },
  {
    routePattern: /^\/wallet/,
    pageType: "wallet",
  },
  {
    routePattern: /^\/orders/,
    pageType: "orders",
  },
];

export function getPageExpectation(pathname: string): PageExpectation {
  return (
    PAGE_REGISTRY.find((p) => p.routePattern.test(pathname)) ?? {
      routePattern: /.*/,
      pageType: "generic",
      requiredSelectors: ["main"],
    }
  );
}
