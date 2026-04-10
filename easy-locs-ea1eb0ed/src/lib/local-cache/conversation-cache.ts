/**
 * Conversation Cache — Local-first read layer using IndexedDB.
 * UI reads from cache first, then syncs with server in background.
 * This ensures instant inbox open even on slow/no network.
 */

const DB_NAME = "orbit-cache";
const DB_VERSION = 2;
const CONVERSATIONS_STORE = "conversations";
const MESSAGES_STORE = "messages";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        db.createObjectStore(CONVERSATIONS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: "id" });
        store.createIndex("by_conversation", "conversationId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Conversations ──

export async function getCachedConversations(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONVERSATIONS_STORE, "readonly");
      const req = tx.objectStore(CONVERSATIONS_STORE).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

export async function cacheConversations(conversations: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(CONVERSATIONS_STORE, "readwrite");
    const store = tx.objectStore(CONVERSATIONS_STORE);
    for (const conv of conversations) {
      store.put(conv);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function cacheConversation(conversation: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(CONVERSATIONS_STORE, "readwrite");
    tx.objectStore(CONVERSATIONS_STORE).put(conversation);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function removeCachedConversation(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(CONVERSATIONS_STORE, "readwrite");
    tx.objectStore(CONVERSATIONS_STORE).delete(id);
  } catch {}
}

// ── Messages ──

export async function getCachedMessages(conversationId: string, limit = 50): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MESSAGES_STORE, "readonly");
      const index = tx.objectStore(MESSAGES_STORE).index("by_conversation");
      const req = index.getAll(conversationId);
      req.onsuccess = () => {
        const msgs = (req.result ?? [])
          .sort((a: any, b: any) => (a.createdAt ?? a.created_at ?? "").localeCompare(b.createdAt ?? b.created_at ?? ""))
          .slice(-limit);
        resolve(msgs);
      };
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

export async function cacheMessages(conversationId: string, messages: any[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, "readwrite");
    const store = tx.objectStore(MESSAGES_STORE);
    for (const msg of messages) {
      store.put({ ...msg, conversationId: conversationId || msg.conversation_id || msg.conversationId });
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function cacheMessage(msg: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, "readwrite");
    tx.objectStore(MESSAGES_STORE).put(msg);
  } catch {}
}

/** Purge old messages to keep cache bounded */
export async function purgeCachedMessages(conversationId: string, keepLast = 200): Promise<void> {
  try {
    const all = await getCachedMessages(conversationId, 10000);
    if (all.length <= keepLast) return;
    const toRemove = all.slice(0, all.length - keepLast);
    const db = await openDB();
    const tx = db.transaction(MESSAGES_STORE, "readwrite");
    const store = tx.objectStore(MESSAGES_STORE);
    for (const msg of toRemove) {
      store.delete(msg.id);
    }
  } catch {}
}

/** Clear all cached data */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], "readwrite");
    tx.objectStore(CONVERSATIONS_STORE).clear();
    tx.objectStore(MESSAGES_STORE).clear();
  } catch {}
}
