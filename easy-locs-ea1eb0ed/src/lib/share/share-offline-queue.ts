const DB_NAME = "share-offline";
const DB_VERSION = 1;
const STORE_NAME = "share_queue";
const MAX_RETRIES = 5;

export interface QueuedShareEvent {
  id: string;
  contentType: string;
  contentSlug: string;
  channel: string;
  userId?: string;
  referralCode?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  retries: number;
  status: "pending" | "sending" | "failed";
}

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_status", "status", { unique: false });
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

export async function enqueueShareEvent(event: Omit<QueuedShareEvent, "retries" | "status">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ...event, retries: 0, status: "pending" });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingShareEvents(): Promise<QueuedShareEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const all = (req.result as QueuedShareEvent[])
        .filter(e => e.status === "pending" || e.status === "failed")
        .filter(e => e.retries < MAX_RETRIES)
        .sort((a, b) => a.createdAt - b.createdAt);
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dequeueShareEvent(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markShareEventFailed(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const event = getReq.result as QueuedShareEvent;
        store.put({ ...event, status: "failed", retries: event.retries + 1 });
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getShareQueueSize(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function flushShareQueue(
  sender: (event: QueuedShareEvent) => Promise<boolean>
): Promise<{ sent: number; failed: number }> {
  const pending = await getPendingShareEvents();
  let sent = 0;
  let failed = 0;

  for (const event of pending) {
    try {
      const ok = await sender(event);
      if (ok) {
        await dequeueShareEvent(event.id);
        sent++;
      } else {
        await markShareEventFailed(event.id);
        failed++;
      }
    } catch {
      await markShareEventFailed(event.id);
      failed++;
    }
  }

  return { sent, failed };
}
