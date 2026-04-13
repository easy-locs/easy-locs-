import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { invalidateOrderCaches } from "@/lib/orders/order-cache-invalidator";
import { invalidateDeliveryCaches } from "@/lib/delivery/delivery-cache-invalidator";
import { invalidateWalletCaches } from "@/lib/wallet/wallet-cache-invalidator";
import { invalidateDashboardCaches } from "@/lib/dashboard/dashboard-cache-invalidator";
import { invalidateOrbitCaches } from "@/lib/orbit/orbit-cache-invalidator";
import { invalidateRentalCaches } from "@/lib/rental/rental-cache-invalidator";

export function installCrossDomainPropagationHandlers(): () => void {
  const unsubs: (() => void)[] = [];

  unsubs.push(
    platformBus.on(APP_EVENTS.ORDER_CREATED, () => {
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.PAYMENT_SUCCESS, () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.ORDER_COMPLETED, () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.ORDER_CONFIRMED, () => {
      invalidateDashboardCaches();
    }),
    platformBus.on(APP_EVENTS.ORDER_READY, () => {
      invalidateDeliveryCaches();
      invalidateDashboardCaches();
    }),
    platformBus.on(APP_EVENTS.ORDER_CANCELLED, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
  );

  unsubs.push(
    platformBus.on(APP_EVENTS.MISSION_ACCEPTED, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.MISSION_COMPLETED, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
    }),
    platformBus.on(APP_EVENTS.DELIVERY_COMPLETED, () => {
      invalidateOrderCaches();
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
  );

  unsubs.push(
    platformBus.on(APP_EVENTS.REFUND_REQUESTED, () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
  );

  unsubs.push(
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, () => {
      invalidateDashboardCaches();
    }),
    platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED, () => {
      invalidateDashboardCaches();
    }),
  );

  unsubs.push(
    platformBus.on(APP_EVENTS.ORBIT_MESSAGE_RECEIVED, () => {
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
  );

  unsubs.push(
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_PLACED, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_COMPLETED, () => {
      invalidateOrderCaches();
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
  );

  unsubs.push(
    platformBus.on(APP_EVENTS.RENTAL_RENT_CALL_PAID, () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
    platformBus.on(APP_EVENTS.RENTAL_TENANT_CREATED, () => {
      invalidateDashboardCaches();
    }),
  );

  unsubs.push(
    platformBus.on("marketplace:booking_paid", () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on("marketplace:vente_completed", (event) => {
      const p = event.payload as Record<string, unknown>;
      invalidateWalletCaches();
      invalidateDashboardCaches();
      if (p?.commissionAmount && p?.sellerId) {
        platformBus.emit("wallet:commission_split", {
          sellerId: p.sellerId,
          commission: p.commissionAmount,
          currency: p.currency,
          transactionId: p.transactionId,
        }, "wallet");
      }
      if (p?.transactionId) {
        platformBus.emit("wallet:receipt_generated", {
          transactionId: p.transactionId,
          buyerId: p.buyerId,
          sellerId: p.sellerId,
          amount: p.amount,
          currency: p.currency,
        }, "wallet");
      }
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on("marketplace:booking_cancelled", () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on("marketplace:review_submitted", () => {
      invalidateDashboardCaches();
    }),
    platformBus.on("marketplace:stock_updated", () => {
      invalidateDashboardCaches();
    }),
  );

  unsubs.push(
    platformBus.on("marketplace:contact_opened", (event) => {
      const p = event.payload as Record<string, unknown>;
      if (p?.userId && p?.merchantId) {
        (async () => {
          try {
            const { createConversation } = await import("@/repositories/communication.repository");
            const conv = await createConversation({
              type: "marketplace_contact",
              title: `Contact: ${(p.merchantName as string) ?? "Merchant"}`,
              participants: [
                { orbitId: p.userId, role: "buyer" },
                { orbitId: p.merchantId, role: "seller" },
              ],
              createdByOrbitId: p.userId as string,
            });
            platformBus.emit("orbit:thread_created", {
              threadId: conv.id,
              participantIds: [p.userId, p.merchantId],
              context: { type: "marketplace_contact", entityId: p.listingId },
            }, "orbit");
          } catch {
            platformBus.emit("orbit:thread_created", {
              participantIds: [p.userId, p.merchantId],
              context: { type: "marketplace_contact", entityId: p.listingId },
            }, "orbit");
          }
        })();
      }
      invalidateOrbitCaches();
    }),
  );

  unsubs.push(
    platformBus.on("property:published_to_marketplace", (event) => {
      const p = event.payload as Record<string, unknown>;
      platformBus.emit("marketplace:listing_published", {
        listingId: p?.listingId,
        title: p?.title,
        vertical: "property",
        merchantId: p?.ownerId,
      }, "marketplace");
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
  );

  unsubs.push(
    platformBus.on("property:unit_created", () => {
      invalidateRentalCaches();
      invalidateDashboardCaches();
    }),
  );

  unsubs.push(
    platformBus.on("onboarding:completed", () => {
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on("publish:gate_passed", () => {
      invalidateDashboardCaches();
    }),
    platformBus.on("publish:gate_blocked", () => {
      invalidateDashboardCaches();
    }),
  );

  unsubs.push(
    platformBus.on("wallet:top_up", () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
    platformBus.on("wallet:receipt_generated", () => {
      invalidateWalletCaches();
    }),
    platformBus.on("wallet:commission_split", () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
  );

  unsubs.push(
    platformBus.on("orbit:call_started", () => {
      invalidateDashboardCaches();
    }),
    platformBus.on("orbit:call_ended", () => {
      invalidateDashboardCaches();
    }),
    platformBus.on("orbit:session_restored", () => {
      invalidateOrbitCaches();
    }),
    platformBus.on("orbit:presence_changed", () => {
      invalidateOrbitCaches();
    }),
  );

  return () => unsubs.forEach(u => u());
}
