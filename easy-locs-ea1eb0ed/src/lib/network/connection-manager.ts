export type ConnectionState = "online" | "offline" | "reconnecting";

export type ConnectionType = "wifi" | "cellular" | "ethernet" | "none" | "unknown";

export type CellularGeneration = "2g" | "3g" | "4g" | "5g" | "unknown";

interface NetworkInformationApi {
  effectiveType?: string;
  type?: string;
}

function detectCellularGeneration(): CellularGeneration {
  const nav = navigator as Navigator & { connection?: NetworkInformationApi; mozConnection?: NetworkInformationApi; webkitConnection?: NetworkInformationApi };
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (!conn?.effectiveType) return "unknown";
  switch (conn.effectiveType) {
    case "slow-2g":
    case "2g": return "2g";
    case "3g": return "3g";
    case "4g": return "4g";
    default: return "unknown";
  }
}

export interface ConnectionInfo {
  state: ConnectionState;
  type: ConnectionType;
  cellularGeneration?: CellularGeneration;
  native: boolean;
}

type ConnectionListener = (state: ConnectionState, info?: ConnectionInfo) => void;

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}

function isNative(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

class ConnectionManager {
  private state: ConnectionState = navigator.onLine ? "online" : "offline";
  private connectionType: ConnectionType = "unknown";
  private usingNative = false;
  private listeners = new Set<ConnectionListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private maxBackoffMs = 30000;
  private pingUrl = "/";
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private nativeCleanup: (() => void) | null = null;
  private webInitialized = false;

  constructor() {
    if (typeof window === "undefined") return;
    this.initListeners();
  }

  private async initListeners(): Promise<void> {
    if (isNative()) {
      await this.initNativeNetwork();
    }

    if (!this.usingNative && !this.webInitialized) {
      this.initWebNetwork();
    }
  }

  private async initNativeNetwork(): Promise<void> {
    try {
      const { Network } = await import("@capacitor/network");

      const status = await Network.getStatus();
      this.usingNative = true;
      this.applyNetworkStatus(status.connected, this.mapConnectionType(status.connectionType));

      const handle = await Network.addListener("networkStatusChange", (status) => {
        this.applyNetworkStatus(status.connected, this.mapConnectionType(status.connectionType));
      });

      this.nativeCleanup = () => handle.remove();
    } catch (e) {
      console.warn("[connection-manager] Native network plugin failed, using web fallback:", e);
      if (!this.webInitialized) {
        this.initWebNetwork();
      }
    }
  }

  private mapConnectionType(type: string): ConnectionType {
    switch (type) {
      case "wifi": return "wifi";
      case "cellular": return "cellular";
      case "ethernet": return "ethernet";
      case "none": return "none";
      default: return "unknown";
    }
  }

  private applyNetworkStatus(connected: boolean, type: ConnectionType): void {
    this.connectionType = type;
    if (connected) {
      this.backoffMs = 1000;
      this.setState("online");
    } else {
      this.setState("offline");
      this.scheduleReconnect();
    }
  }

  private initWebNetwork(): void {
    if (this.webInitialized) return;
    this.webInitialized = true;
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());
    this.startHeartbeat();
  }

  private handleOnline(): void {
    this.backoffMs = 1000;
    this.setState("online");
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
    const info = this.getConnectionInfo();
    for (const fn of this.listeners) {
      try { fn(this.state, info); } catch {}
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.setState("reconnecting");
    this.reconnectTimer = setTimeout(async () => {
      if (this.usingNative) {
        try {
          const { Network } = await import("@capacitor/network");
          const status = await Network.getStatus();
          if (status.connected) {
            this.applyNetworkStatus(true, this.mapConnectionType(status.connectionType));
            return;
          }
        } catch {}
      } else if (navigator.onLine) {
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

  getState(): ConnectionState { return this.state; }
  isOnline(): boolean { return this.state === "online"; }

  getConnectionType(): ConnectionType { return this.connectionType; }

  isUsingNative(): boolean { return this.usingNative; }

  getConnectionInfo(): ConnectionInfo {
    return {
      state: this.state,
      type: this.connectionType,
      cellularGeneration: this.connectionType === "cellular" ? detectCellularGeneration() : undefined,
      native: this.usingNative,
    };
  }

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
    if (this.nativeCleanup) this.nativeCleanup();
    this.listeners.clear();
  }
}

export const connectionManager = new ConnectionManager();
