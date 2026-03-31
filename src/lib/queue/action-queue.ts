/**
 * ACTION QUEUE ENGINE — Priority-based, sequential, offline-aware action queue.
 * FULL PROD HARDENED v2.
 *
 * Guarantees:
 * 1. Actions on the same queue key execute sequentially (no race conditions)
 * 2. Higher priority tasks execute first within a queue
 * 3. Failed tasks retry with exponential backoff (retryable errors only)
 * 4. Offline tasks persist to localStorage and replay on reconnect
 * 5. Dedup returns the REAL shared result (not empty ok)
 * 6. Empty queues are cleaned from the Map (accurate health)
 * 7. Non-retryable errors abort immediately (no wasted retries)
 * 8. Offline replay preserves failed tasks for next attempt
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
  execute: (ctx: QueueExecutionContext) => Promise<T>;
  /** Max retry attempts. Default: 0 (no retry) */
  maxRetries?: number;
  /** Whether this task can be persisted for offline replay */
  offlineCapable?: boolean;
  /** Serialized input for offline replay (execute can't be serialized) */
  offlinePayload?: Record<string, unknown>;
  /** Request ID for tracing (propagated to execute ctx) */
  requestId?: string;
  /** Correlation ID for tracing (propagated to execute ctx) */
  correlationId?: string;
}

/** Context passed to task.execute() for full traceability */
export interface QueueExecutionContext {
  requestId: string;
  correlationId: string;
  attempt: number;
  maxRetries: number;
}

export interface QueueResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  retries?: number;
  deduplicated?: boolean;
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

/**
 * Errors that should NOT be retried — they indicate a logic/state issue, not a transient failure.
 */
const NON_RETRYABLE_ERRORS = new Set([
  "flow_locked",
  "invalid_state",
  "terminal_state",
  "duplicate_terminal_action",
  "guard_failed",
  "validation_failed",
  "unauthorized",
  "forbidden",
]);

export function isNonRetryableError(errorMsg: string): boolean {
  return NON_RETRYABLE_ERRORS.has(errorMsg);
}

// ── State ──

const queues = new Map<string, InternalTask[]>();
const processing = new Set<string>();
/** Maps globalTaskKey → Promise of result, so dedup callers get the real result */
const inflightResults = new Map<string, Promise<QueueResult<any>>>();

// ── Structured logging ──

interface QueueLogEntry {
  domain: string;
  action: string;
  taskId: string;
  queueKey: string;
  status: "queued" | "started" | "success" | "failed" | "retrying" | "deduplicated" | "offline_saved" | "non_retryable";
  priority: number;
  duration?: number;
  error?: string;
  retryAttempt?: number;
  requestId?: string;
  correlationId?: string;
}

const logBuffer: QueueLogEntry[] = [];
const MAX_LOG = 500;

