/**
 * support-cache-invalidator — Atomic: invalidate support ticket caches.
 */
import { platformBus } from "@/lib/shared/platform-bus";

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
    platformBus.on("REFUND_REQUESTED", () => invalidateSupportCaches()),
    platformBus.on("ISSUE_CREATED", () => invalidateSupportCaches()),
  ];
  return () => unsubs.forEach(u => u());
}
