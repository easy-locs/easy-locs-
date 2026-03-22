/**
 * Lightweight typed event bus for decoupling UI reactions from async flows.
 * Complements the existing platformBus — use this for fast local UI events.
 */

type EventMap = {
  QR_DETECTED: { raw: string; timestamp: number };
  PAYMENT_SUCCESS: { orderId?: string; amount?: number };
  PAYMENT_FAILED: { reason?: string };
  RADAR_FILTER_CHANGED: { category?: string; subcategory?: string | null };
  LOCATION_UPDATED: { lat: number; lng: number; accuracy?: number | null };
  WALLET_OPTIMISTIC: { type: "debit" | "credit"; amount: number };
  WALLET_ROLLBACK: { amount: number };
};

type Listener<K extends keyof EventMap> = (payload: EventMap[K]) => void;

const listeners: Partial<Record<keyof EventMap, Listener<any>[]>> = {};

export const eventBus = {
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    (listeners[event] ?? []).forEach((cb) => {
      try {
        cb(payload);
      } catch {
        // never crash on listener error
      }
    });
  },

  on<K extends keyof EventMap>(event: K, cb: Listener<K>): () => void {
    if (!listeners[event]) listeners[event] = [];
    listeners[event]!.push(cb);
    return () => {
      const arr = listeners[event];
      if (arr) {
        const idx = arr.indexOf(cb);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  },

  off<K extends keyof EventMap>(event: K, cb: Listener<K>) {
    const arr = listeners[event];
    if (arr) {
      const idx = arr.indexOf(cb);
      if (idx >= 0) arr.splice(idx, 1);
    }
  },
};
