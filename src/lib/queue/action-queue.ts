/**
 * ACTION QUEUE ENGINE — Priority-based, sequential, offline-aware action queue.
 *
 * Guarantees:
 * 1. Actions on the same queue key execute sequentially (no race conditions)
 * 2. Higher priority tasks execute first within a queue
 * 3. Failed tasks retry with exponential backoff
 * 4. Offline tasks persist to localStorage and replay on reconnect
 * 5. Integrates with ActionGuard (idempotency) and SinglePath (concurrency lock)
 *
 * Priority scale:
 *   10 = payment capture (CRITICAL)
 *    9 = QR payment
 *    8 = order submit
 *    7 = assign driver
 *    6 = message send
 *    5 = call actions
 *    3 = upload / attachment
 *    1 = tracking / background sync
 *
 * Usage:
 *   const result = await enqueue("wallet:pay123", {
 *     id: "pay123",
 *     domain: "wallet",
 *     action: "capture",
 *     priority: 10,
 *     execute: async () => capturePayment(...),
 *   });
 */

// ── Types ──

export interface QueueTask<T = unknown> {
  /** Unique task ID (for dedup within queue) */
  id: string;
  /** Domain owning this task */
  domain: string;
  /** Action name for logging */
  action: string;
  /** Priority (higher = first). Default: 5 */
  priority: number;
  /** The actual work to execute */
  execute: () => Promise<T>;
  /** Max retry attempts. Default: 0 (no retry) */
  maxRetries?: number;
  /** Whether this task can be persisted for offline replay */
  offlineCapable?: boolean;
  /** Serialized input for offline replay (execute can't be serialized) */
  offlinePayload?: Record<string, unknown>;
}

export interface QueueResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  retries?: number;
  queuedAt: number;
  executedAt: number;
  duration: number;
}

export interface QueueHealth {
  activeQueues: number;
  totalPending: number;
  totalProcessing: number;
  byDomain: Record<string, number>;
  offlinePending: number;
}

interface InternalTask<T = unknown> extends QueueTask<T> {
  createdAt: number;
  resolve: (value: QueueResult<T>) => void;
  reject: (err: Error) => void;
}

// ── Constants ──

const OFFLINE_STORAGE_KEY = "orbit_offline_queue";
const MAX_QUEUE_SIZE = 200;
const RETRY_BASE_MS = 500;
const RETRY_MAX_MS = 10_000;

// ── State ──

const queues = new Map<string, InternalTask[]>();
const processing = new Set<string>();
const taskIds = new Set<string>(); // global dedup

// ── Structured logging ──

interface QueueLogEntry {
  domain: string;
  action: string;
  taskId: string;
  queueKey: string;
  status: "queued" | "started" | "success" | "failed" | "retrying" | "deduplicated" | "offline_saved";
  priority: number;
  duration?: number;
  error?: string;
  retryAttempt?: number;
}

const logBuffer: QueueLogEntry[] = [];
const MAX_LOG = 500;

function pushQueueLog(entry: QueueLogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG) logBuffer.splice(0, 100);

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    const prefix = `[Q:${entry.domain}.${entry.action}]`;
    if (entry.status === "failed") {
      console.warn(`${prefix} FAILED: ${entry.error}`);
    } else if (entry.status === "deduplicated") {
      console.debug(`${prefix} DEDUP: ${entry.taskId}`);
    } else {
      console.debug(`${prefix} ${entry.status} (pri:${entry.priority}${entry.duration ? ` ${entry.duration}ms` : ""})`);
    }
  }
}

export function getQueueLogs(): readonly QueueLogEntry[] {
  return logBuffer;
}

export function clearQueueLogs(): void {
  logBuffer.length = 0;
}

// ── Core: Enqueue ──

export function enqueue<T>(
  queueKey: string,
  task: QueueTask<T>,
): Promise<QueueResult<T>> {
  // Task-level dedup: if same task ID is already queued/running, skip
  const globalTaskKey = `${queueKey}:${task.id}`;
  if (taskIds.has(globalTaskKey)) {
    pushQueueLog({
      domain: task.domain, action: task.action, taskId: task.id,
      queueKey, status: "deduplicated", priority: task.priority,
    });
    return Promise.resolve({
      ok: true, queuedAt: Date.now(), executedAt: Date.now(), duration: 0,
    } as QueueResult<T>);
  }

  // Queue size guard
  const queue = queues.get(queueKey) ?? [];
  if (queue.length >= MAX_QUEUE_SIZE) {
    return Promise.reject(new Error(`Queue ${queueKey} full (${MAX_QUEUE_SIZE})`));
  }

  taskIds.add(globalTaskKey);

  return new Promise<QueueResult<T>>((resolve, reject) => {
    const internal: InternalTask<T> = {
      ...task,
      createdAt: Date.now(),
      resolve,
      reject,
    };

    queue.push(internal);
    // Sort by priority descending
    queue.sort((a, b) => b.priority - a.priority);
    queues.set(queueKey, queue);

    pushQueueLog({
      domain: task.domain, action: task.action, taskId: task.id,
      queueKey, status: "queued", priority: task.priority,
    });

    // Trigger processing
    processNext(queueKey);
  });
}

// ── Core: Process ──

