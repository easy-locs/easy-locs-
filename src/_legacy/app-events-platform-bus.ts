import type { AppEvent } from "./app-events";

type Listener<T extends AppEvent["type"]> = (
  event: Extract<AppEvent, { type: T }>
) => void;

class PlatformBus {
  private listeners = new Map<string, Set<(event: AppEvent) => void>>();

  emit(event: AppEvent) {
    const bucket = this.listeners.get(event.type);
    if (!bucket) return;
    for (const listener of bucket) {
      listener(event);
    }
  }

  on<T extends AppEvent["type"]>(type: T, listener: Listener<T>) {
    const bucket = this.listeners.get(type) ?? new Set<(event: AppEvent) => void>();
    const wrapped = listener as unknown as (event: AppEvent) => void;
    bucket.add(wrapped);
    this.listeners.set(type, bucket);
    return () => {
      const current = this.listeners.get(type);
      current?.delete(wrapped);
      if (current && current.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  clear() {
    this.listeners.clear();
  }
}

export const platformBus = new PlatformBus();
