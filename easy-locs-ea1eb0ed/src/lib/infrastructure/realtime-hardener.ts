/**
 * realtime-hardener — WebSocket reconnection, heartbeat, zombie detection.
 *
 * Wraps Supabase realtime channels with:
 * - Exponential backoff reconnection (1s → 30s cap)
 * - Heartbeat ping every 25s with RTT latency measurement
 * - Zombie channel detection (no events for 3min → auto-reconnect)
 * - Latency metrics per channel (avg/p95)
 * - Connection state machine with event emission
 * - Stored setupFn for proper re-subscription on reconnect
 */

import { db } from "@/services/db";
import {
  registerChannel,
  unregisterChannel,
  recordEvent,
  checkStaleness,
} from "@/lib/runtime/realtime-monitor";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

type SetupFn = (channel: ReturnType<typeof db.channel>) => ReturnType<typeof db.channel>;

interface HardenedChannel {
  name: string;
  module: string;
  state: ConnectionState;
  channel: ReturnType<typeof db.channel> | null;
  setupFn: SetupFn;
  reconnectAttempts: number;
  lastHeartbeatAt: number;
  lastEventAt: number;
  latencyMs: number[];
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  zombieTimer: ReturnType<typeof setInterval> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

interface HardenerConfig {
  heartbeatIntervalMs: number;
  zombieThresholdMs: number;
  maxReconnectAttempts: number;
  reconnectBaseMs: number;
  reconnectMaxMs: number;
  latencySampleSize: number;
}

const DEFAULT_CONFIG: HardenerConfig = {
  heartbeatIntervalMs: 25_000,
  zombieThresholdMs: 180_000,
  maxReconnectAttempts: 15,
  reconnectBaseMs: 1_000,
  reconnectMaxMs: 30_000,
  latencySampleSize: 20,
};

type HardenerEvent = {
  type: "connected" | "disconnected" | "reconnecting" | "error" | "zombie-detected" | "heartbeat-timeout" | "latency-sample";
  channel: string;
  detail?: string;
};

class RealtimeHardener {
  private channels = new Map<string, HardenedChannel>();
  private config: HardenerConfig;
  private listeners = new Set<(event: HardenerEvent) => void>();
  private globalHealthTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<HardenerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  createChannel(
    name: string,
    module: string,
    setupFn: SetupFn,
  ): void {
    if (this.channels.has(name)) {
      this.destroyChannel(name);
    }

    const hc: HardenedChannel = {
      name,
      module,
      state: "disconnected",
      channel: null,
      setupFn,
      reconnectAttempts: 0,
      lastHeartbeatAt: Date.now(),
      lastEventAt: Date.now(),
      latencyMs: [],
      heartbeatTimer: null,
      zombieTimer: null,
      reconnectTimer: null,
    };

    this.channels.set(name, hc);
    this.connect(hc);
  }

  destroyChannel(name: string): void {
    const hc = this.channels.get(name);
    if (!hc) return;

    this.clearTimers(hc);
    if (hc.channel) {
      db.removeChannel(hc.channel);
    }
    unregisterChannel(name);
    this.channels.delete(name);
    this.emit({ type: "disconnected", channel: name });
  }

  destroyAll(): void {
    for (const name of Array.from(this.channels.keys())) {
      this.destroyChannel(name);
    }
    if (this.globalHealthTimer) {
      clearInterval(this.globalHealthTimer);
      this.globalHealthTimer = null;
    }
  }

  getChannelState(name: string): ConnectionState | null {
    return this.channels.get(name)?.state ?? null;
  }

  getLatency(name: string): { avg: number; p95: number; samples: number } | null {
    const hc = this.channels.get(name);
    if (!hc || hc.latencyMs.length === 0) return null;

    const sorted = [...hc.latencyMs].sort((a, b) => a - b);
    const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
    const p95Idx = Math.floor(sorted.length * 0.95);
    return {
      avg,
      p95: sorted[p95Idx] ?? sorted[sorted.length - 1] ?? 0,
      samples: sorted.length,
    };
  }

  getAllStatuses(): Array<{
    name: string;
    module: string;
    state: ConnectionState;
    reconnectAttempts: number;
    latencyAvg: number | null;
  }> {
    return Array.from(this.channels.values()).map((hc) => {
      const lat = this.getLatency(hc.name);
      return {
        name: hc.name,
        module: hc.module,
        state: hc.state,
        reconnectAttempts: hc.reconnectAttempts,
        latencyAvg: lat?.avg ?? null,
      };
    });
  }

  recordEventForChannel(channelName: string): void {
    recordEvent(channelName);
    const hc = this.channels.get(channelName);
    if (hc) {
      hc.lastEventAt = Date.now();
    }
  }

  recordLatencySample(channelName: string, rttMs: number): void {
    const hc = this.channels.get(channelName);
    if (!hc) return;
    hc.latencyMs.push(rttMs);
    if (hc.latencyMs.length > this.config.latencySampleSize) {
      hc.latencyMs.shift();
    }
    this.emit({ type: "latency-sample", channel: channelName, detail: `${rttMs}ms` });
  }

  startGlobalHealthCheck(intervalMs = 60_000): void {
    if (this.globalHealthTimer) return;
    this.globalHealthTimer = setInterval(() => {
      const stale = checkStaleness();
      for (const ch of stale) {
        if (ch.status === "dead") {
          const hc = this.channels.get(ch.channelName);
          if (hc) {
            this.emit({ type: "zombie-detected", channel: ch.channelName });
            this.reconnect(hc);
          }
        }
      }
    }, intervalMs);
  }

