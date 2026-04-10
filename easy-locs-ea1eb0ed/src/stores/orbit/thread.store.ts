/**
 * orbit.thread.store — Thread/conversation state only.
 * Zero message content, zero crypto, zero realtime.
 *
 * SSOT bridge: after any write (createThread / upsertThread) the result is
 * forwarded to useOrbitMessagingStore.mergeConversation so the canonical
 * messaging store is always the single authority on conversation state.
 */
import { create } from "zustand";
import type { ConversationRecord, ConversationType, ConversationParticipant } from "@/lib/types/comms";
import { chatRepoExtended } from "@/lib/supabase/chat-repo-extended";
import { resolveOrbitProfile, createConversation as createConv } from "@/repositories/communication.repository";
import { getAuthUser } from "@/repositories/tenant-portal.repository";
import type { OrbitConversation } from "@/domains/orbit/types/canonical-entities";

/** Map a ConversationRecord to the canonical OrbitConversation shape and forward it. */
function forwardToMessagingStore(thread: ConversationRecord): void {
  const canonical: OrbitConversation = {
    id: thread.id,
    kind: (thread.type as any) ?? "direct",
    participantIds: thread.participants.map((p) => (p as any).userId ?? (p as any).id ?? ""),
    title: thread.title ?? null,
    avatarUrl: null,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    lastMessageId: null,
    lastMessagePreview: thread.lastMessagePreview ?? null,
    lastMessageAt: thread.lastMessageAt ?? null,
    unreadCount: thread.unreadCountCache ?? 0,
    isArchived: thread.archived ?? false,
    isMuted: thread.muted ?? false,
    isEphemeral: false,
    ephemeralConfig: null,
  };
  import("@/domains/orbit/stores/orbit.store").then(({ useOrbitMessagingStore }) => {
    useOrbitMessagingStore.getState().mergeConversation(canonical);
  }).catch(() => { /* non-fatal — messaging store may not be loaded yet */ });
}

export interface OrbitThreadState {
  threads: ConversationRecord[];
  activeThreadId: string | null;
  loading: boolean;

  hydrate: (orbitId: string) => Promise<void>;
  setActiveThread: (id: string | null) => void;
  upsertThread: (thread: ConversationRecord) => void;
  findThread: (params: {
    type: ConversationType;
    listingId?: string;
    bookingId?: string;
    leaseId?: string;
    participantOrbitIds?: string[];
  }) => ConversationRecord | null;
  getById: (id: string) => ConversationRecord | null;
  createThread: (input: {
    type: ConversationType;
    participants: ConversationParticipant[];
    title?: string;
    listingId?: string;
    bookingId?: string;
    leaseId?: string;
  }) => Promise<ConversationRecord>;
}

export const useOrbitThreadStore = create<OrbitThreadState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  loading: false,

  hydrate: async (orbitId) => {
    set({ loading: true });
    try {
      const threads = await chatRepoExtended.listConversationsByOrbitId(orbitId);
      set({ threads, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setActiveThread: (id) => set({ activeThreadId: id }),

  upsertThread: (thread) => {
    set((s) => ({
      threads: [thread, ...s.threads.filter((t) => t.id !== thread.id)],
    }));
    forwardToMessagingStore(thread);
  },

  getById: (id) => get().threads.find((t) => t.id === id) ?? null,

  findThread: ({ type, listingId, bookingId, leaseId, participantOrbitIds }) =>
    get().threads.find((c) => {
      if (c.type !== type) return false;
      if (listingId && c.listingId !== listingId) return false;
      if (bookingId && c.bookingId !== bookingId) return false;
      if (leaseId && c.leaseId !== leaseId) return false;
      if (participantOrbitIds?.length) {
        const ids = c.participants.map((p) => p.orbitId).sort();
        const target = [...participantOrbitIds].sort();
        return ids.length === target.length && ids.every((id, i) => id === target[i]);
      }
      return true;
    }) ?? null,

  createThread: async (input) => {
    const userId = await getAuthUser();
    if (!userId) throw new Error("Not authenticated");

    let createdByOrbitId = `orbit_${userId.replace(/-/g, "").substring(0, 8)}`;
    try {
      const op = await resolveOrbitProfile(userId);
      if (op?.orbit_id) createdByOrbitId = op.orbit_id;
    } catch { /* fallback */ }

    const data = await createConv({
      type: input.type,
      title: input.title || "",
      participants: input.participants || [],
      createdByOrbitId,
    });

    const saved: ConversationRecord = {
      id: data.id,
      type: data.type,
      participants: (data as any).participants || [],
      title: data.title,
      listingId: (data as any).listing_id,
      bookingId: (data as any).booking_id,
      leaseId: (data as any).lease_id,
      lastMessageAt: (data as any).last_message_at,
      createdAt: data.created_at,
      updatedAt: (data as any).updated_at,
    };

    set((s) => ({ threads: [saved, ...s.threads.filter((t) => t.id !== saved.id)] }));
    forwardToMessagingStore(saved);
    return saved;
  },
}));
