/**
 * Automation Engine — trigger onboarding, outreach, and reminders automatically.
 */
import { platformBus } from "@/lib/shared/platform-bus";

/** Install automation listeners. Called once at app startup. */
export function installMerchantAutomation(): () => void {
  const unsubs: (() => void)[] = [];

  // When a merchant is imported → schedule outreach
  unsubs.push(
    platformBus.on("marketplace:listing_published", (event) => {
      const p = event.payload as any;
      if (p?.action === "imported") {
        console.log(`[automation] Merchant imported: ${p.merchantId} — scheduling outreach`);
        // In production: trigger outreach campaign creation
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

  // When merchant activated → send welcome notification
  unsubs.push(
    platformBus.on("marketplace:provider_went_live", (event) => {
      const p = event.payload as any;
      if (p?.action === "activated") {
        console.log(`[automation] Merchant activated: ${p.merchantId} — sending welcome`);
      }
    })
  );

  // When order placed → notify merchant
  unsubs.push(
    platformBus.on("storefront:order_placed", (event) => {
      const p = event.payload as any;
      console.log(`[automation] Order created: ${p.orderId} for merchant ${p.merchantId}`);
    })
  );

  return () => unsubs.forEach((fn) => fn());
}
