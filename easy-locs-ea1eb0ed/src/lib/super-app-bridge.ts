import { platformBus, type PlatformEventType } from "@/lib/shared/platform-bus";
import { queryClient } from "@/lib/query-client";
import { installModuleIntelligence } from "@/engines/core/module-intelligence";
import { installNetworkOptimizer } from "@/engines/core/network-optimizer";
import { installSelfPilot } from "@/engines/core/self-pilot";
import { moduleRegistry, installModuleLifecycle } from "@/lib/core/module-registry";

export interface TransferCompletedPayload {
  senderId: string;
  receiverId: string;
  amount: number;
  currency: string;
  description?: string;
  senderName?: string;
  receiverName?: string;
}

export function emitTransferCompleted(payload: TransferCompletedPayload) {
  platformBus.emit("wallet:transfer_completed", payload, "wallet");
  platformBus.emit("wallet:balance_updated", { amount: payload.amount, currency: payload.currency }, "wallet");
  platformBus.emit("dashboard:counters_refresh", {}, "wallet");
}

export function emitOrderCreated(payload: { orderId: string; type: string; total: number; currency: string }) {
  platformBus.emit("storefront:order_placed", payload, "marketplace");
  platformBus.emit("dashboard:counters_refresh", {}, "marketplace");
}

export function emitBookingConfirmed(payload: { bookingId: string; type: string; date: string }) {
  platformBus.emit("marketplace:booking_confirmed", payload, "marketplace");
  platformBus.emit("dashboard:counters_refresh", {}, "marketplace");
}

export function emitPaymentFailed(payload: { reason: string; amount?: number; currency?: string }) {
  platformBus.emit("wallet:payment_failed", payload, "wallet");
}

export function emitMessageSent(payload: { threadId: string; recipientId: string; type?: string }) {
  platformBus.emit("orbit:message_sent", payload, "orbit");
}

export function emitBookingCreated(payload: { bookingId: string; providerId: string; type: string; amount: number; currency: string }) {
  platformBus.emit("marketplace:booking_created", payload, "marketplace");
  platformBus.emit("dashboard:counters_refresh", {}, "marketplace");
}

export function emitDeliveryStatusChanged(payload: { orderId: string; status: string; driverId?: string }) {
  const statusMap: Record<string, PlatformEventType> = {
    dispatched: "delivery:dispatched",
    pickup_arrived: "delivery:pickup_arrived",
    picked_up: "delivery:picked_up",
    in_progress: "delivery:in_progress",
    delivered: "delivery:delivered",
    completed: "delivery:completed",
    failed: "delivery:failed",
    validated: "delivery:validated",
  };
  const eventType = statusMap[payload.status] || "delivery:in_progress";
  platformBus.emit(eventType, payload, "tracking");
  platformBus.emit("dashboard:counters_refresh", {}, "tracking");
}

export function emitPropertyEvent(payload: { unitId?: string; leaseId?: string; action: string }) {
  const actionMap: Record<string, PlatformEventType> = {
    lease_created: "pm:lease_created",
    lease_activated: "pm:lease_activated",
    payment_received: "pm:payment_received",
    receipt_generated: "pm:receipt_generated",
    intervention_created: "pm:intervention_created",
    document_shared: "pm:document_shared",
    unit_created: "property:unit_created",
    rent_call_created: "pm:rent_call_created",
  };
  const eventType = actionMap[payload.action] || "pm:lease_created";
  platformBus.emit(eventType, payload, "pm");
  platformBus.emit("dashboard:counters_refresh", {}, "pm");
}

export function emitModuleEvent(
  type: PlatformEventType,
  payload: Record<string, unknown>,
  source: "wallet" | "orbit" | "marketplace" | "pm" | "system" | "tracking"
) {
  platformBus.emit(type, payload, source);
}

let _bridgeInstalled = false;

