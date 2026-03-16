/**
 * PWA Advanced Engine — PASS55 Block AO
 * 
 * 1. Push notification subscription management
 * 2. IndexedDB offline queue with background flush
 * 3. Precache management & cleanup
 * 4. App badge API
 * 5. Share Target API helpers
 */

/* ═══════════════════════════════════════════════════
   1. PUSH NOTIFICATION SUBSCRIPTION
   ═══════════════════════════════════════════════════ */

export interface PushSubscriptionResult {
  subscribed: boolean;
  subscription?: PushSubscription;
  error?: string;
}

/**
 * Subscribe to push notifications via the Push API.
 * Requires a VAPID public key and an active service worker.
 * 
 * @param vapidPublicKey - Base64-encoded VAPID public key
 * @returns Subscription result with the PushSubscription object
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionResult> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { subscribed: false, error: "Push notifications not supported" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { subscribed: false, error: `Permission ${permission}` };
    }

    const reg = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      return { subscribed: true, subscription: existing };
    }

    // Convert VAPID key
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    return { subscribed: true, subscription };
  } catch (err) {
    return { subscribed: false, error: (err as Error).message };
  }
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
      return await sub.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}

/** Get current push subscription (if any) */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    return await reg?.pushManager?.getSubscription() ?? null;
  } catch {
    return null;
  }
}

/** Check push notification permission status */
export function getPushPermissionStatus(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** Convert base64-encoded VAPID key to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/* ═══════════════════════════════════════════════════
   2. INDEXEDDB OFFLINE QUEUE
   ═══════════════════════════════════════════════════ */

const DB_NAME = "el-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "pending-actions";

export interface OfflineAction {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

/** Open the IndexedDB for offline queue */
function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Enqueue an action for offline processing */
export async function enqueueOfflineAction(
  type: string,
  payload: unknown,
  maxRetries = 3
): Promise<string> {
  const db = await openQueueDB();
  const id = crypto.randomUUID();
  const action: OfflineAction = {
    id,
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(action);
    tx.oncomplete = () => { db.close(); resolve(id); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Get all pending offline actions (ordered by creation time) */
export async function getPendingActions(): Promise<OfflineAction[]> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).index("createdAt").getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Remove a completed action from the queue */
export async function dequeueAction(id: string): Promise<void> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Increment retry count for a failed action */
export async function markRetry(id: string): Promise<void> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const action = getReq.result as OfflineAction | undefined;
      if (action) {
        action.retryCount++;
        store.put(action);
      }
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Get count of pending actions */
export async function getPendingCount(): Promise<number> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Clear all pending actions (e.g., on logout) */
export async function clearOfflineQueue(): Promise<void> {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Flush offline queue — process all pending actions using a handler.
 * Returns count of successfully processed actions.
 * 
 * @param handler - Async function to process each action. Return true on success.
 */
export async function flushOfflineQueue(
  handler: (action: OfflineAction) => Promise<boolean>
): Promise<{ processed: number; failed: number; remaining: number }> {
  const actions = await getPendingActions();
  let processed = 0;
  let failed = 0;

  for (const action of actions) {
    // Skip actions that exceeded max retries
    if (action.retryCount >= action.maxRetries) {
      await dequeueAction(action.id); // Remove permanently failed
      failed++;
      continue;
    }

    try {
      const success = await handler(action);
      if (success) {
        await dequeueAction(action.id);
        processed++;
      } else {
        await markRetry(action.id);
        failed++;
      }
    } catch {
      await markRetry(action.id);
      failed++;
    }
  }

  const remaining = await getPendingCount();
  return { processed, failed, remaining };
}

/* ═══════════════════════════════════════════════════
   3. APP BADGE API
   ═══════════════════════════════════════════════════ */

/** Set the app badge count (mobile PWA) */
export async function setAppBadge(count: number): Promise<boolean> {
  try {
    if ("setAppBadge" in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
      return true;
    }
  } catch {
    // Not supported
  }
  return false;
}

/** Clear the app badge */
export async function clearAppBadge(): Promise<boolean> {
  return setAppBadge(0);
}

/* ═══════════════════════════════════════════════════
   4. SHARE TARGET API
   ═══════════════════════════════════════════════════ */

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/** Check if Web Share API is available */
export function canShare(data?: ShareData): boolean {
  if (!("share" in navigator)) return false;
  if (data?.files && !("canShare" in navigator)) return false;
  if (data?.files) {
    return (navigator as any).canShare({ files: data.files });
  }
  return true;
}

/** Share content via the native share dialog */
export async function shareContent(data: ShareData): Promise<boolean> {
  try {
    if (!canShare(data)) return false;
    await navigator.share(data as any);
    return true;
  } catch (err) {
    // User cancelled or not supported
    if ((err as Error).name === "AbortError") return false;
    return false;
  }
}

/* ═══════════════════════════════════════════════════
   5. PRECACHE & STORAGE MANAGEMENT
   ═══════════════════════════════════════════════════ */

/** Precache a list of URLs for offline access */
export async function precacheUrls(urls: string[], cacheName = "el-precache"): Promise<number> {
  if (!("caches" in window)) return 0;
  try {
    const cache = await caches.open(cacheName);
    let cached = 0;
    for (const url of urls) {
      try {
        // Only cache if not already cached
        const existing = await cache.match(url);
        if (!existing) {
          await cache.add(url);
        }
        cached++;
      } catch {
        // Skip failed URLs
      }
    }
    return cached;
  } catch {
    return 0;
  }
}

/** Get all cached URLs in a named cache */
export async function getCachedUrls(cacheName: string): Promise<string[]> {
  if (!("caches" in window)) return [];
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    return keys.map((r) => r.url);
  } catch {
    return [];
  }
}

/** Get total storage across all caches */
export async function getTotalCacheSize(): Promise<{
  cacheCount: number;
  estimatedBytes: number;
}> {
  if (!("caches" in window)) return { cacheCount: 0, estimatedBytes: 0 };
  try {
    const names = await caches.keys();
    const estimate = await navigator.storage?.estimate();
    return {
      cacheCount: names.length,
      estimatedBytes: estimate?.usage ?? 0,
    };
  } catch {
    return { cacheCount: 0, estimatedBytes: 0 };
  }
}

/** Cleanup old caches not in the allowed list */
export async function cleanupOldCaches(allowedCaches: string[]): Promise<number> {
  if (!("caches" in window)) return 0;
  const names = await caches.keys();
  let deleted = 0;
  for (const name of names) {
    if (!allowedCaches.includes(name)) {
      await caches.delete(name);
      deleted++;
    }
  }
  return deleted;
}

/* ═══════════════════════════════════════════════════
   6. VISIBILITY & WAKE LOCK
   ═══════════════════════════════════════════════════ */

/** 
 * Register a callback for visibility changes (tab focus/blur).
 * Useful for pausing/resuming realtime subscriptions. 
 */
export function onVisibilityChange(
  callback: (visible: boolean) => void
): () => void {
  const handler = () => {
    callback(document.visibilityState === "visible");
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

/** Request a screen wake lock (prevents screen from sleeping) */
export async function requestWakeLock(): Promise<{
  release: () => Promise<void>;
} | null> {
  try {
    if ("wakeLock" in navigator) {
      const lock = await (navigator as any).wakeLock.request("screen");
      return {
        release: () => lock.release(),
      };
    }
  } catch {
    // Not supported or permission denied
  }
  return null;
}
