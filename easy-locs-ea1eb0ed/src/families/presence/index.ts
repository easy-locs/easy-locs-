/**
 * FAMILY: PRESENCE — Canonical presence and typing pipeline.
 * Single source of truth for online/offline, typing, recording, uploading states.
 * Uses Supabase Realtime broadcast for near-instant propagation.
 */
import { create } from "zustand";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

// ── Canonical Taxonomy ──
export type PresenceStatus = "online" | "offline" | "away";
export type ActivityStatus = "idle" | "typing" | "recording" | "uploading";

// ── View Models ──
export interface PresenceViewModel {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: number | null;
  isOnline: boolean;
}

export interface TypingViewModel {
  conversationId: string;
  userId: string;
  displayName: string;
  isTyping: boolean;
  activity: ActivityStatus;
}

// ── Store State ──
interface PresenceEntry {
  status: PresenceStatus;
  lastSeenAt: number;
  activity: ActivityStatus;
}

interface TypingEntry {
  userId: string;
  displayName: string;
  activity: ActivityStatus;
  expiresAt: number;
}

interface PresenceStoreState {
  /** userId → presence */
  presenceMap: Record<string, PresenceEntry>;
  /** conversationId → userId → typing */
  typingMap: Record<string, Record<string, TypingEntry>>;

  setPresence: (userId: string, status: PresenceStatus) => void;
  setTyping: (conversationId: string, entry: TypingEntry) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  getPresence: (userId: string) => PresenceViewModel;
  getTypingUsers: (conversationId: string) => TypingViewModel[];
  cleanupExpired: () => void;
}

const TYPING_TTL_MS = 5000;

export const usePresenceStore = create<PresenceStoreState>((set, get) => ({
  presenceMap: {},
  typingMap: {},

  setPresence: (userId, status) => set((s) => ({
    presenceMap: {
      ...s.presenceMap,
      [userId]: { status, lastSeenAt: Date.now(), activity: "idle" },
    },
  })),

  setTyping: (conversationId, entry) => set((s) => ({
    typingMap: {
      ...s.typingMap,
      [conversationId]: {
        ...s.typingMap[conversationId],
        [entry.userId]: entry,
      },
    },
  })),

  clearTyping: (conversationId, userId) => set((s) => {
    const conv = { ...s.typingMap[conversationId] };
    delete conv[userId];
    return { typingMap: { ...s.typingMap, [conversationId]: conv } };
  }),

  getPresence: (userId) => {
    const entry = get().presenceMap[userId];
    if (!entry) return { userId, status: "offline", lastSeenAt: null, isOnline: false };
    return { userId, status: entry.status, lastSeenAt: entry.lastSeenAt, isOnline: entry.status === "online" };
  },

  getTypingUsers: (conversationId) => {
    const conv = get().typingMap[conversationId] || {};
    const now = Date.now();
    return Object.values(conv)
      .filter((e) => e.expiresAt > now)
      .map((e) => ({
        conversationId,
        userId: e.userId,
        displayName: e.displayName,
        isTyping: e.activity === "typing",
        activity: e.activity,
      }));
  },

  cleanupExpired: () => set((s) => {
    const now = Date.now();
    const newTyping: typeof s.typingMap = {};
    for (const [convId, users] of Object.entries(s.typingMap)) {
      const filtered: Record<string, TypingEntry> = {};
      for (const [uid, entry] of Object.entries(users)) {
        if (entry.expiresAt > now) filtered[uid] = entry;
      }
      if (Object.keys(filtered).length > 0) newTyping[convId] = filtered;
    }
    return { typingMap: newTyping };
  }),
}));

// ── Cleanup interval (garbage collect expired typing) ──
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    usePresenceStore.getState().cleanupExpired();
  }, 3000);
}

// ── Realtime Bridge ──
let presenceChannel: any = null;
let connectedUserId: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const HEARTBEAT_INTERVAL_MS = 25_000;

export const PresencePipeline = {
  connect(userId: string, _displayName: string) {
    PresencePipeline.disconnect();
    ensureCleanup();
    connectedUserId = userId;

    presenceChannel = createRealtimeChannel("orbit-presence-global", {
      config: { broadcast: { self: false } },
    });

    presenceChannel.on("broadcast", { event: "presence" }, ({ payload }: any) => {
      if (payload.userId === userId) return;
      usePresenceStore.getState().setPresence(payload.userId, payload.status);
    });

    presenceChannel.on("broadcast", { event: "typing" }, ({ payload }: any) => {
      if (payload.userId === userId) return;
      usePresenceStore.getState().setTyping(payload.conversationId, {
        userId: payload.userId,
        displayName: payload.displayName || "Contact",
        activity: payload.activity || "typing",
        expiresAt: Date.now() + TYPING_TTL_MS,
      });
    });

    presenceChannel.subscribe();

    usePresenceStore.getState().setPresence(userId, "online");
    PresencePipeline.sendPresence(userId, "online");

    heartbeatTimer = setInterval(() => {
      PresencePipeline.sendPresence(userId, "online");
    }, HEARTBEAT_INTERVAL_MS);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
  },

  disconnect() {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    if (connectedUserId && presenceChannel) {
      presenceChannel.send({
        type: "broadcast",
        event: "presence",
        payload: { userId: connectedUserId, status: "offline" },
      }).catch(() => {});
      usePresenceStore.getState().setPresence(connectedUserId, "offline");
    }
    connectedUserId = null;

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (presenceChannel) {
      removeRealtimeChannel(presenceChannel);
      presenceChannel = null;
    }
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  },

  sendTyping(conversationId: string, userId: string, displayName: string, activity: ActivityStatus = "typing") {
    if (!presenceChannel) return;
    presenceChannel.send({
      type: "broadcast",
      event: "typing",
      payload: { conversationId, userId, displayName, activity },
    }).catch(() => {});
  },

  sendPresence(userId: string, status: PresenceStatus) {
    if (!presenceChannel) return;
    usePresenceStore.getState().setPresence(userId, status);
    presenceChannel.send({
      type: "broadcast",
      event: "presence",
      payload: { userId, status },
    }).catch(() => {});
  },
};

function handleVisibilityChange() {
  if (!connectedUserId) return;
  if (document.visibilityState === "hidden") {
    PresencePipeline.sendPresence(connectedUserId, "away");
  } else {
    PresencePipeline.sendPresence(connectedUserId, "online");
  }
}

function handleBeforeUnload() {
  if (!connectedUserId || !presenceChannel) return;
  try {
    presenceChannel.send({
      type: "broadcast",
      event: "presence",
      payload: { userId: connectedUserId, status: "offline" },
    });
  } catch {}
}
