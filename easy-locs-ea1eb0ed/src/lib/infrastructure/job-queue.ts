/**
 * job-queue — Client-side job queue with priority, retry, concurrency control.
 *
 * Manages async tasks with configurable concurrency, exponential backoff retry,
 * and priority scheduling. Used for media uploads, batch operations,
 * background syncs, and deferred work.
 */

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type JobPriority = "critical" | "high" | "normal" | "low";

const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export interface Job<T = unknown> {
  id: string;
  name: string;
  payload: T;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  result: unknown;
}

export interface JobOptions {
  priority?: JobPriority;
  maxAttempts?: number;
  delayMs?: number;
}

type JobHandler<T = unknown> = (payload: T, signal: AbortSignal) => Promise<unknown>;

interface QueueConfig {
  concurrency: number;
  maxQueueSize: number;
  retryBaseMs: number;
  retryMaxMs: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  concurrency: 3,
  maxQueueSize: 200,
  retryBaseMs: 1000,
  retryMaxMs: 30_000,
};

class JobQueue {
  private jobs = new Map<string, Job>();
  private handlers = new Map<string, JobHandler>();
  private queue: string[] = [];
  private running = new Set<string>();
  private config: QueueConfig;
  private abortControllers = new Map<string, AbortController>();
  private listeners = new Set<(event: JobEvent) => void>();
  private _nextId = 0;
  private processing = false;

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  registerHandler<T = unknown>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler);
  }

  enqueue<T = unknown>(name: string, payload: T, opts?: JobOptions): string {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`[JobQueue] Queue full (${this.config.maxQueueSize})`);
    }

    if (!this.handlers.has(name)) {
      throw new Error(`[JobQueue] No handler registered for "${name}"`);
    }

    const id = `job_${Date.now()}_${++this._nextId}`;
    const job: Job<T> = {
      id,
      name,
      payload,
      priority: opts?.priority ?? "normal",
      status: "pending",
      attempts: 0,
      maxAttempts: opts?.maxAttempts ?? 3,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null,
      result: null,
    };

    this.jobs.set(id, job as Job);

    if (opts?.delayMs && opts.delayMs > 0) {
      setTimeout(() => {
        this.queue.push(id);
        this.sortQueue();
        this.processNext();
      }, opts.delayMs);
    } else {
      this.queue.push(id);
      this.sortQueue();
      this.processNext();
    }

    this.emit({ type: "enqueued", jobId: id, name });
    return id;
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === "running") {
      const ac = this.abortControllers.get(jobId);
      if (ac) ac.abort();
    }

    job.status = "cancelled";
    job.completedAt = Date.now();
    this.queue = this.queue.filter((id) => id !== jobId);
    this.running.delete(jobId);
    this.emit({ type: "cancelled", jobId, name: job.name });
    this.processNext();
    return true;
  }

  getJob(jobId: string): Readonly<Job> | undefined {
    return this.jobs.get(jobId);
  }

  getQueueStatus(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  } {
    let pending = 0, running = 0, completed = 0, failed = 0;
    for (const job of this.jobs.values()) {
      switch (job.status) {
        case "pending": pending++; break;
        case "running": running++; break;
        case "completed": completed++; break;
        case "failed": failed++; break;
      }
    }
    return { pending, running, completed, failed, total: this.jobs.size };
  }

  clearCompleted(): number {
    let count = 0;
    for (const [id, job] of this.jobs) {
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        this.jobs.delete(id);
        count++;
      }
    }
    return count;
  }

  subscribe(fn: (event: JobEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const ja = this.jobs.get(a);
      const jb = this.jobs.get(b);
      if (!ja || !jb) return 0;
      const pa = PRIORITY_ORDER[ja.priority];
      const pb = PRIORITY_ORDER[jb.priority];
      if (pa !== pb) return pa - pb;
      return ja.createdAt - jb.createdAt;
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.running.size < this.config.concurrency && this.queue.length > 0) {
        const jobId = this.queue.shift();
        if (!jobId) break;

        const job = this.jobs.get(jobId);
        if (!job || job.status === "cancelled") continue;

        this.running.add(jobId);
        this.executeJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async executeJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      job.status = "failed";
      job.error = "No handler";
      job.completedAt = Date.now();
      this.running.delete(job.id);
      this.processNext();
      return;
    }

    job.status = "running";
    job.startedAt = Date.now();
    job.attempts++;

    const ac = new AbortController();
    this.abortControllers.set(job.id, ac);

    this.emit({ type: "started", jobId: job.id, name: job.name });

    try {
      job.result = await handler(job.payload, ac.signal);
      job.status = "completed";
      job.completedAt = Date.now();
      this.emit({ type: "completed", jobId: job.id, name: job.name });
    } catch (err) {
      if (ac.signal.aborted) {
        job.status = "cancelled";
        job.completedAt = Date.now();
      } else if (job.attempts < job.maxAttempts) {
        job.status = "pending";
        job.error = err instanceof Error ? err.message : String(err);
        const backoff = Math.min(
          this.config.retryBaseMs * Math.pow(2, job.attempts - 1),
          this.config.retryMaxMs,
        );
        setTimeout(() => {
          this.queue.push(job.id);
          this.sortQueue();
          this.processNext();
        }, backoff);
        this.emit({ type: "retry", jobId: job.id, name: job.name });
      } else {
        job.status = "failed";
        job.error = err instanceof Error ? err.message : String(err);
        job.completedAt = Date.now();
        this.emit({ type: "failed", jobId: job.id, name: job.name });
      }
    } finally {
      this.abortControllers.delete(job.id);
      this.running.delete(job.id);
      this.processNext();
    }
  }

  private emit(event: JobEvent): void {
    for (const fn of this.listeners) {
      try { fn(event); } catch {}
    }
  }
}

export interface JobEvent {
  type: "enqueued" | "started" | "completed" | "failed" | "cancelled" | "retry";
  jobId: string;
  name: string;
}

export const jobQueue = new JobQueue();
