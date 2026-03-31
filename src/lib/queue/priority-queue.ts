/**
 * Priority Queue Engine — WhatsApp-level message/action priority system.
 * Ensures critical actions (calls, messages) are never blocked by low-priority work.
 */

export type ActionPriority = "realtime" | "high" | "medium" | "low" | "background";

const PRIORITY_ORDER: Record<ActionPriority, number> = {
  realtime: 0,   // call signaling
  high: 1,       // messages
  medium: 2,     // receipts, presence
  low: 3,        // analytics, sync
  background: 4, // cleanup, prefetch
};

interface QueueItem<T = any> {
  id: string;
  priority: ActionPriority;
  payload: T;
  createdAt: number;
  retries: number;
  maxRetries: number;
  execute: () => Promise<void>;
}

class PriorityQueue {
  private items: QueueItem[] = [];
  private processing = false;
  private concurrency = 3;
  private active = 0;

  enqueue(item: QueueItem): void {
    this.items.push(item);
    this.items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    this.flush();
  }

  private async flush(): Promise<void> {
    if (this.processing && this.active >= this.concurrency) return;
    this.processing = true;

    while (this.items.length > 0 && this.active < this.concurrency) {
      const item = this.items.shift();
      if (!item) break;

      this.active++;
      this.processItem(item).finally(() => {
        this.active--;
        if (this.items.length > 0) this.flush();
        else this.processing = false;
      });
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    try {
      await item.execute();
    } catch {
      if (item.retries < item.maxRetries) {
        item.retries++;
        const delay = Math.min(1000 * Math.pow(2, item.retries), 30000);
        setTimeout(() => this.enqueue(item), delay);
      }
    }
  }

  get size(): number { return this.items.length; }
  get activeCount(): number { return this.active; }
  clear(): void { this.items = []; }
}

// Singleton
export const priorityQueue = new PriorityQueue();

// Helpers
export function enqueueAction(
  id: string,
  priority: ActionPriority,
  execute: () => Promise<void>,
  maxRetries = 3,
): void {
  priorityQueue.enqueue({
    id,
    priority,
    payload: null,
    createdAt: Date.now(),
    retries: 0,
    maxRetries,
    execute,
  });
}

/** Priority presets */
export const PRIORITY_PRESETS = {
  callSignaling: "realtime" as ActionPriority,
  message: "high" as ActionPriority,
  receipt: "medium" as ActionPriority,
  presence: "low" as ActionPriority,
  analytics: "background" as ActionPriority,
  prefetch: "background" as ActionPriority,
  mediaUpload: "medium" as ActionPriority,
} as const;
