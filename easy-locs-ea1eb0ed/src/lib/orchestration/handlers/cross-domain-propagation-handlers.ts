/**
 * cross-domain-propagation-handlers — Wire orchestration events to
 * cache invalidation, counters, dashboard refresh, and notification emit.
 * Uses canonical APP_EVENTS exclusively.
 */
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

  // ── ORDER → WALLET + DASHBOARD + DELIVERY ──
  unsubs.push(
    platformBus.on(APP_EVENTS.ORDER_CREATED as any, () => {
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.PAYMENT_SUCCESS as any, () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.ORDER_COMPLETED as any, () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.ORDER_CONFIRMED as any, () => {
      invalidateDashboardCaches();
    }),
    platformBus.on(APP_EVENTS.ORDER_READY as any, () => {
      invalidateDeliveryCaches();
      invalidateDashboardCaches();
    }),
    platformBus.on(APP_EVENTS.ORDER_CANCELLED as any, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
  );

  // ── DELIVERY → ORDER + DASHBOARD ──
  unsubs.push(
    platformBus.on(APP_EVENTS.MISSION_ACCEPTED as any, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.MISSION_COMPLETED as any, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      invalidateDeliveryCaches();
    }),
    platformBus.on(APP_EVENTS.DELIVERY_COMPLETED as any, () => {
      invalidateOrderCaches();
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
  );

  // ── REFUND → WALLET + DASHBOARD ──
  unsubs.push(
    platformBus.on(APP_EVENTS.REFUND_REQUESTED as any, () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
  );

  // ── WALLET EVENTS → DASHBOARD ──
  unsubs.push(
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS as any, () => {
      invalidateDashboardCaches();
    }),
    platformBus.on(APP_EVENTS.WALLET_BALANCE_UPDATED as any, () => {
      invalidateDashboardCaches();
    }),
  );

  // ── ORBIT EVENTS → DASHBOARD COUNTERS ──
  unsubs.push(
    platformBus.on(APP_EVENTS.ORBIT_MESSAGE_RECEIVED as any, () => {
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
  );

  // ── STOREFRONT → ORDER + WALLET + DASHBOARD ──
  unsubs.push(
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_PLACED as any, () => {
      invalidateOrderCaches();
      invalidateDashboardCaches();
      platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "system");
    }),
    platformBus.on(APP_EVENTS.STOREFRONT_ORDER_COMPLETED as any, () => {
      invalidateOrderCaches();
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
  );

  // ── RENTAL → DASHBOARD ──
  unsubs.push(
    platformBus.on(APP_EVENTS.RENTAL_RENT_CALL_PAID as any, () => {
      invalidateWalletCaches();
      invalidateDashboardCaches();
    }),
    platformBus.on(APP_EVENTS.RENTAL_TENANT_CREATED as any, () => {
      invalidateDashboardCaches();
    }),
  );

  return () => unsubs.forEach(u => u());
}
