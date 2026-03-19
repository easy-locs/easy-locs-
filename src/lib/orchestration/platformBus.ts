/**
 * PlatformBus — Central event bus for cross-system orchestration.
 */

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventLogEntry {
  id: string;
  event: string;
  payload: unknown;
  createdAt: string;
  source?: string;
}

class PlatformBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private logs: EventLogEntry[] = [];
  private maxLogs = 300;

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler);
      if (this.handlers.get(event)?.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  async emit<T = unknown>(
    event: string,
    payload: T,
    options?: { source?: string }
  ): Promise<void> {
    this.logs.unshift({
      id: crypto.randomUUID(),
      event,
      payload,
      createdAt: new Date().toISOString(),
      source: options?.source,
    });

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    const handlers = Array.from(this.handlers.get(event) ?? []);
    await Promise.allSettled(handlers.map((handler) => handler(payload)));
  }

  getLogs(): EventLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const platformBus = new PlatformBus();
