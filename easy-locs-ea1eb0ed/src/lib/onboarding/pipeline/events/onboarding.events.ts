import { platformBus } from "@/lib/shared/platform-bus";

export function emitShopImported(shop: { id: string; name: string; source: { provider: string } }) {
  platformBus.emit(
    "import:completed",
    { shopId: shop.id, name: shop.name, provider: shop.source.provider, type: "shop" },
    "system"
  );
}
