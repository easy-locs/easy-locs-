/**
 * Core Event Bus — async-capable, multi-handler, decoupled event system.
 * V4: Typed emit/on overloads via CanonicalEventMap.
 * Untyped string fallback preserved for migration safety.
 */

import type { CanonicalEventMap, CanonicalEventName } from "@/lib/events/event-payload-schemas";

type EventPayload = Record<string, any>;
type EventHandler<T = EventPayload> = (payload: T) => Promise<void> | void;

class EventBus {
  private handlers: Record<string, EventHandler<any>[]> = {};

  /** Typed overload — enforced for canonical events */
  on<K extends CanonicalEventName>(event: K, handler: EventHandler<CanonicalEventMap[K]>): void;
  /** Untyped fallback — for legacy/transitional events */
  on(event: string, handler: EventHandler): void;
  on(event: string, handler: EventHandler<any>) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  off(event: string, handler: EventHandler<any>) {
    const arr = this.handlers[event];
    if (!arr) return;
    const idx = arr.indexOf(handler);
    if (idx >= 0) arr.splice(idx, 1);
  }

  /** Typed overload — enforced for canonical events */
  async emit<K extends CanonicalEventName>(event: K, payload: CanonicalEventMap[K]): Promise<void>;
  /** Untyped fallback — for legacy/transitional events */
  async emit(event: string, payload: EventPayload): Promise<void>;
  async emit(event: string, payload: any) {
    const handlers = this.handlers[event] || [];
    if (import.meta.env.DEV) {
      console.log(`[event] ${event}`, payload);
    }
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (e) {
        console.error(`[event] handler error for ${event}`, e);
      }
    }
  }
}

export const eventBus = new EventBus();
