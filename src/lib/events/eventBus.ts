/**
 * Lightweight typed event bus for decoupling UI reactions from async flows.
 * Sprint 5: Extended with discovery/radar/search/onboarding events.
 */

type EventMap = {
  // ── Original events ──
  QR_DETECTED: { raw: string; timestamp: number };
  PAYMENT_SUCCESS: { orderId?: string; amount?: number };
  PAYMENT_FAILED: { reason?: string };
  RADAR_FILTER_CHANGED: { category?: string; subcategory?: string | null };
  LOCATION_UPDATED: { lat: number; lng: number; accuracy?: number | null };
  WALLET_OPTIMISTIC: { type: "debit" | "credit"; amount: number };
  WALLET_ROLLBACK: { amount: number };

  // ── Sprint 5: Discovery & Radar events ──
  RADAR_SCAN_COMPLETED: { count: number; lat: number; lng: number };
  SEARCH_UPDATED: { query: string; resultCount: number; vertical?: string };
  GEO_LOCATION_CHANGED: { lat: number; lng: number };
  LISTING_DETECTED: { id: string; type: string; source: string };
  ONBOARDING_COMPLETED: { entityId: string; entityType: string; vertical?: string };

  // ── Sprint 5: Home & UI sync events ──
  HOME_SECTIONS_REFRESHED: { sectionCount: number };
  ENTITY_OPENED: { id: string; type: string; source: string };
  CONTACT_INITIATED: { targetUserId: string; source: string; entityId?: string };
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
