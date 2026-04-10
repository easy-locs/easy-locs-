/**
 * location.session — Canonical live-location session management.
 * Start/stop live sharing, duration, expiry, state.
 */
import { create } from "zustand";

export interface LiveLocationSession {
  active: boolean;
  startedAt: string | null;
  durationMinutes: number;
  expiresAt: string | null;
  conversationId: string | null;
  recipientUserId: string | null;
}

interface LiveLocationSessionStore extends LiveLocationSession {
  start: (conversationId: string, recipientUserId: string, durationMinutes?: number) => void;
  stop: () => void;
  isExpired: () => boolean;
}

const useLiveLocationSessionStore = create<LiveLocationSessionStore>((set, get) => ({
  active: false,
  startedAt: null,
  durationMinutes: 15,
  expiresAt: null,
  conversationId: null,
  recipientUserId: null,

  start: (conversationId, recipientUserId, durationMinutes = 15) => {
    const now = new Date();
    const expires = new Date(now.getTime() + durationMinutes * 60 * 1000);
    set({
      active: true,
      startedAt: now.toISOString(),
      durationMinutes,
      expiresAt: expires.toISOString(),
      conversationId,
      recipientUserId,
    });
  },

  stop: () => set({
    active: false,
    startedAt: null,
    expiresAt: null,
    conversationId: null,
    recipientUserId: null,
  }),

  isExpired: () => {
    const { expiresAt } = get();
    if (!expiresAt) return true;
    return new Date() > new Date(expiresAt);
  },
}));

export const LocationSession = {
  useStore: useLiveLocationSessionStore,

  start(conversationId: string, recipientUserId: string, durationMinutes?: number) {
    useLiveLocationSessionStore.getState().start(conversationId, recipientUserId, durationMinutes);
  },

  stop() {
    useLiveLocationSessionStore.getState().stop();
  },

  isActive(): boolean {
    return useLiveLocationSessionStore.getState().active;
  },

  isExpired(): boolean {
    return useLiveLocationSessionStore.getState().isExpired();
  },
};
