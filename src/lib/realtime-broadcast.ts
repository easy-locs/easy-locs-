/**
 * realtime-broadcast — Low-latency broadcast channel for instant message delivery.
 * Separates instant UI updates (broadcast) from persistent DB sync (postgres_changes).
 * Broadcast is ~10-50ms, postgres_changes is ~200-500ms.
 */
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

const broadcastChannels = new Map<string, any>();

export interface BroadcastMessage {
  /** Optimistic or confirmed message ID */
  id: string;
  conversationId: string;
  senderUserId: string;
  senderOrbitId: string;
  type: string;
  body: string;
  metadata?: any;
  createdAt: string;
  /** Whether this is the final confirmed version */
  confirmed?: boolean;
}

/**
 * Broadcast a message instantly to all subscribers on the conversation channel.
 * This arrives ~10-50ms vs postgres_changes ~200-500ms.
 */
export function broadcastInstantMessage(
  conversationId: string,
  msg: BroadcastMessage,
) {
  const channelName = `instant:${conversationId}`;
  let channel = broadcastChannels.get(channelName);

  if (!channel) {
    channel = createRealtimeChannel(channelName, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    broadcastChannels.set(channelName, channel);
  }

  void channel.send({
    type: "broadcast",
    event: "msg",
    payload: msg,
  }).catch(() => {});
}

/**
 * Subscribe to instant messages on a conversation.
 * Returns cleanup function.
 */
export function subscribeInstantMessages(
  conversationId: string,
  onMessage: (msg: BroadcastMessage) => void,
): () => void {
  const channelName = `instant:${conversationId}`;

  // Clean up existing
  const existing = broadcastChannels.get(channelName);
  if (existing) {
    removeRealtimeChannel(existing);
    broadcastChannels.delete(channelName);
  }

  const channel = createRealtimeChannel(channelName, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "msg" }, ({ payload }: any) => {
    onMessage(payload as BroadcastMessage);
  });

  channel.subscribe();
  broadcastChannels.set(channelName, channel);

  return () => {
    const ch = broadcastChannels.get(channelName);
    if (ch) {
      removeRealtimeChannel(ch);
      broadcastChannels.delete(channelName);
    }
  };
}

/**
 * Clean up all broadcast channels.
 */
export function cleanupBroadcastChannels() {
  for (const [key, channel] of broadcastChannels) {
    removeRealtimeChannel(channel);
  }
  broadcastChannels.clear();
}
