/**
 * realtime.ts — Central realtime channel factory with hardened connections.
 * Single entry point for all Supabase realtime subscriptions.
 * UI/hooks must import from here, never from supabase client directly.
 *
 * Integrates with realtime-hardener for automatic reconnection,
 * heartbeat monitoring, zombie detection, and latency tracking.
 *
 * Cross-tab multiplexing: When SharedWorker is available, only the
 * "owner" tab opens the actual Supabase Realtime WebSocket connection.
 * Non-owner tabs skip opening a direct channel and instead receive
 * events relayed via the SharedWorker. When a tab becomes the new
 * owner (e.g. after the previous owner tab closes), it opens a fresh
 * Supabase channel and begins relaying to other tabs.
 */
import { db as supabase } from "@/services/db";
import { realtimeHardener, trackRealtimeEvent } from "@/lib/infrastructure/realtime-hardener";

let crossTabClientPromise: Promise<typeof import("@/workers/cross-tab-client") | null> | null = null;

function getCrossTabClient() {
  if (!crossTabClientPromise) {
    crossTabClientPromise = import("@/workers/cross-tab-client").catch(() => null);
  }
  return crossTabClientPromise;
}

const ownedChannels = new Map<string, ReturnType<typeof supabase.channel>>();
const pendingChannels = new Map<string, {
  opts?: any;
  setupFn?: (channel: ReturnType<typeof supabase.channel>) => ReturnType<typeof supabase.channel>;
  listeners: Array<(event: unknown) => void>;
  isOwner: boolean;
}>();

function activateOwnedChannel(channelName: string) {
  const pending = pendingChannels.get(channelName);
  if (!pending || ownedChannels.has(channelName)) return;

  let channel = supabase.channel(channelName, pending.opts);
  ownedChannels.set(channelName, channel);

  if (pending.setupFn) {
    channel = pending.setupFn(channel);
    ownedChannels.set(channelName, channel);
  }

  for (const listener of pending.listeners) {
    channel.on("broadcast" as any, {}, (payload: unknown) => {
      try { listener(payload); } catch {}
    });
  }

  channel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      broadcastRealtimeToTabs(channelName, { type: "channel_ready", channel: channelName });
    }
  });
}

function initOwnershipListener() {
  getCrossTabClient().then((mod) => {
    if (!mod) return;
    const client = mod.crossTabClient;
    if (!client.isConnected()) return;

    client.onRealtimeOwnership((channelName, isOwner) => {
      const pending = pendingChannels.get(channelName);
      if (!pending) return;
      pending.isOwner = isOwner;

      if (isOwner) {
        activateOwnedChannel(channelName);
      } else {
        const existing = ownedChannels.get(channelName);
        if (existing) {
          supabase.removeChannel(existing);
          ownedChannels.delete(channelName);
        }
      }
    });

    client.onRealtimeEvent((channelName, event) => {
      const pending = pendingChannels.get(channelName);
      if (pending) {
        for (const listener of pending.listeners) {
          try { listener(event); } catch {}
        }
      }
    });
  }).catch(() => {});
}

let ownershipListenerInit = false;

export function createRealtimeChannel(name: string, opts?: any) {
  if (!pendingChannels.has(name)) {
    pendingChannels.set(name, { opts, listeners: [], isOwner: false });
  }

  getCrossTabClient().then((mod) => {
    if (!mod || !mod.crossTabClient.isConnected()) {
      const pending = pendingChannels.get(name);
      if (pending) pending.isOwner = true;
      activateOwnedChannel(name);
      return;
    }

    if (!ownershipListenerInit) {
      ownershipListenerInit = true;
      initOwnershipListener();
    }

    mod.crossTabClient.subscribeRealtimeChannel(name);
  }).catch(() => {
    const pending = pendingChannels.get(name);
    if (pending) pending.isOwner = true;
    activateOwnedChannel(name);
  });

  return {
    get topic() { return name; },
    on(type: string, filter: any, callback: (payload: any) => void) {
      const ch = ownedChannels.get(name);
      if (ch) return ch.on(type as any, filter, callback);

      const pending = pendingChannels.get(name);
      if (pending) {
        pending.listeners.push(callback);
      }
      return this;
    },
    subscribe(callback?: (status: string, err?: Error) => void) {
      const ch = ownedChannels.get(name);
      if (ch) return ch.subscribe(callback);
      return this;
    },
    unsubscribe() {
      const ch = ownedChannels.get(name);
      if (ch) return ch.unsubscribe();
      return Promise.resolve("ok");
    },
  };
}

export function createHardenedChannel(
  name: string,
  module: string,
  setupFn: (channel: ReturnType<typeof supabase.channel>) => ReturnType<typeof supabase.channel>,
): void {
  realtimeHardener.createChannel(name, module, setupFn);
}

export function removeRealtimeChannel(channel: any) {
  const topic = (channel?.topic ?? channel?.name) as string | undefined;

  if (topic) {
    const existing = ownedChannels.get(topic);
    if (existing) {
      supabase.removeChannel(existing);
      ownedChannels.delete(topic);
    }
    pendingChannels.delete(topic);
  }

  getCrossTabClient().then((mod) => {
    if (!mod) return;
    const client = mod.crossTabClient;
    if (!client.isConnected()) return;
    if (topic) {
      client.unsubscribeRealtimeChannel(topic);
    }
  }).catch(() => {});
}

export function removeHardenedChannel(name: string): void {
  realtimeHardener.destroyChannel(name);
}

export function broadcastRealtimeToTabs(channelName: string, event: unknown): void {
  getCrossTabClient().then((mod) => {
    if (!mod) return;
    const client = mod.crossTabClient;
    if (client.isConnected()) {
      client.broadcastRealtimeEvent(channelName, event);
    }
  }).catch(() => {});
}

export function onCrossTabRealtimeEvent(channelName: string, listener: (event: unknown) => void): () => void {
  const pending = pendingChannels.get(channelName);
  if (pending) {
    pending.listeners.push(listener);
    return () => {
      const idx = pending.listeners.indexOf(listener);
      if (idx !== -1) pending.listeners.splice(idx, 1);
    };
  }

  pendingChannels.set(channelName, { listeners: [listener], isOwner: false });
  return () => {
    const p = pendingChannels.get(channelName);
    if (p) {
      const idx = p.listeners.indexOf(listener);
      if (idx !== -1) p.listeners.splice(idx, 1);
    }
  };
}

export { trackRealtimeEvent };
