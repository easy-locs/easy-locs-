type MessageType =
  | "orbit_message"
  | "wallet_balance"
  | "notification_count"
  | "tab_register"
  | "tab_unregister"
  | "state_request"
  | "state_response"
  | "heartbeat"
  | "realtime_subscribe"
  | "realtime_unsubscribe"
  | "realtime_event";

interface CrossTabMessage {
  type: MessageType;
  payload: unknown;
  sourceTabId: string;
  timestamp: number;
}

type MessageHandler = (msg: CrossTabMessage) => void;

class CrossTabClient {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private tabId: string;
  private handlers = new Map<MessageType, Set<MessageHandler>>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  connect(): boolean {
    if (this.connected) return true;
    if (typeof SharedWorker === "undefined") return false;

    try {
      this.worker = new SharedWorker(
        new URL("./cross-tab-sync.ts", import.meta.url),
        { type: "module", name: "easylocs-cross-tab" },
      );
      this.port = this.worker.port;

      this.port.onmessage = (event: MessageEvent<CrossTabMessage>) => {
        this.dispatch(event.data);
      };

      this.port.start();

      this.send("tab_register", null);

      this.heartbeatTimer = setInterval(() => {
        this.send("heartbeat", null);
      }, 15_000);

      this.connected = true;

      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", () => {
          this.disconnect();
        });
      }

      return true;
    } catch {
      return false;
    }
  }

  disconnect(): void {
    if (!this.connected) return;

    this.send("tab_unregister", null);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.port?.close();
    this.port = null;
    this.worker = null;
    this.connected = false;
  }

  send(type: MessageType, payload: unknown): void {
    if (!this.port) return;
    const msg: CrossTabMessage = {
      type,
      payload,
      sourceTabId: this.tabId,
      timestamp: Date.now(),
    };
    try {
      this.port.postMessage(msg);
    } catch {}
  }

  on(type: MessageType, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  requestState(): void {
    this.send("state_request", null);
  }

  broadcastOrbitMessage(message: unknown): void {
    this.send("orbit_message", message);
  }

  broadcastWalletBalance(balance: unknown): void {
    this.send("wallet_balance", balance);
  }

  broadcastNotificationCount(count: number): void {
    this.send("notification_count", count);
  }

  subscribeRealtimeChannel(channel: string): void {
    this.send("realtime_subscribe", { channel });
  }

  unsubscribeRealtimeChannel(channel: string): void {
    this.send("realtime_unsubscribe", { channel });
  }

  broadcastRealtimeEvent(channel: string, event: unknown): void {
    this.send("realtime_event", { channel, event });
  }

  onRealtimeEvent(handler: (channel: string, event: unknown) => void): () => void {
    return this.on("realtime_event", (msg) => {
      const payload = msg.payload as { channel: string; event: unknown };
      handler(payload.channel, payload.event);
    });
  }

  onRealtimeOwnership(handler: (channel: string, isOwner: boolean) => void): () => void {
    return this.on("realtime_subscribe", (msg) => {
      const payload = msg.payload as { channel: string; isOwner: boolean };
      handler(payload.channel, payload.isOwner);
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getTabId(): string {
    return this.tabId;
  }

  private dispatch(msg: CrossTabMessage): void {
    const handlers = this.handlers.get(msg.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(msg);
        } catch {}
      }
    }
  }
}

export const crossTabClient = new CrossTabClient();
export type { CrossTabMessage, MessageType, MessageHandler };