  subscribe(fn: (event: HardenerEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private wrapSetupFnWithTracking(hc: HardenedChannel, raw: ReturnType<typeof db.channel>): ReturnType<typeof db.channel> {
    const originalOn = raw.on.bind(raw);
    const self = this;
    raw.on = function (...args: any[]) {
      const callbackIdx = args.length - 1;
      if (typeof args[callbackIdx] === "function") {
        const originalCb = args[callbackIdx];
        args[callbackIdx] = function (...cbArgs: any[]) {
          hc.lastEventAt = Date.now();
          recordEvent(hc.name);
          return originalCb.apply(this, cbArgs);
        };
      }
      return originalOn(...args);
    } as typeof raw.on;
    return hc.setupFn(raw);
  }

  private connect(hc: HardenedChannel): void {
    hc.state = "connecting";

    const raw = db.channel(hc.name);
    const configured = this.wrapSetupFnWithTracking(hc, raw);

    configured.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        hc.state = "connected";
        hc.reconnectAttempts = 0;
        hc.lastHeartbeatAt = Date.now();
        hc.lastEventAt = Date.now();
        registerChannel(hc.name, hc.module);
        this.startHeartbeat(hc);
        this.startZombieDetection(hc);
        this.emit({ type: "connected", channel: hc.name });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        hc.state = "error";
        this.emit({ type: "error", channel: hc.name, detail: status });
        this.scheduleReconnect(hc);
      } else if (status === "CLOSED") {
        hc.state = "disconnected";
        this.emit({ type: "disconnected", channel: hc.name });
        this.scheduleReconnect(hc);
      }
    });

    hc.channel = configured;
  }

  private reconnect(hc: HardenedChannel): void {
    if (hc.state === "reconnecting") return;
    if (!this.channels.has(hc.name)) return;

    this.clearTimers(hc);
    if (hc.channel) {
      try { db.removeChannel(hc.channel); } catch {}
    }
    hc.channel = null;
    hc.state = "reconnecting";
    hc.reconnectAttempts++;
    this.emit({ type: "reconnecting", channel: hc.name, detail: `attempt ${hc.reconnectAttempts}` });

    this.connect(hc);
  }

  private scheduleReconnect(hc: HardenedChannel): void {
    if (hc.reconnectAttempts >= this.config.maxReconnectAttempts) {
      hc.state = "error";
      this.emit({
        type: "error",
        channel: hc.name,
        detail: `Max reconnect attempts (${this.config.maxReconnectAttempts}) exceeded`,
      });
      return;
    }

    this.clearTimers(hc);
    if (hc.channel) {
      try { db.removeChannel(hc.channel); } catch {}
      hc.channel = null;
    }

    const backoff = Math.min(
      this.config.reconnectBaseMs * Math.pow(2, hc.reconnectAttempts),
      this.config.reconnectMaxMs,
    );
    const jitter = Math.random() * backoff * 0.3;

    hc.state = "reconnecting";
    hc.reconnectAttempts++;

    hc.reconnectTimer = setTimeout(() => {
      this.connect(hc);
    }, backoff + jitter);

    this.emit({
      type: "reconnecting",
      channel: hc.name,
      detail: `attempt ${hc.reconnectAttempts}, backoff ${Math.round(backoff + jitter)}ms`,
    });
  }

  private startHeartbeat(hc: HardenedChannel): void {
    if (hc.heartbeatTimer) clearInterval(hc.heartbeatTimer);
    hc.heartbeatTimer = setInterval(() => {
      const pingStart = Date.now();
      const sinceLast = pingStart - hc.lastHeartbeatAt;

      if (sinceLast > this.config.heartbeatIntervalMs * 3) {
        this.emit({ type: "heartbeat-timeout", channel: hc.name });
      }

      if (hc.channel && hc.state === "connected") {
        try {
          hc.channel.send({
            type: "broadcast",
            event: "__heartbeat__",
            payload: { ts: pingStart },
          });
          const rtt = Date.now() - pingStart;
          this.recordLatencySample(hc.name, rtt);
        } catch {}
      }

      hc.lastHeartbeatAt = Date.now();
    }, this.config.heartbeatIntervalMs);
  }

  private startZombieDetection(hc: HardenedChannel): void {
    if (hc.zombieTimer) clearInterval(hc.zombieTimer);
    hc.zombieTimer = setInterval(() => {
      const now = Date.now();
      if (now - hc.lastEventAt > this.config.zombieThresholdMs) {
        this.emit({ type: "zombie-detected", channel: hc.name });
        this.reconnect(hc);
      }
    }, this.config.zombieThresholdMs / 2);
  }

  private clearTimers(hc: HardenedChannel): void {
    if (hc.heartbeatTimer) { clearInterval(hc.heartbeatTimer); hc.heartbeatTimer = null; }
    if (hc.zombieTimer) { clearInterval(hc.zombieTimer); hc.zombieTimer = null; }
    if (hc.reconnectTimer) { clearTimeout(hc.reconnectTimer); hc.reconnectTimer = null; }
  }

  private emit(event: HardenerEvent): void {
    for (const fn of this.listeners) {
      try { fn(event); } catch {}
    }
  }
}

export function trackRealtimeEvent(channelName: string): void {
  realtimeHardener.recordEventForChannel(channelName);
}

export const realtimeHardener = new RealtimeHardener();
