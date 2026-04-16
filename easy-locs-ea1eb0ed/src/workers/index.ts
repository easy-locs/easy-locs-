import { WorkerPool } from "./worker-pool";
import type { SearchWorkerMethods } from "./search.worker";
import type { AnalyticsBatchWorkerMethods } from "./analytics-batch.worker";
import type { DataNormalizeWorkerMethods } from "./data-normalize.worker";
import type { CryptoWorkerMethods } from "./crypto.worker";

let searchPool: WorkerPool<SearchWorkerMethods> | null = null;
let analyticsPool: WorkerPool<AnalyticsBatchWorkerMethods> | null = null;
let dataPool: WorkerPool<DataNormalizeWorkerMethods> | null = null;
let cryptoPool: WorkerPool<CryptoWorkerMethods> | null = null;

function supportsWorkers(): boolean {
  return typeof Worker !== "undefined";
}

export function getSearchPool(): WorkerPool<SearchWorkerMethods> {
  if (!searchPool) {
    if (!supportsWorkers()) {
      throw new Error("Web Workers not supported");
    }
    searchPool = new WorkerPool<SearchWorkerMethods>(
      () => new Worker(new URL("./search.worker.ts", import.meta.url), { type: "module" }),
      { maxWorkers: 2, idleTimeoutMs: 60_000 },
    );
  }
  return searchPool;
}

export function getAnalyticsPool(): WorkerPool<AnalyticsBatchWorkerMethods> {
  if (!analyticsPool) {
    if (!supportsWorkers()) {
      throw new Error("Web Workers not supported");
    }
    analyticsPool = new WorkerPool<AnalyticsBatchWorkerMethods>(
      () => new Worker(new URL("./analytics-batch.worker.ts", import.meta.url), { type: "module" }),
      { maxWorkers: 1, idleTimeoutMs: 120_000 },
    );
  }
  return analyticsPool;
}

export function getDataNormalizePool(): WorkerPool<DataNormalizeWorkerMethods> {
  if (!dataPool) {
    if (!supportsWorkers()) {
      throw new Error("Web Workers not supported");
    }
    dataPool = new WorkerPool<DataNormalizeWorkerMethods>(
      () => new Worker(new URL("./data-normalize.worker.ts", import.meta.url), { type: "module" }),
      { maxWorkers: 2, idleTimeoutMs: 45_000 },
    );
  }
  return dataPool;
}

export function getCryptoPool(): WorkerPool<CryptoWorkerMethods> {
  if (!cryptoPool) {
    if (!supportsWorkers()) {
      throw new Error("Web Workers not supported");
    }
    cryptoPool = new WorkerPool<CryptoWorkerMethods>(
      () => new Worker(new URL("./crypto.worker.ts", import.meta.url), { type: "module" }),
      { maxWorkers: 2, idleTimeoutMs: 60_000 },
    );
  }
  return cryptoPool;
}

export function terminateAllPools(): void {
  searchPool?.terminateAll();
  analyticsPool?.terminateAll();
  dataPool?.terminateAll();
  cryptoPool?.terminateAll();
  searchPool = null;
  analyticsPool = null;
  dataPool = null;
  cryptoPool = null;
}

export function getPoolStats(): Record<string, { size: number; busy: number; queued: number }> {
  return {
    search: {
      size: searchPool?.size ?? 0,
      busy: searchPool?.busyCount ?? 0,
      queued: searchPool?.queueLength ?? 0,
    },
    analytics: {
      size: analyticsPool?.size ?? 0,
      busy: analyticsPool?.busyCount ?? 0,
      queued: analyticsPool?.queueLength ?? 0,
    },
    dataNormalize: {
      size: dataPool?.size ?? 0,
      busy: dataPool?.busyCount ?? 0,
      queued: dataPool?.queueLength ?? 0,
    },
    crypto: {
      size: cryptoPool?.size ?? 0,
      busy: cryptoPool?.busyCount ?? 0,
      queued: cryptoPool?.queueLength ?? 0,
    },
  };
}
