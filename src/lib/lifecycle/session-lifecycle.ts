/**
 * SESSION LIFECYCLE — Global cleanup & recovery hooks.
 *
 * Wires:
 * 1. clearAllSubscriptions() on logout / session reset
 * 2. replayOffline() on connectivity restore
 * 3. drainAllQueues() on logout
 *
 * Import this module ONCE at app root (e.g., App.tsx or AuthContext).
 */
import { clearAllSubscriptions } from "@/lib/realtime/subscription-registry";
import { drainAllQueues, replayOffline, clearOfflineTasks, getOfflineTasks } from "@/lib/queue/action-queue";
import { clearStructuredLogs } from "@/lib/guards/action-guard";

let initialized = false;
let onlineHandler: (() => void) | null = null;

/**
 * Initialize session lifecycle hooks.
 * Call once at app startup.
 */
export function initSessionLifecycle(): void {
  if (initialized) return;
  initialized = true;

  // ── Online recovery: replay queued offline tasks ──
  if (typeof window !== "undefined") {
    onlineHandler = () => {
      const pending = getOfflineTasks();
      if (pending.length === 0) return;

      console.debug(`[SessionLifecycle] Back online — replaying ${pending.length} offline tasks`);

      replayOffline((task) => {
        // For replay, we return null (tasks need their original execute fn).
        // The existing orbit offline-queue handles its own replay via setExecutor.
        // This is a safety net for queue-engine offline tasks.
        console.debug(`[SessionLifecycle] Replay task: ${task.domain}.${task.action} (${task.id})`);
        return null; // Resolver should be wired per-domain
      }).then((result) => {
        if (result.replayed > 0 || result.failed > 0) {
          console.debug(`[SessionLifecycle] Replay complete: ${result.replayed} ok, ${result.failed} failed`);
        }
      });
    };

    window.addEventListener("online", onlineHandler);
  }
}

/**
 * Full session teardown — call on logout or session reset.
 * Clears ALL runtime state: subscriptions, queues, logs.
 */
export function teardownSession(): void {
  // 1. Kill all realtime subscriptions
  clearAllSubscriptions();

  // 2. Drain pending queue tasks (resolve as cancelled)
  drainAllQueues();

  // 3. Clear offline queue (user is logging out — don't replay on next login)
  clearOfflineTasks();

  // 4. Clear structured logs (privacy)
  clearStructuredLogs();

  console.debug("[SessionLifecycle] Session torn down — all subscriptions, queues, and logs cleared");
}

/**
 * Destroy lifecycle hooks (for testing / HMR).
 */
export function destroySessionLifecycle(): void {
  if (onlineHandler && typeof window !== "undefined") {
    window.removeEventListener("online", onlineHandler);
    onlineHandler = null;
  }
  initialized = false;
}
