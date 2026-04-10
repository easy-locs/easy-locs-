/**
 * Offline Queue — Crash-safe action persistence.
 * Queues failed/offline actions and auto-flushes when connection resumes.
 *
 * Uses in-memory queue + localStorage backup for crash safety.
 */

export interface OfflineTask {
  id: string;
  type: string;
  payload: any;
  createdAt: number;
  retries: number;
}

const STORAGE_KEY = "orbit_offline_queue";
const MAX_RETRIES = 5;

class OfflineQueue {
  private queue: OfflineTask[] = [];
  private flushing = false;
  private executor: ((task: OfflineTask) => Promise<void>) | null = null;

  constructor() {
    this.restore();
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.flush());
    }
  }

  setExecutor(fn: (task: OfflineTask) => Promise<void>): void {
    this.executor = fn;
  }

  enqueue(type: string, payload: any): string {
    const task: OfflineTask = {
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      payload,
      createdAt: Date.now(),
      retries: 0,
    };
    this.queue.push(task);
    this.persist();

    // Try immediate flush if online
    if (navigator.onLine) this.flush();

    return task.id;
  }

  async flush(): Promise<void> {
    if (this.flushing || !this.executor || this.queue.length === 0) return;
    this.flushing = true;

    while (this.queue.length > 0) {
      const task = this.queue[0];
      try {
        await this.executor(task);
        this.queue.shift();
        this.persist();
      } catch {
        task.retries++;
        if (task.retries >= MAX_RETRIES) {
          console.error(`[offline-queue] Task ${task.id} failed ${MAX_RETRIES} times, dropping.`);
          this.queue.shift();
          this.persist();
        } else {
          // Backoff and stop flushing
          break;
        }
      }
    }

    this.flushing = false;
  }

  get pending(): number {
    return this.queue.length;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage full or unavailable
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.queue = JSON.parse(raw);
    } catch {
      this.queue = [];
    }
  }
}

export const offlineQueue = new OfflineQueue();
