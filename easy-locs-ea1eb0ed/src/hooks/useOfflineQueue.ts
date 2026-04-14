import { useState, useEffect, useRef, useCallback } from "react";

export interface QueuedMutation {
  id: string;
  key: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  status: "pending" | "replaying" | "failed";
}

type MutationExecutor = (mutation: QueuedMutation) => Promise<void>;

const DB_NAME = "offline-queue-db";
const STORE_NAME = "mutations";
const DB_VERSION = 1;

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function persistMutation(mutation: QueuedMutation): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(mutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeMutation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadPersistedMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as QueuedMutation[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

function uid(): string {
  return `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Last-write-wins (LWW) conflict resolution:
 * For each mutation key, only the newest (highest timestamp) pending mutation
 * is kept. Older mutations for the same key are dropped before replay.
 */
function applyLWWDedup(queue: QueuedMutation[]): QueuedMutation[] {
  const latestByKey = new Map<string, QueuedMutation>();
  for (const m of queue) {
    const existing = latestByKey.get(m.key);
    if (!existing || m.timestamp > existing.timestamp) {
      latestByKey.set(m.key, m);
    }
  }
  return Array.from(latestByKey.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export function useOfflineQueue(executor: MutationExecutor) {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const executorRef = useRef(executor);
  executorRef.current = executor;

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    loadPersistedMutations().then(mutations => {
      if (mutations.length > 0) {
        setQueue(mutations.map(m => ({ ...m, status: "pending" as const })));
      }
    });
  }, []);

  const replayQueue = useCallback(async (currentQueue: QueuedMutation[]) => {
    if (syncing || currentQueue.length === 0) return;
    setSyncing(true);

    const pending = currentQueue.filter(m => m.status === "pending");

    // Apply LWW dedup — only keep the latest mutation per key
    const deduped = applyLWWDedup(pending);

    // Drop superseded mutations from queue and IndexedDB
    const dedupedIds = new Set(deduped.map(m => m.id));
    const superseded = pending.filter(m => !dedupedIds.has(m.id));
    for (const m of superseded) {
      await removeMutation(m.id).catch(() => {});
    }
    if (superseded.length > 0) {
      setQueue(q => q.filter(m => dedupedIds.has(m.id) || m.status !== "pending"));
    }

    // Replay in timestamp order (oldest first = LWW ordering)
    for (const mutation of deduped) {
      setQueue(q => q.map(m => m.id === mutation.id ? { ...m, status: "replaying" } : m));
      try {
        await executorRef.current(mutation);
        await removeMutation(mutation.id);
        setQueue(q => q.filter(m => m.id !== mutation.id));
      } catch {
        const updated = { ...mutation, status: "pending" as const, retries: mutation.retries + 1 };
        if (updated.retries >= 3) {
          updated.status = "failed";
        }
        await persistMutation(updated);
        setQueue(q => q.map(m => m.id === mutation.id ? updated : m));
      }
    }

    setSyncing(false);
  }, [syncing]);

  useEffect(() => {
    if (online && queue.some(m => m.status === "pending")) {
      replayQueue(queue);
    }
  }, [online, queue, replayQueue]);

  const enqueue = useCallback(async (key: string, payload: unknown) => {
    if (online) {
      const tempMutation: QueuedMutation = { id: uid(), key, payload, timestamp: Date.now(), retries: 0, status: "pending" };
      try {
        await executorRef.current(tempMutation);
        return;
      } catch {
        // Fall through to queue on failure
      }
    }

    const mutation: QueuedMutation = { id: uid(), key, payload, timestamp: Date.now(), retries: 0, status: "pending" };
    await persistMutation(mutation);
    setQueue(q => [...q, mutation]);
  }, [online]);

  const clearFailed = useCallback(async () => {
    const failed = queue.filter(m => m.status === "failed");
    for (const m of failed) await removeMutation(m.id);
    setQueue(q => q.filter(m => m.status !== "failed"));
  }, [queue]);

  const retryFailed = useCallback(() => {
    setQueue(q => q.map(m => m.status === "failed" ? { ...m, status: "pending", retries: 0 } : m));
  }, []);

  return {
    online,
    queue,
    syncing,
    pendingCount: queue.filter(m => m.status === "pending").length,
    failedCount: queue.filter(m => m.status === "failed").length,
    enqueue,
    clearFailed,
    retryFailed,
  };
}
