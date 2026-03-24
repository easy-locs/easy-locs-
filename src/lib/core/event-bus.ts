/**
 * Core Event Bus — async-capable, multi-handler, decoupled event system.
 * All platform events flow through here: notifications, analytics, ranking, CRM, AI feedback.
 */

type EventPayload = Record<string, any>;
type EventHandler = (payload: EventPayload) => Promise<void> | void;

class EventBus {
  private handlers: Record<string, EventHandler[]> = {};

  on(event: string, handler: EventHandler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  off(event: string, handler: EventHandler) {
    const arr = this.handlers[event];
    if (!arr) return;
    const idx = arr.indexOf(handler);
    if (idx >= 0) arr.splice(idx, 1);
  }

  async emit(event: string, payload: EventPayload) {
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
