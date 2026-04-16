export interface OCRWorkerAPI {
  scanDocument(imageData: ArrayBuffer, language?: string): Promise<{
    text: string;
    fields: Array<{ label: string; value: string; confidence: number }>;
    confidence: number;
  }>;
  terminate(): void;
}

export interface CryptoWorkerAPI {
  encrypt(data: string, publicKey: string): Promise<string>;
  decrypt(ciphertext: string, privateKey: string): Promise<string>;
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  hash(data: string, algorithm?: string): Promise<string>;
}

export interface SearchIndexWorkerAPI {
  indexDocuments(documents: Array<{
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
  }>): Promise<{ indexed: number }>;
  search(query: string, limit?: number): Promise<Array<{
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>>;
  clear(): Promise<void>;
}

export interface AnalyticsBatchWorkerAPI {
  enqueue(event: {
    name: string;
    properties?: Record<string, unknown>;
    timestamp?: number;
  }): Promise<void>;
  flush(): Promise<{ sent: number }>;
  getQueueSize(): Promise<number>;
}

export type WorkerType = "ocr" | "crypto" | "search_index" | "analytics_batch";

const workerInstances = new Map<string, Worker>();

export function createTypedWorker<T>(
  workerUrl: URL,
  workerId: string
): { proxy: T; terminate: () => void } {
  const existing = workerInstances.get(workerId);
  if (existing) {
    existing.terminate();
    workerInstances.delete(workerId);
  }

  const worker = new Worker(workerUrl, { type: "module" });
  workerInstances.set(workerId, worker);

  let callId = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  worker.onmessage = (event) => {
    const { id, result, error } = event.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  };

  const proxy = new Proxy({} as T, {
    get: (_target, prop: string) => {
      return (...args: unknown[]) => {
        return new Promise((resolve, reject) => {
          const id = ++callId;
          pending.set(id, { resolve, reject });
          worker.postMessage({ id, method: prop, args });
        });
      };
    },
  });

  return {
    proxy,
    terminate: () => {
      worker.terminate();
      workerInstances.delete(workerId);
      pending.clear();
    },
  };
}

export function terminateAllWorkers(): void {
  for (const [id, worker] of workerInstances) {
    worker.terminate();
    workerInstances.delete(id);
  }
}
