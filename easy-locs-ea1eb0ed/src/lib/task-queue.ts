/**
 * Task Queue Engine — AX Block
 * Priority queue, job scheduling, concurrency control, retry logic.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type TaskPriority = "critical" | "high" | "normal" | "low";
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0, high: 1, normal: 2, low: 3,
};

export interface QueueTask<T = unknown> {
  id: string;
  name: string;
  priority: TaskPriority;
  execute: () => Promise<T>;
  status: TaskStatus;
  retries: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: T;
}

export interface QueueConfig {
  concurrency: number;
  defaultMaxRetries: number;
  retryDelayMs: number;
  onTaskComplete?: (task: QueueTask) => void;
  onTaskFailed?: (task: QueueTask) => void;
}

// ── Task Queue ──────────────────────────────────────────────────────────────

export class TaskQueue {
  private queue: QueueTask[] = [];
  private running = 0;
  private config: QueueConfig;
  private paused = false;
  private idCounter = 0;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      concurrency: config?.concurrency ?? 3,
      defaultMaxRetries: config?.defaultMaxRetries ?? 2,
      retryDelayMs: config?.retryDelayMs ?? 1000,
      onTaskComplete: config?.onTaskComplete,
      onTaskFailed: config?.onTaskFailed,
    };
  }

  /** Add a task to the queue */
  enqueue<T>(
    name: string,
    execute: () => Promise<T>,
    options?: { priority?: TaskPriority; maxRetries?: number }
  ): string {
    const id = `task_${++this.idCounter}_${Date.now()}`;
    const task: QueueTask<T> = {
      id,
      name,
      priority: options?.priority ?? "normal",
      execute: execute as () => Promise<unknown>,
      status: "pending",
      retries: 0,
      maxRetries: options?.maxRetries ?? this.config.defaultMaxRetries,
      createdAt: Date.now(),
    } as any;

    this.queue.push(task as QueueTask);
    // Sort by priority
    this.queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    this.process();
    return id;
  }

  /** Process next tasks respecting concurrency */
  private async process(): Promise<void> {
    if (this.paused) return;

    while (this.running < this.config.concurrency) {
      const next = this.queue.find((t) => t.status === "pending");
      if (!next) break;

      this.running++;
      next.status = "running";
      next.startedAt = Date.now();

      this.executeTask(next).finally(() => {
        this.running--;
        this.process();
      });
    }
  }

  private async executeTask(task: QueueTask): Promise<void> {
    try {
      task.result = await task.execute();
      task.status = "completed";
      task.completedAt = Date.now();
      this.config.onTaskComplete?.(task);
    } catch (err) {
      task.retries++;
      if (task.retries <= task.maxRetries) {
        task.status = "pending";
        // Delay before retry
        await new Promise((r) => setTimeout(r, this.config.retryDelayMs * task.retries));
        // Re-sort and process
        this.process();
      } else {
        task.status = "failed";
        task.error = err instanceof Error ? err.message : String(err);
        task.completedAt = Date.now();
        this.config.onTaskFailed?.(task);
      }
    }
  }

  /** Cancel a pending task */
  cancel(taskId: string): boolean {
    const task = this.queue.find((t) => t.id === taskId);
    if (!task || task.status !== "pending") return false;
    task.status = "cancelled";
    return true;
  }

  /** Pause queue processing */
  pause(): void {
    this.paused = true;
  }

  /** Resume queue processing */
  resume(): void {
    this.paused = false;
    this.process();
  }

  /** Get queue stats */
  stats(): { pending: number; running: number; completed: number; failed: number; total: number } {
    const s = { pending: 0, running: 0, completed: 0, failed: 0, total: this.queue.length };
    for (const t of this.queue) {
      if (t.status === "pending") s.pending++;
      else if (t.status === "running") s.running++;
      else if (t.status === "completed") s.completed++;
      else if (t.status === "failed") s.failed++;
    }
    return s;
  }

  /** Get all tasks */
  getTasks(): QueueTask[] {
    return [...this.queue];
  }

  /** Get task by ID */
  getTask(id: string): QueueTask | undefined {
    return this.queue.find((t) => t.id === id);
  }

  /** Clear completed/failed tasks */
  prune(): number {
    const before = this.queue.length;
    this.queue = this.queue.filter((t) => t.status === "pending" || t.status === "running");
    return before - this.queue.length;
  }

  /** Drain — wait for all tasks to finish */
  async drain(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.queue.every((t) => t.status !== "pending" && t.status !== "running")) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get size(): number {
    return this.queue.length;
  }
}

// ── Scheduler ───────────────────────────────────────────────────────────────

export interface ScheduledJob {
  id: string;
  name: string;
  intervalMs: number;
  execute: () => Promise<void>;
  timerId?: ReturnType<typeof setInterval>;
  lastRun?: number;
  runCount: number;
}

export class JobScheduler {
  private jobs = new Map<string, ScheduledJob>();
  private idCounter = 0;

  /** Schedule a recurring job */
  schedule(name: string, intervalMs: number, execute: () => Promise<void>): string {
    const id = `job_${++this.idCounter}`;
    const job: ScheduledJob = { id, name, intervalMs, execute, runCount: 0 };

    job.timerId = setInterval(async () => {
      job.lastRun = Date.now();
      job.runCount++;
      try { await execute(); } catch (e) { console.error(`[scheduler] ${name} failed:`, e); }
    }, intervalMs);

    this.jobs.set(id, job);
    return id;
  }

  /** Stop a scheduled job */
  stop(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.timerId) clearInterval(job.timerId);
    this.jobs.delete(id);
    return true;
  }

  /** Stop all jobs */
  stopAll(): void {
    for (const job of this.jobs.values()) {
      if (job.timerId) clearInterval(job.timerId);
    }
    this.jobs.clear();
  }

  /** List all active jobs */
  list(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }
}
