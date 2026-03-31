/**
 * Write-Ahead Queue — Persistent job queue for critical write operations.
 * Every write is logged locally BEFORE network transmission.
 * If the app crashes, jobs survive and replay on next launch.
 */

const DB_NAME = "orbit-wal";
const DB_VERSION = 1;
const STORE_NAME = "pending_jobs";

export type JobKind =
  | "send_message"
  | "retry_message"
  | "upload_attachment"
  | "mark_read"
  | "start_call"
  | "edit_message"
  | "delete_message"
  | "send_location"
  | "send_payment";

export type JobPriority = "critical" | "high" | "medium" | "low";
export type JobStatus = "queued" | "running" | "failed" | "dead";

export interface PendingJob {
  id: string;
  kind: JobKind;
  payload: unknown;
  idempotencyKey: string;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  status: JobStatus;
  createdAt: number;
  lastAttemptAt: number | null;
  error: string | null;
}

// ── IndexedDB ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_status", "status", { unique: false });
        store.createIndex("by_priority", "priority", { unique: false });
        store.createIndex("by_kind", "kind", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Operations ──

/** Enqueue a write job */
export async function enqueueJob(
  kind: JobKind,
  payload: unknown,
  idempotencyKey: string,
  priority: JobPriority = "high",
  maxAttempts = 5,
): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const job: PendingJob = {
    id,
    kind,
    payload,
    idempotencyKey,
    priority,
    attempts: 0,
    maxAttempts,
    status: "queued",
    createdAt: Date.now(),
    lastAttemptAt: null,
    error: null,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(job);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all queued/failed jobs, sorted by priority */
export async function getPendingJobs(): Promise<PendingJob[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const jobs = (req.result as PendingJob[])
        .filter(j => j.status === "queued" || j.status === "failed")
        .sort((a, b) => {
          const p = { critical: 0, high: 1, medium: 2, low: 3 };
          return (p[a.priority] - p[b.priority]) || (a.createdAt - b.createdAt);
        });
      resolve(jobs);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Mark a job as running */
export async function markJobRunning(jobId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(jobId);
    req.onsuccess = () => {
      const job = req.result as PendingJob;
      if (job) {
        job.status = "running";
        job.attempts++;
        job.lastAttemptAt = Date.now();
        store.put(job);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Mark a job as failed */
export async function markJobFailed(jobId: string, error: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(jobId);
    req.onsuccess = () => {
      const job = req.result as PendingJob;
      if (job) {
        job.error = error;
        job.status = job.attempts >= job.maxAttempts ? "dead" : "failed";
        store.put(job);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Remove a completed job */
export async function completeJob(jobId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(jobId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get dead-letter jobs (exceeded max attempts) */
export async function getDeadJobs(): Promise<PendingJob[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      resolve((req.result as PendingJob[]).filter(j => j.status === "dead"));
    };
    req.onerror = () => reject(req.error);
  });
}

/** Purge dead jobs */
export async function purgeDeadJobs(): Promise<number> {
  const dead = await getDeadJobs();
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    dead.forEach(j => store.delete(j.id));
    tx.oncomplete = () => resolve(dead.length);
    tx.onerror = () => reject(tx.error);
  });
}

/** Count pending jobs by kind */
export async function countJobsByKind(): Promise<Record<string, number>> {
  const jobs = await getPendingJobs();
  const counts: Record<string, number> = {};
  for (const j of jobs) {
    counts[j.kind] = (counts[j.kind] || 0) + 1;
  }
  return counts;
}
