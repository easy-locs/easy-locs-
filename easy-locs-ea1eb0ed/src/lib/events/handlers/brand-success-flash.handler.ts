import { platformBus } from "@/lib/shared/platform-bus";
import type { DynamicLogoProps } from "@/components/brand/EasyLocsLogo";
import type { LogoSection } from "@/hooks/useDynamicLogo";

const EVENT_SECTION_MAP: Record<string, LogoSection> = {
  "wallet:payment_success": "commerce",
  "wallet:payment_completed": "commerce",
  "wallet:transfer_completed": "commerce",
  "booking:confirmed": "hotel",
  "storefront:order_placed": "commerce",
  "commerce:payment_captured": "commerce",
  "qr:payment_completed": "commerce",
  "profile:saved": "default",
  "orbit:message_sent": "orbit",
};

const SUCCESS_EVENTS = Object.keys(EVENT_SECTION_MAP);

function fireBrandFlash(event: string) {
  const section = EVENT_SECTION_MAP[event] ?? "default";
  const ctx: DynamicLogoProps = { microIcon: section };
  import("@/components/brand/BrandSuccessFlash").then((m) => {
    m.triggerBrandFlash(ctx);
  });
}

for (const event of SUCCESS_EVENTS) {
  platformBus.on(event, () => fireBrandFlash(event));
}
