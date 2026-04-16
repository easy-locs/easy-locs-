type MutexRelease = () => void;

interface MutexWaiter {
  resolve: (release: MutexRelease) => void;
  acquiredAt?: number;
}

class ResourceMutex {
  private locks = new Map<string, { holder: string; acquiredAt: number }>();
  private waitQueues = new Map<string, MutexWaiter[]>();
  private readonly maxWaitMs: number;

  constructor(maxWaitMs = 10_000) {
    this.maxWaitMs = maxWaitMs;
  }

  async acquire(resourceKey: string, holderId?: string): Promise<MutexRelease> {
    const id = holderId ?? `mutex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (!this.locks.has(resourceKey)) {
      this.locks.set(resourceKey, { holder: id, acquiredAt: Date.now() });
      return () => this.release(resourceKey, id);
    }

    return new Promise<MutexRelease>((resolve, reject) => {
      if (!this.waitQueues.has(resourceKey)) {
        this.waitQueues.set(resourceKey, []);
      }
      const waiter: MutexWaiter = { resolve };
      this.waitQueues.get(resourceKey)!.push(waiter);

      const timeout = setTimeout(() => {
        const queue = this.waitQueues.get(resourceKey);
        if (queue) {
          const idx = queue.indexOf(waiter);
          if (idx >= 0) queue.splice(idx, 1);
        }
        reject(new Error(`Mutex timeout for resource "${resourceKey}" after ${this.maxWaitMs}ms`));
      }, this.maxWaitMs);

      const originalResolve = waiter.resolve;
      waiter.resolve = (release) => {
        clearTimeout(timeout);
        originalResolve(release);
      };
    });
  }

  private release(resourceKey: string, holderId: string): void {
    const lock = this.locks.get(resourceKey);
    if (!lock || lock.holder !== holderId) return;

    const queue = this.waitQueues.get(resourceKey);
    if (queue && queue.length > 0) {
      const next = queue.shift()!;
      const nextId = `mutex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.locks.set(resourceKey, { holder: nextId, acquiredAt: Date.now() });
      next.resolve(() => this.release(resourceKey, nextId));
    } else {
      this.locks.delete(resourceKey);
    }
  }

  isLocked(resourceKey: string): boolean {
    return this.locks.has(resourceKey);
  }

  getStats(): { activeLocks: number; waitingCount: number } {
    let waitingCount = 0;
    for (const queue of this.waitQueues.values()) {
      waitingCount += queue.length;
    }
    return { activeLocks: this.locks.size, waitingCount };
  }
}

export const menuItemsMutex = new ResourceMutex(5_000);
export const merchantStatusMutex = new ResourceMutex(5_000);
export const qualityScoreMutex = new ResourceMutex(5_000);

export function acquireTableLock(table: "menu_items" | "merchant_status" | "quality_scores", entityId: string): Promise<MutexRelease> {
  const key = `${table}:${entityId}`;
  switch (table) {
    case "menu_items": return menuItemsMutex.acquire(key);
    case "merchant_status": return merchantStatusMutex.acquire(key);
    case "quality_scores": return qualityScoreMutex.acquire(key);
  }
}

export function isTableLocked(table: "menu_items" | "merchant_status" | "quality_scores", entityId: string): boolean {
  const key = `${table}:${entityId}`;
  switch (table) {
    case "menu_items": return menuItemsMutex.isLocked(key);
    case "merchant_status": return merchantStatusMutex.isLocked(key);
    case "quality_scores": return qualityScoreMutex.isLocked(key);
  }
}

const ALLOWED_TABLES = new Set(["menu_items", "merchant_status", "quality_scores", "wallet_transactions", "bookings", "orders"]);

export function getAdvisoryLockSQL(table: string, entityId: string): string {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`[resource-mutex] Advisory lock denied for unknown table: ${table}`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(entityId)) {
    throw new Error(`[resource-mutex] Advisory lock denied: invalid entityId format`);
  }
  return `SELECT pg_advisory_xact_lock(hashtext('${table}:${entityId}'))`;
}
