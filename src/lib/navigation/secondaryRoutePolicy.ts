const SECONDARY_PATTERNS = [
  "/admin/",
  "/merchant/reviews/",
  "/merchant/holiday-schedule/",
  "/merchant/menu-cloner/",
  "/merchant/featured-items/",
  "/merchant/packaging/",
  "/merchant/order-throttle/",
  "/merchant/chat-settings/",
  "/merchant/cancellation-rules/",
  "/merchant/auto-accept/",
  "/merchant/driver-handoff/",
  "/me/family-profile",
  "/me/favorite-items",
  "/me/lunch-subscription",
  "/me/weekly-meal-plan",
  "/me/kids-meal-profile",
  "/checkout/family-night",
  "/checkout/dinner-planner",
  "/checkout/group-order",
  "/checkout/party-split-links",
  "/checkout/share-cart",
  "/checkout/bulk-party-builder",
];

export function isSecondaryRoute(pathname: string) {
  return SECONDARY_PATTERNS.some((pattern) => pathname.startsWith(pattern));
}
