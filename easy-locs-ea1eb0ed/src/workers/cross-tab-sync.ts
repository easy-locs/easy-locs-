const CHANNEL_NAME = "easylocs-cross-tab";

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

interface TabInfo {
  id: string;
  lastSeen: number;
  port: MessagePort;
}

const tabs = new Map<string, TabInfo>();
let sharedState: Record<string, unknown> = {
  unreadMessages: 0,
  walletBalance: null,
  notificationCount: 0,
  lastOrbitMessage: null,
};

interface RealtimeChannelOwnership {
  ownerTabId: string;
  subscriberTabIds: Set<string>;
}
const realtimeChannels = new Map<string, RealtimeChannelOwnership>();

let broadcastChannel: BroadcastChannel | null = null;

try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel not available
}

function broadcastToAll(message: CrossTabMessage, excludeTabId?: string): void {
  for (const [tabId, tab] of tabs) {
    if (tabId === excludeTabId) continue;
    try {
      tab.port.postMessage(message);
    } catch {
      tabs.delete(tabId);
    }
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch {}
  }
}

function handleMessage(tabId: string, msg: CrossTabMessage): void {
  switch (msg.type) {
    case "orbit_message":
      sharedState.lastOrbitMessage = msg.payload;
      sharedState.unreadMessages =
        (sharedState.unreadMessages as number) + 1;
      broadcastToAll(
        {
          type: "orbit_message",
          payload: msg.payload,
          sourceTabId: tabId,
          timestamp: Date.now(),
        },
        tabId,
      );
      break;

    case "wallet_balance":
      sharedState.walletBalance = msg.payload;
      broadcastToAll(
        {
          type: "wallet_balance",
          payload: msg.payload,
          sourceTabId: tabId,
          timestamp: Date.now(),
        },
        tabId,
      );
      break;

    case "notification_count":
      sharedState.notificationCount = msg.payload;
      broadcastToAll(
        {
          type: "notification_count",
          payload: msg.payload,
          sourceTabId: tabId,
          timestamp: Date.now(),
        },
        tabId,
      );
      break;

    case "state_request": {
      const tab = tabs.get(tabId);
      if (tab) {
        tab.port.postMessage({
          type: "state_response",
          payload: sharedState,
          sourceTabId: "shared-worker",
          timestamp: Date.now(),
        });
      }
      break;
    }

    case "heartbeat": {
      const existing = tabs.get(tabId);
      if (existing) {
        existing.lastSeen = Date.now();
      }
      break;
    }

    case "realtime_subscribe": {
      const channelName = (msg.payload as { channel: string }).channel;
      const existing2 = realtimeChannels.get(channelName);
      if (existing2) {
        existing2.subscriberTabIds.add(tabId);
        const tab = tabs.get(tabId);
        if (tab) {
          tab.port.postMessage({
            type: "realtime_subscribe",
            payload: { channel: channelName, isOwner: false },
            sourceTabId: "shared-worker",
            timestamp: Date.now(),
          });
        }
      } else {
        realtimeChannels.set(channelName, {
          ownerTabId: tabId,
          subscriberTabIds: new Set([tabId]),
        });
        const tab = tabs.get(tabId);
        if (tab) {
          tab.port.postMessage({
            type: "realtime_subscribe",
            payload: { channel: channelName, isOwner: true },
            sourceTabId: "shared-worker",
            timestamp: Date.now(),
          });
        }
      }
      break;
    }

    case "realtime_unsubscribe": {
      const channelName2 = (msg.payload as { channel: string }).channel;
      const ownership = realtimeChannels.get(channelName2);
      if (ownership) {
        ownership.subscriberTabIds.delete(tabId);
        if (ownership.subscriberTabIds.size === 0) {
          realtimeChannels.delete(channelName2);
        } else if (ownership.ownerTabId === tabId) {
          const newOwner = ownership.subscriberTabIds.values().next().value;
          if (newOwner) {
            ownership.ownerTabId = newOwner;
            const ownerTab = tabs.get(newOwner);
            if (ownerTab) {
              ownerTab.port.postMessage({
                type: "realtime_subscribe",
                payload: { channel: channelName2, isOwner: true },
                sourceTabId: "shared-worker",
                timestamp: Date.now(),
              });
            }
          }
        }
      }
      break;
    }

    case "realtime_event": {
      const eventPayload = msg.payload as { channel: string; event: unknown };
      const ownership2 = realtimeChannels.get(eventPayload.channel);
      if (ownership2) {
        for (const subscriberId of ownership2.subscriberTabIds) {
          if (subscriberId === tabId) continue;
          const subTab = tabs.get(subscriberId);
          if (subTab) {
            try {
              subTab.port.postMessage({
                type: "realtime_event",
                payload: eventPayload,
                sourceTabId: tabId,
                timestamp: Date.now(),
              });
            } catch {
              tabs.delete(subscriberId);
            }
          }
        }
      }
      break;
    }
  }
}

const STALE_TAB_TIMEOUT = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [tabId, tab] of tabs) {
    if (now - tab.lastSeen > STALE_TAB_TIMEOUT) {
      tabs.delete(tabId);

      for (const [channelName, ownership] of realtimeChannels) {
        ownership.subscriberTabIds.delete(tabId);
        if (ownership.subscriberTabIds.size === 0) {
          realtimeChannels.delete(channelName);
        } else if (ownership.ownerTabId === tabId) {
          const newOwner = ownership.subscriberTabIds.values().next().value;
          if (newOwner) {
            ownership.ownerTabId = newOwner;
            const ownerTab = tabs.get(newOwner);
            if (ownerTab) {
              ownerTab.port.postMessage({
                type: "realtime_subscribe",
                payload: { channel: channelName, isOwner: true },
                sourceTabId: "shared-worker",
                timestamp: Date.now(),
              });
            }
          }
        }
      }
    }
  }
}, 30_000);

declare const self: SharedWorkerGlobalScope;

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  let tabId = "";

  port.onmessage = (event: MessageEvent<CrossTabMessage>) => {
    const msg = event.data;

    if (msg.type === "tab_register") {
      tabId = msg.sourceTabId || `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      tabs.set(tabId, { id: tabId, lastSeen: Date.now(), port });
      port.postMessage({
        type: "state_response",
        payload: sharedState,
        sourceTabId: "shared-worker",
        timestamp: Date.now(),
      });
      return;
    }

    if (msg.type === "tab_unregister") {
      tabs.delete(tabId);
      return;
    }

    handleMessage(tabId, msg);
  };

  port.start();
};

export type { CrossTabMessage, MessageType };
