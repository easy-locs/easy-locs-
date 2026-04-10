type RuntimeErrorEntry = {
  scope: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

export type { RuntimeErrorEntry };

const listeners = new Set<(entry: RuntimeErrorEntry) => void>();

export function emitRuntimeError(entry: RuntimeErrorEntry) {
  for (const listener of listeners) {
    try { listener(entry); } catch {}
  }
  console.error("[RUNTIME_ERROR]", entry);
}

export function onRuntimeError(listener: (entry: RuntimeErrorEntry) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