export function installSuperAppBridge() {
  if (_bridgeInstalled) return;
  _bridgeInstalled = true;

  installModuleIntelligence();
  installNetworkOptimizer();
  installSelfPilot();
  installModuleLifecycle();

  const invalidate = (...keys: string[]) => {
    for (const key of keys) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  platformBus.on("wallet:transfer_completed", () => {
    invalidate("wallet-balance", "wallet-transactions", "dashboard-live-stats", "threads");
    moduleRegistry.activateModule("wallet-transfers");
  });

  platformBus.on("wallet:balance_updated", () => {
    invalidate("wallet-balance");
  });

  platformBus.on("wallet:payment_completed", () => {
    invalidate("wallet-balance", "wallet-transactions", "dashboard-live-stats");
    moduleRegistry.activateModule("wallet-core");
  });

  platformBus.on("wallet:payment_failed", () => {
    invalidate("wallet-balance", "wallet-transactions");
  });

  platformBus.on("wallet:top_up", () => {
    invalidate("wallet-balance", "wallet-transactions");
  });

  platformBus.on("wallet:transaction_created", () => {
    invalidate("wallet-transactions", "dashboard-live-stats");
  });

  platformBus.on("wallet:payment_requested", () => {
    invalidate("wallet-transactions", "threads");
  });

  platformBus.on("orbit:message_sent", () => {
    invalidate("threads", "dashboard-live-stats");
    moduleRegistry.activateModule("orbit-chat");
  });

  platformBus.on("orbit:message_received", () => {
    invalidate("threads", "dashboard-live-stats", "unread-counts");
  });

  platformBus.on("orbit:thread_created", () => {
    invalidate("threads", "contacts");
  });

  platformBus.on("orbit:call_started", () => {
    invalidate("dashboard-live-stats");
  });

  platformBus.on("marketplace:booking_created", () => {
    invalidate("my-bookings", "dashboard-live-stats");
    moduleRegistry.activateModule("radar-booking");
  });

  platformBus.on("marketplace:booking_confirmed", () => {
    invalidate("my-bookings", "dashboard-live-stats");
  });

  platformBus.on("marketplace:booking_completed", () => {
    invalidate("my-bookings", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  platformBus.on("marketplace:booking_cancelled", () => {
    invalidate("my-bookings", "wallet-balance", "dashboard-live-stats");
  });

  platformBus.on("marketplace:review_submitted", () => {
    invalidate("my-bookings", "storefront-reviews");
  });

  platformBus.onPrefix("storefront:", () => {
    invalidate("my-orders", "dashboard-live-stats");
  });

  platformBus.on("storefront:order_placed", () => {
    invalidate("my-orders", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  platformBus.on("storefront:order_completed", () => {
    invalidate("my-orders", "wallet-balance", "wallet-transactions");
  });

  platformBus.on("storefront:cart_updated", () => {
    invalidate("cart");
  });

  platformBus.onPrefix("commerce:", () => {
    invalidate("wallet-balance", "wallet-transactions");
  });

  platformBus.onPrefix("delivery:", () => {
    invalidate("my-orders", "dashboard-live-stats", "active-delivery");
  });

  platformBus.on("delivery:delivered", () => {
    invalidate("my-orders", "wallet-balance", "dashboard-live-stats");
  });

  platformBus.onPrefix("dispatch:", () => {
    invalidate("active-delivery", "dashboard-live-stats");
  });

  platformBus.onPrefix("pm:", () => {
    invalidate("properties", "leases", "dashboard-live-stats");
  });

  platformBus.on("pm:payment_received", () => {
    invalidate("properties", "leases", "wallet-balance", "wallet-transactions", "dashboard-live-stats");
  });

  platformBus.onPrefix("tracking:", () => {
    invalidate("active-delivery");
  });

  platformBus.on("tracking:completed", () => {
    invalidate("active-delivery", "my-orders", "dashboard-live-stats");
  });

  platformBus.onPrefix("deal:", () => {
    invalidate("deals", "dashboard-live-stats");
  });

  platformBus.on("system:currency_changed", () => {
    invalidate("wallet-balance", "wallet-transactions", "my-orders", "my-bookings", "dashboard-live-stats");
    window.dispatchEvent(new CustomEvent("currency:changed"));
  });

  platformBus.on("radar:entity_selected", () => {
    moduleRegistry.activateModule("radar-core");
  });

  platformBus.on("dashboard:refresh", () => {
    invalidate("dashboard-live-stats", "dashboard-activity");
  });

  console.info("[super-app-bridge] Cross-section bridge + module lifecycle + engines installed");
}
