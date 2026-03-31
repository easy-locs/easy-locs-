/**
 * Message Deduplication — Triple-layer dedup for messages and events.
 *
 * Layer 1: By canonical ID (server-assigned)
 * Layer 2: By tempId (optimistic → server reconciliation)
 * Layer 3: By idempotency key (content + context hash)
 */

/** In-memory seen registry with TTL-based eviction */
class DedupRegistry {
  private seen = new Map<string, number>();
  private ttlMs: number;
  private maxSize: number;
  private evictionTimer: ReturnType<typeof setInterval> | null = null;

  constructor(ttlMs = 5 * 60_000, maxSize = 5000) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    this.startEviction();
  }

  isDuplicate(key: string): boolean {
    if (this.seen.has(key)) return true;
    this.seen.set(key, Date.now());
    this.enforceMaxSize();
    return false;
  }

  mark(key: string): void {
    this.seen.set(key, Date.now());
  }

  remove(key: string): void {
    this.seen.delete(key);
  }

  has(key: string): boolean {
    return this.seen.has(key);
  }

  get size(): number {
    return this.seen.size;
  }

  private enforceMaxSize(): void {
    if (this.seen.size <= this.maxSize) return;
    const entries = Array.from(this.seen.entries()).sort((a, b) => a[1] - b[1]);
    const toRemove = entries.slice(0, entries.length - this.maxSize);
    for (const [key] of toRemove) this.seen.delete(key);
  }

  private startEviction(): void {
    this.evictionTimer = setInterval(() => {
      const cutoff = Date.now() - this.ttlMs;
      for (const [key, ts] of this.seen) {
        if (ts < cutoff) this.seen.delete(key);
      }
    }, 60_000);
  }

  destroy(): void {
    if (this.evictionTimer) clearInterval(this.evictionTimer);
    this.seen.clear();
  }
}

/** Layer 1: Server IDs */
export const idRegistry = new DedupRegistry(10 * 60_000, 10000);

/** Layer 2: Temp IDs */
export const tempIdRegistry = new DedupRegistry(5 * 60_000, 2000);

/** Layer 3: Idempotency keys */
export const idempotencyRegistry = new DedupRegistry(2 * 60_000, 3000);

export function isMessageDuplicate(msg: {
  id?: string;
  tempId?: string;
  idempotencyKey?: string;
}): { isDuplicate: boolean; reason?: string } {
  if (msg.id && idRegistry.has(msg.id)) return { isDuplicate: true, reason: "server_id" };
  if (msg.tempId && tempIdRegistry.has(msg.tempId)) return { isDuplicate: true, reason: "temp_id" };
  if (msg.idempotencyKey && idempotencyRegistry.has(msg.idempotencyKey)) return { isDuplicate: true, reason: "idempotency_key" };
  return { isDuplicate: false };
}

export function markMessageSeen(msg: {
  id?: string;
  tempId?: string;
  idempotencyKey?: string;
}): void {
  if (msg.id) idRegistry.mark(msg.id);
  if (msg.tempId) tempIdRegistry.mark(msg.tempId);
  if (msg.idempotencyKey) idempotencyRegistry.mark(msg.idempotencyKey);
}

export function generateIdempotencyKey(userId: string, conversationId: string, tempId: string): string {
  return `msg:${userId}:${conversationId}:${tempId}`;
}

export function reconcileTempToServer(tempId: string, serverId: string): void {
  tempIdRegistry.mark(tempId);
  idRegistry.mark(serverId);
}

export function deduplicateMessages<T extends { id: string; created_at?: string; createdAt?: string }>(messages: T[]): T[] {
  const seen = new Map<string, T>();
  for (const msg of messages) {
    const existing = seen.get(msg.id);
    if (!existing) {
      seen.set(msg.id, msg);
    } else {
      const existingTime = existing.created_at ?? (existing as any).createdAt ?? "";
      const newTime = msg.created_at ?? (msg as any).createdAt ?? "";
      if (newTime > existingTime) seen.set(msg.id, msg);
    }
  }
  return Array.from(seen.values());
}
