import { platformBus } from "@/lib/shared/platform-bus";

export type ChannelType = "presence" | "chat" | "order_tracking" | "notifications" | "driver_location";
export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export interface RealtimeChannel {
  channelId: string;
  type: ChannelType;
  topic: string;
  state: ConnectionState;
  subscriberCount: number;
  lastMessageAt: number | null;
  retryCount: number;
}

export interface RealtimeConfig {
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  maxRetryDelayMs: number;
  heartbeatIntervalMs: number;
  reconnectOnVisibilityChange: boolean;
  deduplicationWindowMs: number;
}

export const DEFAULT_REALTIME_CONFIG: RealtimeConfig = {
  maxRetries: 10,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
  maxRetryDelayMs: 30000,
  heartbeatIntervalMs: 30000,
  reconnectOnVisibilityChange: true,
  deduplicationWindowMs: 5000,
};

const messageIdCache = new Set<string>();
const MESSAGE_CACHE_MAX = 1000;

export function isDuplicateMessage(messageId: string): boolean {
  if (messageIdCache.has(messageId)) return true;
  messageIdCache.add(messageId);
  if (messageIdCache.size > MESSAGE_CACHE_MAX) {
    const first = messageIdCache.values().next().value;
    if (first) messageIdCache.delete(first);
  }
  return false;
}

export function calculateRetryDelay(attempt: number, config: RealtimeConfig = DEFAULT_REALTIME_CONFIG): number {
  const delay = config.retryDelayMs * Math.pow(config.retryBackoffMultiplier, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, config.maxRetryDelayMs);
}

export interface PresenceState {
  userId: string;
  online: boolean;
  lastSeenAt: number;
  deviceType: "web" | "ios" | "android";
  statusText: string | null;
}

const presenceMap = new Map<string, PresenceState>();

export function updatePresence(state: PresenceState): void {
  const prev = presenceMap.get(state.userId);
  presenceMap.set(state.userId, state);
  if (!prev || prev.online !== state.online) {
    platformBus.emit("orbit:presence_changed", {
      userId: state.userId,
      online: state.online,
      lastSeenAt: state.lastSeenAt,
    }, "realtime-engine");
  }
}

export function getPresence(userId: string): PresenceState | undefined {
  return presenceMap.get(userId);
}

export function isOnline(userId: string): boolean {
  return presenceMap.get(userId)?.online ?? false;
}

export function getOnlineUsers(): string[] {
  const online: string[] = [];
  presenceMap.forEach((state, userId) => {
    if (state.online) online.push(userId);
  });
  return online;
}

export interface OrderingGuarantee {
  channelId: string;
  lastSequenceNumber: number;
  pendingMessages: Array<{ sequenceNumber: number; payload: unknown }>;
}

const orderingState = new Map<string, OrderingGuarantee>();

export function processOrderedMessage(
  channelId: string,
  sequenceNumber: number,
  payload: unknown
): { accepted: boolean; gapDetected: boolean } {
  let state = orderingState.get(channelId);
  if (!state) {
    state = { channelId, lastSequenceNumber: 0, pendingMessages: [] };
    orderingState.set(channelId, state);
  }

  if (sequenceNumber <= state.lastSequenceNumber) {
    return { accepted: false, gapDetected: false };
  }

  if (sequenceNumber === state.lastSequenceNumber + 1) {
    state.lastSequenceNumber = sequenceNumber;
    let next = state.pendingMessages.findIndex((m) => m.sequenceNumber === state!.lastSequenceNumber + 1);
    while (next !== -1) {
      state.lastSequenceNumber = state.pendingMessages[next].sequenceNumber;
      state.pendingMessages.splice(next, 1);
      next = state.pendingMessages.findIndex((m) => m.sequenceNumber === state!.lastSequenceNumber + 1);
    }
    return { accepted: true, gapDetected: false };
  }

  state.pendingMessages.push({ sequenceNumber, payload });
  state.pendingMessages.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  return { accepted: false, gapDetected: true };
}

export function emitConnectionStateChanged(channelType: ChannelType, state: ConnectionState): void {
  if (state === "connected") {
    platformBus.emit("system:online_recovered", { channelType, timestamp: Date.now() }, "realtime-engine");
  }
}

export function emitSessionRestored(userId: string): void {
  platformBus.emit("orbit:session_restored", { userId, timestamp: Date.now() }, "realtime-engine");
}
