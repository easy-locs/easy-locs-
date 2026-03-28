/**
 * storefront-cache-invalidator — Atomic: invalidate storefront/marketplace caches.
 */
import { platformBus } from "@/lib/shared/platform-bus";

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
    platformBus.on("storefront:order_placed" as any, () => invalidateStorefrontCaches()),
    platformBus.on("storefront:order_completed" as any, () => invalidateStorefrontCaches()),
    platformBus.on("storefront:product_updated" as any, () => invalidateStorefrontCaches()),
    platformBus.on("storefront:menu_updated" as any, () => invalidateStorefrontCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
