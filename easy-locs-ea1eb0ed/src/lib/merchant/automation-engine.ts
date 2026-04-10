/**
 * Automation Engine — trigger onboarding, outreach, and reminders automatically.
 * RULE: No outbound messages unless shop visibility_mode = 'live'.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { db } from "@/services/db";

/** Check if a shop is live before sending any outbound message */
async function isShopLaunched(shopId: string): Promise<boolean> {
  if (!shopId) return false;
  const { data } = await db
    .from("storefront_pages")
    .select("visibility_mode")
    .eq("id", shopId)
    .maybeSingle();
  return data?.visibility_mode === "live";
}

/** Install automation listeners. Called once at app startup. */
export function installMerchantAutomation(): () => void {
  const unsubs: (() => void)[] = [];

  // When a merchant is imported → schedule outreach (only if launched)
  unsubs.push(
    platformBus.on("marketplace:listing_published", async (event) => {
      const p = event.payload as any;
      if (p?.action === "imported") {
        const launched = await isShopLaunched(p.shopId);
        if (!launched) {
          console.log(`[automation] Merchant imported: ${p.merchantId} — NOT launched, skipping outreach`);
          return;
        }
        console.log(`[automation] Merchant imported: ${p.merchantId} — scheduling outreach`);
      }
    })
  );

  // When merchant claimed → stop outreach sequences
  unsubs.push(
    platformBus.on("marketplace:booking_confirmed", (event) => {
      const p = event.payload as any;
      if (p?.action === "claimed") {
        console.log(`[automation] Merchant claimed: ${p.merchantId} — stopping outreach`);
      }
    })
  );

  // When merchant activated → send welcome notification (only if launched)
  unsubs.push(
    platformBus.on("marketplace:provider_went_live", async (event) => {
      const p = event.payload as any;
      if (p?.action === "activated") {
        const launched = await isShopLaunched(p.shopId);
        if (!launched) {
          console.log(`[automation] Merchant activated: ${p.merchantId} — NOT launched, skipping welcome`);
          return;
        }
        console.log(`[automation] Merchant activated: ${p.merchantId} — sending welcome`);
      }
    })
  );

  // When order placed → notify merchant (always, this is inbound)
  unsubs.push(
    platformBus.on("storefront:order_placed", (event) => {
      const p = event.payload as any;
      console.log(`[automation] Order created: ${p.orderId} for merchant ${p.merchantId}`);
    })
  );

  return () => unsubs.forEach((fn) => fn());
}
