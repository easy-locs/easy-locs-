/**
 * realtime-monitor — Atomic runtime unit: monitors realtime subscription health.
 * Single responsibility: track active subscriptions, detect stale channels.
 */

export interface RealtimeChannelState {
  channelName: string;
  module: string;
  subscribedAt: string;
  lastEventAt: string | null;
  eventCount: number;
  status: "active" | "stale" | "dead" | "disconnected";
}

const channels = new Map<string, RealtimeChannelState>();
const listeners = new Set<() => void>();
const STALE_THRESHOLD_MS = 60_000;

function notify() { listeners.forEach(fn => fn()); }

export function registerChannel(channelName: string, module: string) {
  channels.set(channelName, {
    channelName, module,
    subscribedAt: new Date().toISOString(),
    lastEventAt: null, eventCount: 0,
    status: "active",
  });
  console.log(`[RT_MONITOR] registered: ${channelName} (${module})`);
  notify();
}

export function recordEvent(channelName: string) {
  const ch = channels.get(channelName);
  if (ch) {
    ch.lastEventAt = new Date().toISOString();
    ch.eventCount++;
    ch.status = "active";
    notify();
  }
}

export function unregisterChannel(channelName: string) {
  channels.delete(channelName);
  notify();
}

export function checkStaleness(): RealtimeChannelState[] {
  const now = Date.now();
  const stale: RealtimeChannelState[] = [];
  for (const ch of channels.values()) {
    if (!ch.lastEventAt) {
      const age = now - new Date(ch.subscribedAt).getTime();
      if (age > STALE_THRESHOLD_MS) {
        ch.status = "stale";
        stale.push(ch);
      }
    } else {
      const age = now - new Date(ch.lastEventAt).getTime();
      if (age > STALE_THRESHOLD_MS * 3) { ch.status = "dead"; stale.push(ch); }
      else if (age > STALE_THRESHOLD_MS) { ch.status = "stale"; stale.push(ch); }
    }
  }
  return stale;
}

export function getAllChannels(): RealtimeChannelState[] {
  return Array.from(channels.values());
}

export function subscribeMonitor(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
