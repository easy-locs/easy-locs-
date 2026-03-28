/**
 * support-cache-invalidator — Atomic: invalidate support ticket caches.
 * Uses canonical APP_EVENTS.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

let queryClientRef: any = null;

const SUPPORT_QUERY_KEYS = [
  "support-tickets", "ticket-detail", "ticket-messages",
  "support-stats", "open-tickets",
] as const;

export function registerSupportQueryClient(qc: any) {
  queryClientRef = qc;
}

export function invalidateSupportCaches() {
  if (!queryClientRef) return;
  for (const key of SUPPORT_QUERY_KEYS) {
    queryClientRef.invalidateQueries({ queryKey: [key] });
  }
}

export function installSupportCacheListener(): () => void {
  const unsubs = [
    platformBus.on(APP_EVENTS.REFUND_REQUESTED as any, () => invalidateSupportCaches()),
    platformBus.on(APP_EVENTS.SUPPORT_TICKET_CREATED as any, () => invalidateSupportCaches()),
    platformBus.on(APP_EVENTS.SUPPORT_TICKET_REPLIED as any, () => invalidateSupportCaches()),
    platformBus.on(APP_EVENTS.SUPPORT_TICKET_RESOLVED as any, () => invalidateSupportCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
