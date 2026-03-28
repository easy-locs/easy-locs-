/**
 * cross-domain-propagation-handlers — Atomic: wire orchestration events to
 * cache invalidation, counters, dashboard refresh, and notification emit.
 *
 * This is the MISSING LINK that ensures every domain event propagates to
 * all dependent systems (cache, counters, dashboard, notifications).
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { invalidateOrderCaches } from "@/lib/orders/order-cache-invalidator";
import { invalidateDeliveryCaches } from "@/lib/delivery/delivery-cache-invalidator";
import { invalidateWalletCaches } from "@/lib/wallet/wallet-cache-invalidator";
import { invalidateDashboardCaches } from "@/lib/dashboard/dashboard-cache-invalidator";
import { invalidateOrbitCaches } from "@/lib/orbit/orbit-cache-invalidator";

/**
 * Installs cross-domain propagation handlers.
 * Ensures: order events → wallet + dashboard + delivery caches.
 *          delivery events → order + dashboard caches.
 *          wallet events → dashboard caches.
 *          orbit events → dashboard counters.
 */
export function installCrossDomainPropagationHandlers(): () => void {
  const unsubs: (() => void)[] = [];

  // ── ORDER → WALLET + DASHBOARD + DELIVERY ──
  unsubs.push(
    platformBus.on("ORDER_CREATED", () => {
      invalidateDashboardCaches();
      // Emit counter signal for pending orders badge
      platformBus.emit("dashboard:counters_refresh", {}, "system");
    }),
    platformBus.on("PAYMENT_SUCCESS", () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      platformBus.emit("dashboard:counters_refresh", {}, "system");
    }),
    platformBus.on("ORDER_DELIVERED", () => {
      invalidateWalletCaches(); // merchant payout
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
      platformBus.emit("dashboard:counters_refresh", {}, "system");
    }),
    platformBus.on("ORDER_CONFIRMED", () => {
      invalidateDashboardCaches();
    }),
    platformBus.on("ORDER_READY", () => {
      invalidateDeliveryCaches();
      invalidateDashboardCaches();
    }),
  );

  // ── DELIVERY → ORDER + DASHBOARD ──
  unsubs.push(
    platformBus.on("MISSION_ACCEPTED", () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
      platformBus.emit("dashboard:counters_refresh", {}, "system");
    }),
    platformBus.on("MISSION_COMPLETED", () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
    }),
  );

  // ── REFUND → WALLET + DASHBOARD ──
  unsubs.push(
    platformBus.on("REFUND_REQUESTED", () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      platformBus.emit("dashboard:counters_refresh", {}, "system");
    }),
  );

  // ── WALLET EVENTS → DASHBOARD ──
  unsubs.push(
    platformBus.on("wallet:payment_success" as any, () => {
      invalidateDashboardCaches();
    }),
    platformBus.on("wallet:balance_updated" as any, () => {
      invalidateDashboardCaches();
    }),
  );

  // ── ORBIT EVENTS → DASHBOARD COUNTERS ──
  unsubs.push(
    platformBus.on("orbit:message_received" as any, () => {
      platformBus.emit("dashboard:counters_refresh", {}, "system");
    }),
  );

  // ── STOREFRONT → ORDER + WALLET + DASHBOARD ──
  unsubs.push(
    platformBus.on("storefront:order_placed" as any, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      platformBus.emit("dashboard:counters_refresh", {}, "system");
    }),
    platformBus.on("storefront:order_completed" as any, () => {
      invalidateOrderCaches();
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
  );

  console.log("[cross-domain] Propagation handlers installed");
  return () => unsubs.forEach(u => u());
}
