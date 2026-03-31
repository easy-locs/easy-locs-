/**
 * Background Sync Engine — Ensures data syncs even when app is backgrounded.
 * Uses visibility API + periodic sync for catch-up.
 */

import { connectionManager } from "@/lib/network/connection-manager";
import { getPendingMessages, dequeueMessage, markSending, markFailed } from "@/lib/orbit-offline-queue";

type SyncHandler = () => Promise<void>;

class BackgroundSyncEngine {
  private handlers = new Map<string, SyncHandler>();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private syncIntervalMs = 15000; // 15s default

  constructor() {
    if (typeof window === "undefined") return;

    // Sync on visibility change (app comes back to foreground)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        this.triggerSync("visibility");
      }
    });

    // Sync on reconnect
    connectionManager.onReconnect(() => {
      this.triggerSync("reconnect");
    });

    // Periodic sync
    this.startPeriodicSync();
  }

  /** Register a sync handler */
  register(name: string, handler: SyncHandler): () => void {
    this.handlers.set(name, handler);
    return () => this.handlers.delete(name);
  }

  /** Trigger a sync cycle */
  async triggerSync(reason: string = "manual"): Promise<void> {
    if (this.isSyncing || !connectionManager.isOnline()) return;
    this.isSyncing = true;

    try {
      // 1. Flush offline message queue
      await this.flushMessageQueue();

      // 2. Run registered handlers
      const handlers = Array.from(this.handlers.values());
      await Promise.allSettled(handlers.map(h => h()));
    } finally {
      this.isSyncing = false;
    }
  }

  /** Flush persisted offline messages */
  private async flushMessageQueue(): Promise<void> {
    try {
      const pending = await getPendingMessages();
      for (const msg of pending) {
        if (msg.retries >= 5) continue; // Dead letter
        try {
          await markSending(msg.id);
          // Import dynamically to avoid circular deps
          const { insertMessage } = await import("@/repositories/communication.repository");
          await insertMessage({
            conversationId: msg.threadId,
            senderUserId: msg.metadata?.senderUserId ?? "",
            senderOrbitId: msg.metadata?.senderOrbitId ?? null,
            type: msg.metadata?.type ?? "text",
            body: msg.content,
            metadata: { schemaVersion: 1, ...msg.metadata, offlineQueued: true },
          });
          await dequeueMessage(msg.id);
        } catch {
          await markFailed(msg.id);
        }
      }
    } catch {
      // Non-fatal
    }
  }

  private startPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      if (document.visibilityState === "visible" && connectionManager.isOnline()) {
        this.triggerSync("periodic");
      }
    }, this.syncIntervalMs);
  }

  setSyncInterval(ms: number): void {
    this.syncIntervalMs = ms;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.startPeriodicSync();
    }
  }

  destroy(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.handlers.clear();
  }
}

// Singleton
export const backgroundSync = new BackgroundSyncEngine();
