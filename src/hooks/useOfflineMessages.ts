/**
 * useOfflineMessages — Manages offline message queue with auto-sync on reconnection
 */
import { useState, useEffect, useCallback, useRef } from "react";
import * as commRepo from "@/repositories/communication.repository";
import { useNetworkStatus } from "./useNetworkStatus";
import {
  enqueueMessage,
  dequeueMessage,
  getPendingMessages,
  markSending,
  markFailed,
  getQueueSize,
  cacheConversation,
  getCachedConversation,
  type QueuedMessage,
} from "@/lib/orbit-offline-queue";
import { toast } from "sonner";

const MAX_RETRIES = 5;

interface UseOfflineMessagesOptions {
  userId?: string;
  orgId?: string;
  threadId?: string;
}

export function useOfflineMessages({ userId, orgId, threadId }: UseOfflineMessagesOptions) {
  const { isOnline, onReconnect } = useNetworkStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Refresh queue count
  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueSize();
      setQueueCount(count);
    } catch {}
  }, []);

  // Queue a message for offline sending
  const queueMessage = useCallback(async (
    content: string,
    encrypted: boolean,
    metadata: Record<string, any>
  ): Promise<string> => {
    const id = crypto.randomUUID();
    const authUser = await commRepo.getCommAuthUser();
    const authUserId = authUser?.id || userId;

    await enqueueMessage({
      id,
      threadId: threadId || "",
      content,
      encrypted,
      metadata: { ...metadata, userId: authUserId, orgId },
      createdAt: Date.now(),
    });
    await refreshCount();
    return id;
  }, [threadId, userId, orgId, refreshCount]);

  // Flush all pending messages to server
  const flushQueue = useCallback(async () => {
    if (!orgId || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const authUser = await commRepo.getCommAuthUser();
      const authUserId = authUser?.id || userId;

      const pending = await getPendingMessages();
      if (pending.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
        return;
      }

      let sent = 0;
      let failed = 0;

      for (const msg of pending) {
        if (msg.retries >= MAX_RETRIES) {
          await dequeueMessage(msg.id);
          failed++;
          continue;
        }

        await markSending(msg.id);

        try {
          const meta = msg.metadata || {};
          const conversationId = meta.conversationId || meta.threadDbId;
          if (!conversationId) {
            console.warn("[Orbit Offline] No conversationId, skipping:", msg.id);
            await dequeueMessage(msg.id);
            failed++;
            continue;
          }
          await commRepo.insertMessage({
            conversationId,
            senderUserId: meta.userId || authUserId || "",
            senderOrbitId: meta.orbitId || `orbit_${(meta.userId || authUserId || "").slice(0, 12)}`,
            type: "text",
            body: msg.content,
            metadata: msg.encrypted ? { encrypted: true } : undefined,
          });

          await dequeueMessage(msg.id);
          sent++;
        } catch (err) {
          console.error("[Orbit Offline] Failed to send queued message:", err);
          await markFailed(msg.id);
          failed++;
        }
      }

      if (sent > 0) {
        toast.success(`${sent} message${sent > 1 ? "s" : ""} sent from queue`, {
          icon: "📡",
          duration: 3000,
        });
      }
      if (failed > 0) {
        toast.error(`${failed} message${failed > 1 ? "s" : ""} failed to send`);
      }
    } catch (err) {
      console.error("[Orbit Offline] Queue flush failed:", err);
    } finally {
      await refreshCount();
      setIsSyncing(false);
      syncingRef.current = false;
    }
  }, [userId, orgId, refreshCount]);

  // Auto-flush on reconnection
  useEffect(() => {
    const unsub = onReconnect(() => {
      console.log("[Orbit Offline] 📡 Back online — flushing queue...");
      flushQueue();
    });
    return unsub;
  }, [onReconnect, flushQueue]);

  // Cache messages for offline reading
  const cacheMessages = useCallback(async (messages: any[]) => {
    if (!threadId || messages.length === 0) return;
    try {
      await cacheConversation(threadId, messages);
    } catch {}
  }, [threadId]);

  // Get cached messages when offline
  const getCachedMessages = useCallback(async (): Promise<any[]> => {
    if (!threadId) return [];
    try {
      const cached = await getCachedConversation(threadId);
      return cached?.messages || [];
    } catch {
      return [];
    }
  }, [threadId]);

  // Get thread-specific pending messages for UI display
  const getThreadPending = useCallback(async (): Promise<QueuedMessage[]> => {
    if (!threadId) return [];
    return getPendingMessages(threadId);
  }, [threadId]);

  // Initial count
  useEffect(() => { refreshCount(); }, [refreshCount]);

  return {
    isOnline,
    queueCount,
    isSyncing,
    queueMessage,
    flushQueue,
    cacheMessages,
    getCachedMessages,
    getThreadPending,
  };
}
