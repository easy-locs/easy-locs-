type TabSyncListener = (data: unknown, sourceTabId: string) => void;

interface TabSyncBroadcast {
  type: "update";
  channel: string;
  data: unknown;
  sourceTabId: string;
  timestamp: number;
}

class CrossTabSync {
  private port: MessagePort | null = null;
  private listeners = new Map<string, Set<TabSyncListener>>();
  private fallbackChannel: BroadcastChannel | null = null;
  private mode: "shared-worker" | "broadcast-channel" | "none" = "none";
  private initialized = false;
  private pendingSubscriptions = new Set<string>();

  init(): void {
    if (typeof window === "undefined") return;
    if (this.initialized) return;

    if (typeof SharedWorker !== "undefined") {
      try {
        const worker = new SharedWorker(
          new URL("../workers/shared-tab-sync.worker.ts", import.meta.url),
          { type: "module", name: "easylocs-tab-sync" },
        );
        this.port = worker.port;
        this.port.onmessage = (e: MessageEvent<TabSyncBroadcast>) => {
          this.handleMessage(e.data);
        };
        this.port.start();
        this.mode = "shared-worker";
        this.replayPendingSubscriptions();
        this.initialized = true;
        return;
      } catch {
        // fallback
      }
    }

    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.fallbackChannel = new BroadcastChannel("easylocs-tab-sync");
        this.fallbackChannel.onmessage = (e: MessageEvent<TabSyncBroadcast>) => {
          this.handleMessage(e.data);
        };
        this.mode = "broadcast-channel";
        this.initialized = true;
        return;
      } catch {
        // fallback
      }
    }

    this.mode = "none";
    this.initialized = true;
  }

  private replayPendingSubscriptions(): void {
    if (this.mode !== "shared-worker" || !this.port) return;
    for (const channel of this.pendingSubscriptions) {
      this.port.postMessage({ type: "subscribe", channel });
    }
    this.pendingSubscriptions.clear();
  }

  private handleMessage(msg: TabSyncBroadcast): void {
    if (msg.type !== "update") return;
    const subs = this.listeners.get(msg.channel);
    if (!subs) return;
    for (const fn of subs) {
      try {
        fn(msg.data, msg.sourceTabId);
      } catch {
        // swallow listener errors
      }
    }
  }

  subscribe(channel: string, listener: TabSyncListener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);

    if (this.mode === "shared-worker" && this.port) {
      this.port.postMessage({ type: "subscribe", channel });
    } else if (!this.initialized) {
      this.pendingSubscriptions.add(channel);
    }

    return () => {
      this.listeners.get(channel)?.delete(listener);
      if (this.listeners.get(channel)?.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  publish(channel: string, data: unknown): void {
    if (this.mode === "shared-worker" && this.port) {
      this.port.postMessage({ type: "publish", channel, data });
    } else if (this.mode === "broadcast-channel" && this.fallbackChannel) {
      const msg: TabSyncBroadcast = {
        type: "update",
        channel,
        data,
        sourceTabId: "self",
        timestamp: Date.now(),
      };
      this.fallbackChannel.postMessage(msg);
    }
  }

  requestState(channel: string): void {
    if (this.mode === "shared-worker" && this.port) {
      this.port.postMessage({ type: "request_state", channel });
    } else if (this.mode === "broadcast-channel" && this.fallbackChannel) {
      try {
        const stored = sessionStorage.getItem(`tab-sync:${channel}`);
        if (stored) {
          const parsed = JSON.parse(stored) as { data: unknown; timestamp: number };
          this.handleMessage({
            type: "update",
            channel,
            data: parsed.data,
            sourceTabId: "session-restore",
            timestamp: parsed.timestamp,
          });
        }
      } catch {
        // session storage unavailable
      }
    }
  }

  destroy(): void {
    if (this.port) this.port.close();
    if (this.fallbackChannel) this.fallbackChannel.close();
    this.listeners.clear();
    this.pendingSubscriptions.clear();
    this.port = null;
    this.fallbackChannel = null;
    this.mode = "none";
    this.initialized = false;
  }

  get syncMode(): string {
    return this.mode;
  }
}

export const crossTabSync = new CrossTabSync();

export const TAB_SYNC_CHANNELS = {
  ORBIT_UNREAD: "orbit:unread",
  WALLET_BALANCE: "wallet:balance",
  NOTIFICATION_COUNT: "notifications:count",
  AUTH_STATE: "auth:state",
} as const;
