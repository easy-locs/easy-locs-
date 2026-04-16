interface TabSyncMessage {
  type: "subscribe" | "publish" | "request_state";
  channel?: string;
  data?: unknown;
}

interface TabSyncBroadcast {
  type: "update";
  channel: string;
  data: unknown;
  sourceTabId: string;
  timestamp: number;
}

const connections: Map<string, MessagePort> = new Map();
const sharedState: Map<string, { data: unknown; timestamp: number }> = new Map();
const subscriptions: Map<string, Set<string>> = new Map();

let tabCounter = 0;

function broadcast(channel: string, data: unknown, sourceTabId: string) {
  const subs = subscriptions.get(channel);
  if (!subs) return;

  const message: TabSyncBroadcast = {
    type: "update",
    channel,
    data,
    sourceTabId,
    timestamp: Date.now(),
  };

  for (const tabId of subs) {
    if (tabId === sourceTabId) continue;
    const port = connections.get(tabId);
    if (port) {
      try {
        port.postMessage(message);
      } catch {
        connections.delete(tabId);
        subs.delete(tabId);
      }
    }
  }
}

function handleMessage(tabId: string, msg: TabSyncMessage) {
  switch (msg.type) {
    case "subscribe": {
      const channel = msg.channel;
      if (!channel) return;
      if (!subscriptions.has(channel)) subscriptions.set(channel, new Set());
      subscriptions.get(channel)!.add(tabId);

      const existing = sharedState.get(channel);
      if (existing) {
        const port = connections.get(tabId);
        if (port) {
          port.postMessage({
            type: "update",
            channel,
            data: existing.data,
            sourceTabId: "shared",
            timestamp: existing.timestamp,
          } satisfies TabSyncBroadcast);
        }
      }
      break;
    }
    case "publish": {
      const channel = msg.channel;
      if (!channel) return;
      sharedState.set(channel, { data: msg.data, timestamp: Date.now() });
      broadcast(channel, msg.data, tabId);
      break;
    }
    case "request_state": {
      const channel = msg.channel;
      if (!channel) return;
      const state = sharedState.get(channel);
      const port = connections.get(tabId);
      if (port && state) {
        port.postMessage({
          type: "update",
          channel,
          data: state.data,
          sourceTabId: "shared",
          timestamp: state.timestamp,
        } satisfies TabSyncBroadcast);
      }
      break;
    }
  }
}

declare const self: SharedWorkerGlobalScope;

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  const tabId = `tab_${++tabCounter}_${Date.now()}`;

  connections.set(tabId, port);

  port.onmessage = (ev: MessageEvent<TabSyncMessage>) => {
    handleMessage(tabId, ev.data);
  };

  port.start();
};
