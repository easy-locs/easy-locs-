/**
 * Event Replay Buffer — Client-side DLQ for failed platformBus events.
 *
 * Architecture:
 * - Failed events stored in IndexedDB (persistent across refreshes)
 * - Stored in canonical PlatformEvent format for correct re-emission
 * - Retry: manual (from admin UI) or automatic on flux recovery
 * - Synced to server DLQ via dead_letter_queue table
 * - Max 500 events in buffer; oldest evicted on overflow
 */
import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";
import { db } from "@/services/db";
import { busObserver } from "./bus-observer";

export interface ReplayEvent {
  id: string;
  eventType: string;
  platformEvent: PlatformEvent;
  failedAt: string;
  failureReason: string;
  retryCount: number;
  maxRetries: number;
  status: "pending" | "retrying" | "resolved" | "dead";
  lastRetryAt: string | null;
  resolvedAt: string | null;
}

const DB_NAME = "el-event-replay";
const STORE_NAME = "replay_buffer";
const DB_VERSION = 1;
const MAX_BUFFER_SIZE = 500;
const MAX_RETRIES = 3;

let _idb: IDBDatabase | null = null;

async function openDb(): Promise<IDBDatabase> {
  if (_idb) return _idb;
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("failedAt", "failedAt", { unique: false });
      }
    };
    req.onsuccess = () => { _idb = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uid(): string {
  return `replay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Memory fallback for environments without IndexedDB
const memoryBuffer = new Map<string, ReplayEvent>();

/**
 * Store a failed PlatformEvent in the replay buffer.
 * Preserves the full event structure for correct re-emission.
 */
export async function storeFailedEvent(
  platformEvent: PlatformEvent,
  failureReason: string,
  maxRetries = MAX_RETRIES
): Promise<string> {
  const id = uid();
  const entry: ReplayEvent = {
    id,
    eventType: String(platformEvent.type),
    platformEvent,
    failedAt: new Date().toISOString(),
    failureReason,
    retryCount: 0,
    maxRetries,
    status: "pending",
    lastRetryAt: null,
    resolvedAt: null,
  };

  try {
    const idb = await openDb();
    const tx = idb.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Overflow eviction: remove oldest if at limit
    const count = await idbReq(store.count());
    if (count >= MAX_BUFFER_SIZE) {
      const cursor = await idbReq(store.index("failedAt").openCursor(null, "next"));
      if (cursor) cursor.delete();
    }

    await idbReq(store.put(entry));
    console.log(`[event-replay-buffer] Stored failed event: ${entry.eventType} (id=${id})`);
  } catch {
    memoryBuffer.set(id, entry);
  }

  // Sync to server DLQ (best-effort)
  syncToServerDlq(entry).catch(() => {});

  return id;
}

/**
 * Get all pending/retrying events from the buffer.
 */
export async function getPendingReplayEvents(): Promise<ReplayEvent[]> {
  try {
    const idb = await openDb();
    const tx = idb.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const all = await idbReq(store.getAll()) as ReplayEvent[];
    return all.filter(e => e.status === "pending" || e.status === "retrying");
  } catch {
    return Array.from(memoryBuffer.values()).filter(e => e.status === "pending" || e.status === "retrying");
  }
}

/**
 * Get all events in the buffer (for admin UI display).
 */
export async function getAllReplayEvents(): Promise<ReplayEvent[]> {
  try {
    const idb = await openDb();
    const tx = idb.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const all = await idbReq(store.getAll()) as ReplayEvent[];
    return all.sort((a, b) => new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime());
  } catch {
    return Array.from(memoryBuffer.values());
  }
}

async function updateEntry(id: string, updater: (e: ReplayEvent) => void): Promise<ReplayEvent | null> {
  try {
    const idb = await openDb();
    const tx = idb.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry = await idbReq(store.get(id)) as ReplayEvent;
    if (!entry) return null;
    updater(entry);
    await idbReq(store.put(entry));
    return entry;
  } catch {
    const entry = memoryBuffer.get(id);
    if (!entry) return null;
    updater(entry);
    memoryBuffer.set(id, entry);
    return entry;
  }
}

/**
 * Retry a specific event by re-emitting the original PlatformEvent on platformBus.
 * Uses the stored event's type, payload, and source for correct re-emission.
 */
export async function retryEvent(id: string): Promise<{ success: boolean; reason?: string }> {
  let entry: ReplayEvent | null = null;

  // Check state first
  try {
    const idb = await openDb();
    const tx = idb.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    entry = await idbReq(store.get(id)) as ReplayEvent;
  } catch {
    entry = memoryBuffer.get(id) ?? null;
  }

  if (!entry) return { success: false, reason: "not_found" };
  if (entry.status === "dead") return { success: false, reason: "max_retries_exhausted" };
  if (entry.retryCount >= entry.maxRetries) {
    await updateEntry(id, e => { e.status = "dead"; });
    return { success: false, reason: "max_retries_exhausted" };
  }

  // Mark as retrying
  await updateEntry(id, e => {
    e.status = "retrying";
    e.retryCount++;
    e.lastRetryAt = new Date().toISOString();
  });

  const ev = entry.platformEvent;

  // Observer-confirmed failure detection:
  // Subscribe *before* emitting so we catch synchronous handler failures
  // reported by the BusObserver timing reporter.
  // Match by correlationId if the event has one (precise), otherwise fall
  // back to event-type matching (may be over-inclusive under high concurrency).
  let handlerFailed = false;
  const unsubFailure = busObserver.onFailure((failEv, type) => {
    const matchByCorrelation = ev.correlationId && failEv.correlationId === ev.correlationId;
    const matchByType = !ev.correlationId && type === ev.type;
    if (matchByCorrelation || matchByType) handlerFailed = true;
  });

  try {
    // Re-emit using the original event's type, payload, and source
    platformBus.emit(
      ev.type,
      ev.payload,
      ev.source,
      {
        userId: ev.userId,
        orgId: ev.orgId,
        correlationId: ev.correlationId,
        traceId: ev.traceId,
      }
    );

    // Yield a microtask to allow synchronous handler execution and timing
    // reports to complete before we check the failure flag.
    await Promise.resolve();
    unsubFailure();

    if (handlerFailed) {
      // Handler failed as confirmed by busObserver — keep in pending for next retry
      await updateEntry(id, e => { e.status = "pending"; });
      return { success: false, reason: "handler_failed_on_retry" };
    }

    await markEventResolved(id);
    return { success: true };
  } catch (e: unknown) {
    unsubFailure();
    const message = e instanceof Error ? e.message : "unknown_error";
    console.warn(`[event-replay-buffer] Retry emit threw for ${id}: ${message}`);
    await updateEntry(id, e => { e.status = "pending"; });
    return { success: false, reason: message };
  }
}

/**
 * Mark an event as resolved.
 */
export async function markEventResolved(id: string): Promise<void> {
  await updateEntry(id, e => {
    e.status = "resolved";
    e.resolvedAt = new Date().toISOString();
  });
}

/**
 * Auto-replay all pending events (triggered on flux recovery).
 */
export async function autoReplayOnRecovery(): Promise<{ replayed: number; failed: number }> {
  const pending = await getPendingReplayEvents();
  if (pending.length === 0) return { replayed: 0, failed: 0 };

  console.log(`[event-replay-buffer] Auto-replaying ${pending.length} pending events after flux recovery`);

  let replayed = 0;
  let failed = 0;

  for (const event of pending) {
    const result = await retryEvent(event.id);
    if (result.success) replayed++;
    else failed++;
  }

  console.log(`[event-replay-buffer] Auto-replay complete: ${replayed} replayed, ${failed} failed`);
  return { replayed, failed };
}

/**
 * Get buffer statistics for admin UI / health dashboard.
 */
export async function getReplayBufferStats(): Promise<{
  total: number;
  pending: number;
  retrying: number;
  resolved: number;
  dead: number;
}> {
  const all = await getAllReplayEvents();
  return {
    total: all.length,
    pending: all.filter(e => e.status === "pending").length,
    retrying: all.filter(e => e.status === "retrying").length,
    resolved: all.filter(e => e.status === "resolved").length,
    dead: all.filter(e => e.status === "dead").length,
  };
}

/**
 * Sync a failed event to the server DLQ (dead_letter_queue table).
 * Best-effort — does not block the replay buffer on failure.
 */
async function syncToServerDlq(entry: ReplayEvent): Promise<void> {
  try {
    await db("dead_letter_queue").insert({
      source_system: `platform-bus:${entry.eventType}`,
      payload: {
        eventType: entry.eventType,
        platformEvent: entry.platformEvent,
        clientReplayId: entry.id,
      },
      status: "pending",
      retry_count: 0,
      max_retries: entry.maxRetries,
      error: entry.failureReason,
      next_retry_at: new Date(Date.now() + 5000).toISOString(),
    });
  } catch {
    // Server sync is best-effort
  }
}

/**
 * Install the event replay interceptor using the BusObserver layer.
 *
 * Uses busObserver.onFailure() (which is fed by platformBus.setTimingReporter)
 * to capture any typed listener that throws, storing the PlatformEvent for later
 * retry. Also subscribes to flux:recovered for automatic replay on recovery.
 *
 * Requires busObserver.install() to have been called first (done in initSystemLock).
 * Returns a teardown function.
 */
let interceptorInstalled = false;

export function installReplayInterceptor(): () => void {
  if (interceptorInstalled) return () => {};
  interceptorInstalled = true;

  // Capture failures reported by the BusObserver timing layer
  const unsubFailures = busObserver.onFailure((event, type) => {
    console.warn(`[event-replay-buffer] Handler for "${type}" failed, storing PlatformEvent for replay`);
    storeFailedEvent(event, "handler error detected by bus observer").catch(() => {});
  });

  // Auto-replay when flux system recovers
  const unsubRecovery = platformBus.on("flux:recovered", async () => {
    await autoReplayOnRecovery();
  });

  console.log("[event-replay-buffer] Replay interceptor installed via BusObserver");

  return () => {
    unsubFailures();
    unsubRecovery();
    interceptorInstalled = false;
  };
}
