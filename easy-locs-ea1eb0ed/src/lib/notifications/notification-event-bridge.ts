/**
 * notification-event-bridge — Atomic unit: wire platform events to notification creation.
 * Single responsibility: auto-create notifications from domain events.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { reportHealth } from "@/lib/runtime/health-aggregator";

let notificationCallback: ((n: { title: string; body: string; scope: string; severity: string }) => void) | null = null;

export function registerNotificationHandler(fn: typeof notificationCallback) {
  notificationCallback = fn;
}

function notify(title: string, body: string, scope: string, severity = "info") {
  notificationCallback?.({ title, body, scope, severity });
}

export function installNotificationEventBridge(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_SUCCESS, (e: any) => {
      notify("Payment successful", `${e.payload?.amount ?? ""} ${e.payload?.currency ?? ""}`.trim(), "wallet", "success");
      reportHealth("notifications", "ok");
    }),
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_FAILED, (e: any) => {
      notify("Payment failed", e.payload?.error ?? "Transaction failed", "wallet", "error");
    }),
    platformBus.on(APP_EVENTS.ORBIT_MESSAGE_RECEIVED, () => {
      reportHealth("notifications", "ok");
    }),
    platformBus.on("delivery:completed" as any, (e: any) => {
      notify("Delivery completed", `Order delivered successfully`, "delivery", "success");
    }),
    platformBus.on("storefront:order_placed" as any, (e: any) => {
      notify("New order", "You have a new order", "orders", "info");
    }),
  ];
  return () => unsubs.forEach(u => u());
}
