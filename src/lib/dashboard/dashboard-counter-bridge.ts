/**
 * dashboard-counter-bridge — Atomic unit: refresh badge counters from events.
 * Single responsibility: map domain events → counter refresh.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export interface CounterState {
  pendingOrders: number;
  unreadMessages: number;
  activeDeliveries: number;
  walletAlerts: number;
}

type CounterListener = (counters: Partial<CounterState>) => void;
const counterListeners = new Set<CounterListener>();

function notifyCounters(update: Partial<CounterState>) {
  counterListeners.forEach(fn => fn(update));
}

export function subscribeCounters(fn: CounterListener): () => void {
  counterListeners.add(fn);
  return () => counterListeners.delete(fn);
}

export function installCounterBridge(): () => void {
  const unsubs = [
    platformBus.on("storefront:order_placed" as any, () => {
      notifyCounters({ pendingOrders: 1 }); // signal increment
    }),
    platformBus.on(APP_EVENTS.ORBIT_MESSAGE_RECEIVED, () => {
      notifyCounters({ unreadMessages: 1 });
    }),
    platformBus.on("delivery:driver_assigned" as any, () => {
      notifyCounters({ activeDeliveries: 1 });
    }),
    platformBus.on(APP_EVENTS.WALLET_PAYMENT_FAILED, () => {
      notifyCounters({ walletAlerts: 1 });
    }),
  ];
  return () => unsubs.forEach(u => u());
}
