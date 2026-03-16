/**
 * Task Queue Engine — PASS55 Block AX
 * Priority queue, job scheduling, background task management.
 */

// ─── Types ──────────────────────────────────────────────────────────────
export type TaskPriority = "critical" | "high" | "normal" | "low";
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  critical: 0, high: 1, normal: 2, low: 3,
};

export interface QueueTask<T = unknown> {
  id: string;
  name: string;
  priority: TaskPriority;
  status: TaskStatus;
  execute: () => Promise<T>;
  result?: T;
  error?: Error;
  retries: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  onProgress?: (pct: number) => void;
}

export type QueueListener = (task: QueueTask, queue: TaskQueue) => void;

// ─── Task Queue ─────────────────────────────────────────────────────────
export class TaskQueue {
  private tasks: QueueTask[] = [];
  private running = 0;
  private listeners: { event: string; fn: QueueListener }[] = [];
  private _paused = false;

  constructor(private concurrency = 2) {}

  /** Enqueue a task */
  add<T>(opts: {
    id: string;
    name: string;
    execute: () => Promise<T>;
    priority?: TaskPriority;
    maxRetries?: number;
    onProgress?: (pct: number) => void;
  }): QueueTask<T> {
    const task: QueueTask<T> = {
      id: opts.id,
      name: opts.name,
      priority: opts.priority ?? "normal",
      status: "queued",
      execute: opts.execute,
      retries: 0,
      maxRetries: opts.maxRetries ?? 0,
      createdAt: Date.now(),
      onProgress: opts.onProgress,
    };
    this.tasks.push(task as QueueTask);
    this.tasks.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
    this.emit("added", task as QueueTask);
    this.flush();
    return task;
  }

  /** Cancel a queued task */
  cancel(id: string): boolean {
    const task = this.tasks.find(t => t.id === id && t.status === "queued");
    if (!task) return false;
    task.status = "cancelled";
    this.emit("cancelled", task);
    return true;
  }

  /** Pause processing (running tasks continue) */
  pause() { this._paused = true; }

  /** Resume processing */
  resume() { this._paused = false; this.flush(); }

  get paused() { return this._paused; }
  get size() { return this.tasks.filter(t => t.status === "queued").length; }
  get activeCount() { return this.running; }

  /** Get all tasks */
  all(): QueueTask[] { return [...this.tasks]; }

  /** Get task by id */
  get(id: string): QueueTask | undefined { return this.tasks.find(t => t.id === id); }

  /** Subscribe to events */
  on(event: "added" | "started" | "completed" | "failed" | "cancelled", fn: QueueListener): () => void {
    this.listeners.push({ event, fn });
    return () => { this.listeners = this.listeners.filter(l => l.fn !== fn); };
  }

  /** Clear completed/failed/cancelled tasks */
  prune() {
    this.tasks = this.tasks.filter(t => t.status === "queued" || t.status === "running");
  }

  private emit(event: string, task: QueueTask) {
    this.listeners.filter(l => l.event === event).forEach(l => l.fn(task, this));
  }

  private flush() {
    if (this._paused) return;
    while (this.running < this.concurrency) {
      const next = this.tasks.find(t => t.status === "queued");
      if (!next) break;
      this.run(next);
    }
  }

  private async run(task: QueueTask) {
    task.status = "running";
    task.startedAt = Date.now();
    this.running++;
    this.emit("started", task);

    try {
      task.result = await task.execute();
      task.status = "completed";
      task.completedAt = Date.now();
      this.emit("completed", task);
    } catch (err) {
      task.error = err instanceof Error ? err : new Error(String(err));
      task.retries++;
      if (task.retries <= task.maxRetries) {
        task.status = "queued";
        task.error = undefined;
      } else {
        task.status = "failed";
        task.completedAt = Date.now();
        this.emit("failed", task);
      }
    } finally {
      this.running--;
      this.flush();
    }
  }
}

// ─── Job Scheduler (cron-like, browser-safe) ────────────────────────────
export interface ScheduledJob {
  id: string;
  name: string;
  intervalMs: number;
  execute: () => Promise<void>;
  lastRun?: number;
  nextRun: number;
  active: boolean;
}

export class JobScheduler {
  private jobs = new Map<string, ScheduledJob & { timer?: ReturnType<typeof setInterval> }>();

  schedule(opts: { id: string; name: string; intervalMs: number; execute: () => Promise<void>; immediate?: boolean }): void {
    const job: ScheduledJob & { timer?: ReturnType<typeof setInterval> } = {
      id: opts.id,
      name: opts.name,
      intervalMs: opts.intervalMs,
      execute: opts.execute,
      nextRun: Date.now() + (opts.immediate ? 0 : opts.intervalMs),
      active: true,
    };

    if (opts.immediate) job.execute().catch(() => {});
    job.timer = setInterval(async () => {
      if (!job.active) return;
      job.lastRun = Date.now();
      job.nextRun = Date.now() + job.intervalMs;
      try { await job.execute(); } catch { /* logged elsewhere */ }
    }, opts.intervalMs);

    this.jobs.set(opts.id, job);
  }

  unschedule(id: string) {
    const job = this.jobs.get(id);
    if (job?.timer) clearInterval(job.timer);
    this.jobs.delete(id);
  }

  pause(id: string) {
    const job = this.jobs.get(id);
    if (job) job.active = false;
  }

  resume(id: string) {
    const job = this.jobs.get(id);
    if (job) job.active = true;
  }

  list(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(({ timer: _, ...rest }) => rest);
  }

  clear() {
    this.jobs.forEach(j => { if (j.timer) clearInterval(j.timer); });
    this.jobs.clear();
  }
}
