/**
 * Orbit Offline Queue — IndexedDB-based message queue for offline-first messaging
 * 
 * When the device is offline, messages are stored locally in IndexedDB.
 * When connectivity returns, queued messages are automatically flushed to the server.
 * Supports: text messages, encrypted payloads, attachments metadata.
 */

const DB_NAME = "orbit-offline";
const DB_VERSION = 1;
const STORE_QUEUE = "message_queue";
const STORE_CACHE = "message_cache";

export interface QueuedMessage {
  id: string;
  threadId: string;
  content: string;
  encrypted: boolean;
  metadata: Record<string, any>;
  createdAt: number;
  retries: number;
  status: "pending" | "sending" | "failed";
}

export interface CachedConversation {
  threadId: string;
  messages: any[];
  updatedAt: number;
}

// ─── IndexedDB Setup (connection pooled) ─────────────────

const MAX_DEAD_RETRIES = 5;

let _dbInstance: IDBDatabase | null = null;
let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbInstance && _dbInstance.objectStoreNames.length > 0) {
    return Promise.resolve(_dbInstance);
  }
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const store = db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
        store.createIndex("by_thread", "threadId", { unique: false });
        store.createIndex("by_status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "threadId" });
      }
    };
    req.onsuccess = () => {
      _dbInstance = req.result;
      _dbInstance.onclose = () => { _dbInstance = null; _dbPromise = null; };
      resolve(req.result);
    };
    req.onerror = () => {
      _dbPromise = null;
      reject(req.error);
    };
  });

  return _dbPromise;
}

// ─── Queue Operations ─────────────────────────────────────

/** Add a message to the offline queue */
export async function enqueueMessage(msg: Omit<QueuedMessage, "retries" | "status">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).put({ ...msg, retries: 0, status: "pending" });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all pending messages, optionally filtered by thread */
export async function getPendingMessages(threadId?: string): Promise<QueuedMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const store = tx.objectStore(STORE_QUEUE);
    const req = threadId
      ? store.index("by_thread").getAll(threadId)
      : store.getAll();
    req.onsuccess = () => {
      const all = (req.result as QueuedMessage[]).filter(m => m.status !== "sending" || Date.now() - m.createdAt > 60000);
      resolve(all.sort((a, b) => a.createdAt - b.createdAt));
    };
    req.onerror = () => reject(req.error);
  });
}

/** Mark a queued message as sending */
export async function markSending(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_QUEUE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, status: "sending" });
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Remove a message from the queue (sent successfully) */
export async function dequeueMessage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Mark a message as failed, increment retry count */
export async function markFailed(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_QUEUE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const msg = getReq.result as QueuedMessage;
        store.put({ ...msg, status: "failed", retries: msg.retries + 1 });
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Get queue size */
export async function getQueueSize(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const req = tx.objectStore(STORE_QUEUE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Conversation Cache ───────────────────────────────────

/** Cache conversation messages for offline reading */
export async function cacheConversation(threadId: string, messages: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, "readwrite");
    tx.objectStore(STORE_CACHE).put({
      threadId,
      messages: messages.slice(-100), // Keep last 100 messages
      updatedAt: Date.now(),
    } satisfies CachedConversation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get cached conversation for offline reading */
export async function getCachedConversation(threadId: string): Promise<CachedConversation | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, "readonly");
    const req = tx.objectStore(STORE_CACHE).get(threadId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/** Clear all cached data */
export async function clearOfflineData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_QUEUE, STORE_CACHE], "readwrite");
    tx.objectStore(STORE_QUEUE).clear();
    tx.objectStore(STORE_CACHE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Purge dead-letter messages that exceeded max retries */
export async function purgeDeadLetters(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_QUEUE);
    const req = store.getAll();
    let purged = 0;
    req.onsuccess = () => {
      const all = req.result as QueuedMessage[];
      for (const msg of all) {
        if (msg.retries >= MAX_DEAD_RETRIES) {
          store.delete(msg.id);
          purged++;
        }
      }
    };
    tx.oncomplete = () => resolve(purged);
    tx.onerror = () => reject(tx.error);
  });
}

/** Prune stale conversation cache entries older than maxAge (ms) */
export async function pruneStaleCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  const db = await openDB();
  const cutoff = Date.now() - maxAgeMs;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, "readwrite");
    const store = tx.objectStore(STORE_CACHE);
    const req = store.getAll();
    let pruned = 0;
    req.onsuccess = () => {
      const all = req.result as CachedConversation[];
      for (const entry of all) {
        if (entry.updatedAt < cutoff) {
          store.delete(entry.threadId);
          pruned++;
        }
      }
    };
    tx.oncomplete = () => resolve(pruned);
    tx.onerror = () => reject(tx.error);
  });
}