async function processNext(queueKey: string): Promise<void> {
  if (processing.has(queueKey)) return;

  const queue = queues.get(queueKey);
  if (!queue || queue.length === 0) return;

  processing.add(queueKey);
  const task = queue.shift()!;
  const globalTaskKey = `${queueKey}:${task.id}`;
  const maxRetries = task.maxRetries ?? 0;

  pushQueueLog({
    domain: task.domain, action: task.action, taskId: task.id,
    queueKey, status: "started", priority: task.priority,
  });

  const startedAt = Date.now();
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(RETRY_BASE_MS * Math.pow(2, attempt - 1), RETRY_MAX_MS);
        await sleep(delay);

        pushQueueLog({
          domain: task.domain, action: task.action, taskId: task.id,
          queueKey, status: "retrying", priority: task.priority,
          retryAttempt: attempt,
        });
      }

      const data = await task.execute();
      const duration = Date.now() - startedAt;

      pushQueueLog({
        domain: task.domain, action: task.action, taskId: task.id,
        queueKey, status: "success", priority: task.priority, duration,
      });

      task.resolve({
        ok: true, data, retries: attempt,
        queuedAt: task.createdAt, executedAt: startedAt, duration,
      });

      taskIds.delete(globalTaskKey);
      processing.delete(queueKey);

      // Process next in queue
      if (queue.length > 0) {
        processNext(queueKey);
      }
      return;
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  // All retries exhausted
  const duration = Date.now() - startedAt;

  pushQueueLog({
    domain: task.domain, action: task.action, taskId: task.id,
    queueKey, status: "failed", priority: task.priority, duration,
    error: lastError,
  });

  // If offline-capable, persist for later replay
  if (task.offlineCapable && task.offlinePayload) {
    saveOfflineTask({
      id: task.id, domain: task.domain, action: task.action,
      priority: task.priority, payload: task.offlinePayload,
    });
  }

  task.resolve({
    ok: false, error: lastError, retries: task.maxRetries ?? 0,
    queuedAt: task.createdAt, executedAt: startedAt, duration,
  });

  taskIds.delete(globalTaskKey);
  processing.delete(queueKey);

  if (queue.length > 0) {
    processNext(queueKey);
  }
}

// ── Offline Persistence ──

interface OfflineTask {
  id: string;
  domain: string;
  action: string;
  priority: number;
  payload: Record<string, unknown>;
  savedAt: number;
}

function saveOfflineTask(task: Omit<OfflineTask, "savedAt">): void {
  try {
    const existing = getOfflineTasks();
    // Dedup by id
    const filtered = existing.filter((t) => t.id !== task.id);
    filtered.push({ ...task, savedAt: Date.now() });
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(filtered));

    pushQueueLog({
      domain: task.domain, action: task.action, taskId: task.id,
      queueKey: `offline:${task.domain}`, status: "offline_saved",
      priority: task.priority,
    });
  } catch {
    // localStorage may be unavailable
  }
}

export function getOfflineTasks(): OfflineTask[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearOfflineTasks(): void {
  try {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Replay offline tasks using a resolver that maps domain+action+payload back to an execute fn.
 * Call this when connectivity is restored.
 */
export async function replayOffline(
  resolver: (task: OfflineTask) => (() => Promise<unknown>) | null,
): Promise<{ replayed: number; failed: number }> {
  const tasks = getOfflineTasks();
  if (tasks.length === 0) return { replayed: 0, failed: 0 };

  // Sort by priority desc, then by savedAt asc (oldest first within same priority)
  tasks.sort((a, b) => b.priority - a.priority || a.savedAt - b.savedAt);

  let replayed = 0;
  let failed = 0;

  for (const task of tasks) {
    const executeFn = resolver(task);
    if (!executeFn) {
      failed++;
      continue;
    }

    try {
      await enqueue(`replay:${task.domain}:${task.action}`, {
        id: task.id,
        domain: task.domain,
        action: task.action,
        priority: task.priority,
        execute: executeFn,
        maxRetries: 2,
      });
      replayed++;
    } catch {
      failed++;
    }
  }

  clearOfflineTasks();
  return { replayed, failed };
}

// ── Health / Observability ──

export function getQueueHealth(): QueueHealth {
  const byDomain: Record<string, number> = {};
  let totalPending = 0;

  for (const [, queue] of queues) {
    for (const task of queue) {
      byDomain[task.domain] = (byDomain[task.domain] || 0) + 1;
      totalPending++;
    }
  }

  return {
    activeQueues: queues.size,
    totalPending,
    totalProcessing: processing.size,
    byDomain,
    offlinePending: getOfflineTasks().length,
  };
}

/**
 * Drain all queues (for testing/shutdown). Does NOT execute remaining tasks.
 */
export function drainAllQueues(): void {
  for (const [key, queue] of queues) {
    const globalKeys = queue.map((t) => `${key}:${t.id}`);
    for (const gk of globalKeys) taskIds.delete(gk);
    // Resolve remaining tasks as cancelled
    for (const task of queue) {
      task.resolve({
        ok: false, error: "queue_drained",
        queuedAt: task.createdAt, executedAt: Date.now(), duration: 0,
      });
    }
  }
  queues.clear();
  processing.clear();
}

// ── Utility ──

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Priority Constants (export for consumers) ──

export const QUEUE_PRIORITY = {
  PAYMENT_CAPTURE: 10,
  QR_PAYMENT: 9,
  ORDER_SUBMIT: 8,
  ASSIGN_DRIVER: 7,
  MESSAGE_SEND: 6,
  CALL_ACTION: 5,
  UPLOAD: 3,
  TRACKING: 1,
} as const;
