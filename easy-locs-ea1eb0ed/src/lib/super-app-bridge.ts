import { platformBus } from "@/lib/shared/platform-bus";
import { queryClient } from "@/lib/query-client";
import { installModuleIntelligence } from "@/engines/core/module-intelligence";
import { installNetworkOptimizer } from "@/engines/core/network-optimizer";
import { installSelfPilot } from "@/engines/core/self-pilot";

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
  platformBus.emit("marketplace:order_created", payload, "orders");
  platformBus.emit("dashboard:counters_refresh", {}, "orders");
}

export function emitBookingConfirmed(payload: { bookingId: string; type: string; date: string }) {
  platformBus.emit("marketplace:booking_confirmed", payload, "bookings");
  platformBus.emit("dashboard:counters_refresh", {}, "bookings");
}

export function emitPaymentFailed(payload: { reason: string; amount?: number; currency?: string }) {
  platformBus.emit("wallet:payment_failed" as any, payload, "wallet");
}

let _bridgeInstalled = false;

export function installSuperAppBridge() {
  if (_bridgeInstalled) return;
  _bridgeInstalled = true;

  installModuleIntelligence();
  installNetworkOptimizer();
  installSelfPilot();

  platformBus.on("wallet:transfer_completed", () => {
    queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
    queryClient.invalidateQueries({ queryKey: ["threads"] });
  });

  platformBus.on("wallet:balance_updated", () => {
    queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
  });

  platformBus.on("wallet:payment_failed" as any, () => {
    queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
  });

  platformBus.on("marketplace:booking_confirmed", () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  });

  platformBus.on("orbit:message_received", () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
  });

  platformBus.onPrefix("marketplace:", () => {
    queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-live-stats"] });
  });

  console.info("[super-app-bridge] Cross-section bridge + engines installed");
}
