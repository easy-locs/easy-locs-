/**
 * Connection Manager — Centralized network state with reconnection logic.
 * Single source of truth for online/offline/reconnecting state.
 */

export type ConnectionState = "online" | "offline" | "reconnecting";

type ConnectionListener = (state: ConnectionState) => void;

class ConnectionManager {
  private state: ConnectionState = navigator.onLine ? "online" : "offline";
  private listeners = new Set<ConnectionListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private maxBackoffMs = 30000;
  private pingUrl = "/";
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());
    // Start heartbeat
    this.startHeartbeat();
  }

  private handleOnline(): void {
    this.backoffMs = 1000;
    this.setState("online");
    this.notify();
  }

  private handleOffline(): void {
    this.setState("offline");
    this.scheduleReconnect();
  }

  private setState(s: ConnectionState): void {
    if (this.state === s) return;
    this.state = s;
    this.notify();
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try { fn(this.state); } catch {}
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.setState("reconnecting");
    this.reconnectTimer = setTimeout(async () => {
      if (navigator.onLine) {
        try {
          await fetch(this.pingUrl, { method: "HEAD", mode: "no-cors", cache: "no-store" });
          this.handleOnline();
          return;
        } catch {}
      }
      this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
      this.scheduleReconnect();
    }, this.backoffMs);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.state === "online" && !navigator.onLine) {
        this.handleOffline();
      }
    }, 10000);
  }

  // Public API
  getState(): ConnectionState { return this.state; }
  isOnline(): boolean { return this.state === "online"; }

  subscribe(fn: ConnectionListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onReconnect(fn: () => void): () => void {
    const wrapper: ConnectionListener = (s) => { if (s === "online") fn(); };
    return this.subscribe(wrapper);
  }

  destroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.listeners.clear();
  }
}

// Singleton
export const connectionManager = new ConnectionManager();
