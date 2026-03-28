/**
 * onboarding.events — Canonical event emitter for onboarding pipeline.
 */
import { platformBus } from "@/lib/shared/platform-bus";

export function emitShopImported(shop: { id: string; name: string; source: { provider: string } }) {
  platformBus.emit("onboarding.shop.imported" as any, {
    type: "onboarding.shop.imported",
    payload: { shopId: shop.id, name: shop.name, provider: shop.source.provider },
    timestamp: Date.now(),
  });
}