function pushQueueLog(entry: QueueLogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG) logBuffer.splice(0, 100);

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    const prefix = `[Q:${entry.domain}.${entry.action}]`;
    if (entry.status === "failed" || entry.status === "non_retryable") {
      console.warn(`${prefix} ${entry.status}: ${entry.error}`);
    } else if (entry.status === "deduplicated") {
      console.debug(`${prefix} DEDUP: ${entry.taskId} (sharing inflight result)`);
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

// ── Memory cleanup helper ──

function cleanupEmptyQueue(queueKey: string): void {
  const queue = queues.get(queueKey);
  if (queue && queue.length === 0) {
    queues.delete(queueKey);
  }
}

// ── Core: Enqueue ──

export function enqueue<T>(
  queueKey: string,
  task: QueueTask<T>,
): Promise<QueueResult<T>> {
  const globalTaskKey = `${queueKey}:${task.id}`;

  // FIX #1: Dedup returns the REAL shared inflight result
  const inflight = inflightResults.get(globalTaskKey);
  if (inflight) {
    pushQueueLog({
      domain: task.domain, action: task.action, taskId: task.id,
      queueKey, status: "deduplicated", priority: task.priority,
      requestId: task.requestId, correlationId: task.correlationId,
    });
    return inflight as Promise<QueueResult<T>>;
  }

  // Queue size guard
  const queue = queues.get(queueKey) ?? [];
  if (queue.length >= MAX_QUEUE_SIZE) {
    return Promise.reject(new Error(`Queue ${queueKey} full (${MAX_QUEUE_SIZE})`));
  }

  const resultPromise = new Promise<QueueResult<T>>((resolve, reject) => {
    const internal: InternalTask<T> = {
      ...task,
      createdAt: Date.now(),
      resolve,
      reject,
    };

    queue.push(internal);
    queue.sort((a, b) => b.priority - a.priority);
    queues.set(queueKey, queue);

    pushQueueLog({
      domain: task.domain, action: task.action, taskId: task.id,
      queueKey, status: "queued", priority: task.priority,
      requestId: task.requestId, correlationId: task.correlationId,
    });

    processNext(queueKey);
  });

  // Store inflight promise so dedup callers get the same result
  inflightResults.set(globalTaskKey, resultPromise);

  // Clean up inflight entry when done
  resultPromise.finally(() => {
    inflightResults.delete(globalTaskKey);
  });

  return resultPromise;
}

// ── Core: Process ──

async function processNext(queueKey: string): Promise<void> {
  if (processing.has(queueKey)) return;

  const queue = queues.get(queueKey);
  if (!queue || queue.length === 0) {
    cleanupEmptyQueue(queueKey); // FIX #5: Remove empty queues
    return;
  }

  processing.add(queueKey);
  const task = queue.shift()!;
  const maxRetries = task.maxRetries ?? 0;

  // FIX #3: Build execution context with requestId + correlationId
  const requestId = task.requestId ?? crypto.randomUUID();
  const correlationId = task.correlationId ?? crypto.randomUUID();

  pushQueueLog({
    domain: task.domain, action: task.action, taskId: task.id,
    queueKey, status: "started", priority: task.priority,
    requestId, correlationId,
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
          retryAttempt: attempt, requestId, correlationId,
        });
      }

      // FIX #3: Pass full context to execute
      const ctx: QueueExecutionContext = {
        requestId,
        correlationId,
        attempt,
        maxRetries,
      };

      const data = await task.execute(ctx);
      const duration = Date.now() - startedAt;

      pushQueueLog({
        domain: task.domain, action: task.action, taskId: task.id,
        queueKey, status: "success", priority: task.priority, duration,
        requestId, correlationId,
      });

      task.resolve({
        ok: true, data, retries: attempt,
        queuedAt: task.createdAt, executedAt: startedAt, duration,
      });

      processing.delete(queueKey);
      cleanupEmptyQueue(queueKey); // FIX #5

      if (queue.length > 0) processNext(queueKey);
      return;
    } catch (err: any) {
      lastError = err?.message || String(err);

      // FIX #4: Non-retryable errors abort immediately
      if (isNonRetryableError(lastError)) {
        pushQueueLog({
          domain: task.domain, action: task.action, taskId: task.id,
          queueKey, status: "non_retryable", priority: task.priority,
          duration: Date.now() - startedAt, error: lastError,
          requestId, correlationId,
        });
        break; // Exit retry loop immediately
      }
    }
  }

  // All retries exhausted OR non-retryable
  const duration = Date.now() - startedAt;

  pushQueueLog({
    domain: task.domain, action: task.action, taskId: task.id,
    queueKey, status: "failed", priority: task.priority, duration,
    error: lastError, requestId, correlationId,
  });

  // If offline-capable, persist for later replay
  if (task.offlineCapable && task.offlinePayload && !isNonRetryableError(lastError ?? "")) {
    saveOfflineTask({
      id: task.id, domain: task.domain, action: task.action,
      priority: task.priority, payload: task.offlinePayload,
      requestId, correlationId,
    });
  }

  task.resolve({
    ok: false, error: lastError, retries: task.maxRetries ?? 0,
    queuedAt: task.createdAt, executedAt: startedAt, duration,
  });

  processing.delete(queueKey);
  cleanupEmptyQueue(queueKey); // FIX #5

  if (queue.length > 0) processNext(queueKey);
}

// ── Offline Persistence ──

export interface OfflineTask {
  id: string;
  domain: string;
  action: string;
  priority: number;
  payload: Record<string, unknown>;
  savedAt: number;
  /** Preserved for traceability across replays */
  requestId?: string;
  correlationId?: string;
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
      priority: task.priority, requestId: task.requestId, correlationId: task.correlationId,
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
 * FIX #2: Only removes tasks that were successfully replayed. Failed tasks stay for next attempt.
 * FIX #6: Offline payload contains full context (requestId, correlationId, all input data).
 */
export async function replayOffline(
  resolver: (task: OfflineTask) => ((ctx: QueueExecutionContext) => Promise<unknown>) | null,
): Promise<{ replayed: number; failed: number; remaining: number }> {
  const tasks = getOfflineTasks();
  if (tasks.length === 0) return { replayed: 0, failed: 0, remaining: 0 };

  // Sort by priority desc, then by savedAt asc (oldest first within same priority)
  tasks.sort((a, b) => b.priority - a.priority || a.savedAt - b.savedAt);

  let replayed = 0;
  let failed = 0;
  const stillFailed: OfflineTask[] = [];

  for (const task of tasks) {
    const executeFn = resolver(task);
    if (!executeFn) {
      failed++;
      stillFailed.push(task); // FIX #2: Preserve unresolvable tasks
      continue;
    }

    try {
      const result = await enqueue(`replay:${task.domain}:${task.action}`, {
        id: task.id,
        domain: task.domain,
        action: task.action,
        priority: task.priority,
        requestId: task.requestId,
        correlationId: task.correlationId,
        execute: executeFn,
        maxRetries: 2,
      });

      if (result.ok) {
        replayed++;
      } else {
        failed++;
        stillFailed.push(task); // FIX #2: Keep failed for next replay
      }
    } catch {
      failed++;
      stillFailed.push(task); // FIX #2: Keep failed for next replay
    }
  }

  // FIX #2: Only persist tasks that still failed, not wipe everything
  try {
    if (stillFailed.length > 0) {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(stillFailed));
    } else {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }

  return { replayed, failed, remaining: stillFailed.length };
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
  for (const [, queue] of queues) {
    for (const task of queue) {
      task.resolve({
        ok: false, error: "queue_drained",
        queuedAt: task.createdAt, executedAt: Date.now(), duration: 0,
      });
    }
  }
  queues.clear();
  processing.clear();
  inflightResults.clear();
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
