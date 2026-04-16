import type { Remote } from "comlink";
import { createWorkerProxy } from "./worker-rpc";

let workerIdCounter = 0;

interface PooledWorker<T> {
  id: number;
  proxy: Remote<T> & { terminate: () => void };
  busy: boolean;
}

interface WorkerPoolOptions {
  maxWorkers?: number;
  idleTimeoutMs?: number;
  rpcTimeoutMs?: number;
}

type PromisifiedMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};

interface QueuedTask {
  method: string;
  arg: unknown;
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

export class WorkerPool<TMethods extends Record<string, (...args: never[]) => unknown>> {
  private workers: PooledWorker<TMethods>[] = [];
  private queue: QueuedTask[] = [];
  private maxWorkers: number;
  private idleTimeoutMs: number;
  private rpcTimeoutMs: number;
  private idleTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private createWorkerFn: () => Worker;

  constructor(
    createWorkerFn: () => Worker,
    options?: WorkerPoolOptions,
  ) {
    this.createWorkerFn = createWorkerFn;
    this.maxWorkers = options?.maxWorkers ?? Math.min(navigator.hardwareConcurrency || 4, 4);
    this.idleTimeoutMs = options?.idleTimeoutMs ?? 30_000;
    this.rpcTimeoutMs = options?.rpcTimeoutMs ?? 30_000;
  }

  private spawnWorker(): PooledWorker<TMethods> {
    const raw = this.createWorkerFn();
    const proxy = createWorkerProxy<TMethods>(raw);
    const id = ++workerIdCounter;
    const pooled: PooledWorker<TMethods> = { id, proxy, busy: false };
    this.workers.push(pooled);
    return pooled;
  }

  private getAvailableWorker(): PooledWorker<TMethods> | null {
    const idle = this.workers.find((w) => !w.busy);
    if (idle) return idle;
    if (this.workers.length < this.maxWorkers) return this.spawnWorker();
    return null;
  }

  private resetIdleTimer(worker: PooledWorker<TMethods>): void {
    const existing = this.idleTimers.get(worker.id);
    if (existing) clearTimeout(existing);

    if (this.workers.length > 1) {
      this.idleTimers.set(
        worker.id,
        setTimeout(() => {
          const idx = this.workers.findIndex((w) => w.id === worker.id);
          if (idx !== -1 && !this.workers[idx].busy) {
            this.workers[idx].proxy.terminate();
            this.workers.splice(idx, 1);
            this.idleTimers.delete(worker.id);
          }
        }, this.idleTimeoutMs),
      );
    }
  }

  private processQueue(): void {
    while (this.queue.length > 0) {
      const worker = this.getAvailableWorker();
      if (!worker) break;

      const task = this.queue.shift()!;
      worker.busy = true;

      const method = task.method as string & keyof TMethods;

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        worker.busy = false;
        task.reject(new Error(`Worker RPC timeout after ${this.rpcTimeoutMs}ms`));
        this.processQueue();
      }, this.rpcTimeoutMs);

      const callFn = worker.proxy[method] as (...args: unknown[]) => Promise<unknown>;
      callFn(task.arg)
        .then((result: unknown) => {
          if (timedOut) return;
          clearTimeout(timer);
          worker.busy = false;
          this.resetIdleTimer(worker);
          task.resolve(result);
          this.processQueue();
        })
        .catch((err: Error) => {
          if (timedOut) return;
          clearTimeout(timer);
          worker.busy = false;
          this.resetIdleTimer(worker);
          task.reject(err);
          this.processQueue();
        });
    }
  }

  exec<K extends keyof TMethods & string>(
    method: K,
    arg: Parameters<TMethods[K]>[0],
  ): Promise<Awaited<ReturnType<TMethods[K]>>> {
    return new Promise((resolve, reject) => {
      this.queue.push({ method, arg, resolve: resolve as (v: unknown) => void, reject });
      this.processQueue();
    });
  }

  terminateAll(): void {
    for (const timer of this.idleTimers.values()) clearTimeout(timer);
    this.idleTimers.clear();
    for (const w of this.workers) w.proxy.terminate();
    this.workers = [];
    for (const task of this.queue) task.reject(new Error("Pool terminated"));
    this.queue = [];
  }

  get size(): number {
    return this.workers.length;
  }

  get busyCount(): number {
    return this.workers.filter((w) => w.busy).length;
  }

  get queueLength(): number {
    return this.queue.length;
  }
}
