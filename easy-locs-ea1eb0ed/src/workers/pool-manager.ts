import * as Comlink from "comlink";
import type { CryptoWorkerAPI } from "./crypto.worker";
import type { SearchWorkerAPI } from "./search.worker";
import type { NormalizationWorkerAPI } from "./normalization.worker";
import type { AnalyticsBatchWorkerAPI } from "./analytics-batch.worker";

type WorkerType = "crypto" | "search" | "normalization" | "analytics";

interface ManagedWorker<T> {
  proxy: Comlink.Remote<T>;
  worker: Worker;
  busy: boolean;
  taskCount: number;
}

interface PoolConfig {
  maxWorkersPerType: number;
  idleTimeoutMs: number;
}

const DEFAULT_CONFIG: PoolConfig = {
  maxWorkersPerType: navigator.hardwareConcurrency
    ? Math.max(1, Math.min(navigator.hardwareConcurrency - 1, 4))
    : 2,
  idleTimeoutMs: 30_000,
};

class WorkerPoolManager {
  private pools = new Map<WorkerType, ManagedWorker<unknown>[]>();
  private idleTimers = new Map<WorkerType, ReturnType<typeof setTimeout>>();
  private config: PoolConfig;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private createWorker<T>(type: WorkerType): ManagedWorker<T> {
    let worker: Worker;
    switch (type) {
      case "crypto":
        worker = new Worker(new URL("./crypto.worker.ts", import.meta.url), {
          type: "module",
        });
        break;
      case "search":
        worker = new Worker(new URL("./search.worker.ts", import.meta.url), {
          type: "module",
        });
        break;
      case "normalization":
        worker = new Worker(
          new URL("./normalization.worker.ts", import.meta.url),
          { type: "module" },
        );
        break;
      case "analytics":
        worker = new Worker(
          new URL("./analytics-batch.worker.ts", import.meta.url),
          { type: "module" },
        );
        break;
    }

    const proxy = Comlink.wrap<T>(worker);
    return { proxy, worker, busy: false, taskCount: 0 };
  }

  private getPool<T>(type: WorkerType): ManagedWorker<T>[] {
    if (!this.pools.has(type)) {
      this.pools.set(type, []);
    }
    return this.pools.get(type)! as ManagedWorker<T>[];
  }

  private getLeastBusy<T>(type: WorkerType): ManagedWorker<T> {
    const pool = this.getPool<T>(type);

    const idle = pool.find((w) => !w.busy);
    if (idle) return idle;

    if (pool.length < this.config.maxWorkersPerType) {
      const managed = this.createWorker<T>(type);
      pool.push(managed);
      return managed;
    }

    return pool.reduce((min, w) => (w.taskCount < min.taskCount ? w : min));
  }

  private resetIdleTimer(type: WorkerType): void {
    const existing = this.idleTimers.get(type);
    if (existing) clearTimeout(existing);

    this.idleTimers.set(
      type,
      setTimeout(() => {
        this.shrinkPool(type);
      }, this.config.idleTimeoutMs),
    );
  }

  private shrinkPool(type: WorkerType): void {
    const pool = this.getPool(type);
    const idleWorkers = pool.filter((w) => !w.busy && w.taskCount === 0);
    for (const w of idleWorkers) {
      if (pool.length <= 1) break;
      w.worker.terminate();
      const idx = pool.indexOf(w);
      if (idx !== -1) pool.splice(idx, 1);
    }
  }

  async execute<T, R>(
    type: WorkerType,
    fn: (proxy: Comlink.Remote<T>) => Promise<R>,
  ): Promise<R> {
    const managed = this.getLeastBusy<T>(type);
    managed.busy = true;
    managed.taskCount++;
    this.resetIdleTimer(type);

    try {
      return await fn(managed.proxy);
    } finally {
      managed.taskCount--;
      managed.busy = managed.taskCount > 0;
    }
  }

  terminateAll(): void {
    for (const [type, pool] of this.pools) {
      for (const w of pool) {
        w.worker.terminate();
      }
      pool.length = 0;
      const timer = this.idleTimers.get(type);
      if (timer) clearTimeout(timer);
    }
    this.pools.clear();
    this.idleTimers.clear();
  }

  getStats(): Record<
    string,
    { workers: number; busyWorkers: number; totalTasks: number }
  > {
    const stats: Record<
      string,
      { workers: number; busyWorkers: number; totalTasks: number }
    > = {};
    for (const [type, pool] of this.pools) {
      stats[type] = {
        workers: pool.length,
        busyWorkers: pool.filter((w) => w.busy).length,
        totalTasks: pool.reduce((sum, w) => sum + w.taskCount, 0),
      };
    }
    return stats;
  }
}

export const workerPool = new WorkerPoolManager();
export type { WorkerType, PoolConfig };
