/**
 * storefront-cache-invalidator — Atomic: invalidate storefront/marketplace caches.
 * Uses canonical APP_EVENTS.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

let queryClientRef: any = null;

const STOREFRONT_QUERY_KEYS = [
  "storefront-products", "storefront-page", "shop-menu",
  "shop-products", "storefront-categories", "merchant-analytics",
] as const;

export function registerStorefrontQueryClient(qc: any) {
  queryClientRef = qc;
}

export function invalidateStorefrontCaches() {
  if (!queryClientRef) return;
  for (const key of STOREFRONT_QUERY_KEYS) {
    queryClientRef.invalidateQueries({ queryKey: [key] });
  }
}

export function installStorefrontCacheListener(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_PLACED, () => invalidateStorefrontCaches()),
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_COMPLETED, () => invalidateStorefrontCaches()),
    platformBus.on(APP_EVENTS.STOREFRONT_PRODUCT_UPDATED, () => invalidateStorefrontCaches()),
    platformBus.on(APP_EVENTS.STOREFRONT_MENU_UPDATED, () => invalidateStorefrontCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
