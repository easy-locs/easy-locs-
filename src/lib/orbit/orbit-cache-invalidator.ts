/**
 * orbit-cache-invalidator — Canonical cache sync for all Orbit mutations.
 * Single responsibility: invalidate TanStack queries + refresh dependent counters.
 */
import { platformBus } from "@/lib/shared/platform-bus";

const ORBIT_QUERY_KEYS = [
  "conversations",
  "orbit-threads",
  "chat-messages",
  "unread-count",
] as const;

let queryClientRef: any = null;

/** Register the global queryClient (called once at app boot). */
export function registerQueryClient(qc: any) {
  queryClientRef = qc;
}

/** Invalidate all Orbit-related caches. */
export function invalidateOrbitCaches(scope?: {
  conversationId?: string;
  threadId?: string;
}) {
  if (!queryClientRef) {
    console.warn("[orbit-cache-invalidator] queryClient not registered");
    return;
  }

  for (const key of ORBIT_QUERY_KEYS) {
    queryClientRef.invalidateQueries({ queryKey: [key] });
  }

  if (scope?.conversationId) {
    queryClientRef.invalidateQueries({ queryKey: ["messages", scope.conversationId] });
  }

  console.log("[orbit-cache-invalidator] caches invalidated", scope ?? "all");
}

/** Auto-wire: listen to Orbit events and invalidate caches. */
export function installOrbitCacheListener(): () => void {
  const unsubs = [
    platformBus.on("orbit:message_sent", (payload: any) => {
      invalidateOrbitCaches({ conversationId: payload?.conversationId });
    }),
    platformBus.on("orbit:attachment_sent", (payload: any) => {
      invalidateOrbitCaches({ conversationId: payload?.conversationId });
    }),
    platformBus.on("call:ended", () => {
      invalidateOrbitCaches();
    }),
  ];

  console.log("[orbit-cache-invalidator] listener installed");
  return () => unsubs.forEach(u => u());
}
