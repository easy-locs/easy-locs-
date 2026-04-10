/**
 * Ultra Stream Flow Core — Conversation-keyed serial queue + version control.
 * Ensures: 1 conversation = 1 serial queue → 0 race conditions.
 */

// ── Serial Queue (per conversation) ──
const queues = new Map<string, Promise<any>>();

export function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(task);
  queues.set(key, next);
  // Cleanup after resolution
  next.finally(() => {
    if (queues.get(key) === next) queues.delete(key);
  });
  return next as Promise<T>;
}

// ── Flow ID (unique per action instance) ──
let flowCounter = 0;
export function createFlowId(entry: string, ctx?: string): string {
  return `${entry}:${ctx || "global"}:${++flowCounter}:${Date.now().toString(36)}`;
}

// ── Version Control (last-writer-wins with monotonic version) ──
export function applyVersion<T extends { version?: number }>(
  current: T | null,
  incoming: T,
): T {
  if (!current) return incoming;
  if ((incoming.version ?? 0) > (current.version ?? 0)) return incoming;
  return current;
}

// ── Queue Stats (for observability) ──
export function getQueueDepth(key: string): number {
  return queues.has(key) ? 1 : 0;
}

export function getActiveQueues(): string[] {
  return Array.from(queues.keys());
}
