/**
 * orbit.thread.store — Thread/conversation state only.
 * Zero message content, zero crypto, zero realtime.
 */
import { create } from "zustand";
import type { ConversationRecord, ConversationType, ConversationParticipant } from "@/lib/types/comms";
import { chatRepoExtended } from "@/lib/supabase/chat-repo-extended";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

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

  upsertThread: (thread) =>
    set((s) => ({
      threads: [thread, ...s.threads.filter((t) => t.id !== thread.id)],
    })),

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
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    let createdByOrbitId = `orbit_${userId.slice(0, 12)}`;
    try {
      const { data: op } = await db
        .from("orbit_profiles_v2")
        .select("orbit_id")
        .eq("id", userId)
        .maybeSingle();
      if (op?.orbit_id) createdByOrbitId = op.orbit_id;
    } catch { /* fallback */ }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("conversations_v2")
      .insert({
        type: input.type,
        title: input.title || null,
        participants: input.participants || [],
        listing_id: input.listingId || null,
        booking_id: input.bookingId || null,
        lease_id: input.leaseId || null,
        last_message_at: now,
        created_at: now,
        updated_at: now,
        created_by_orbit_id: createdByOrbitId,
      })
      .select()
      .single();

    if (error) throw error;

    const saved: ConversationRecord = {
      id: data.id,
      type: data.type,
      participants: data.participants || [],
      title: data.title,
      listingId: data.listing_id,
      bookingId: data.booking_id,
      leaseId: data.lease_id,
      lastMessageAt: data.last_message_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    set((s) => ({ threads: [saved, ...s.threads.filter((t) => t.id !== saved.id)] }));
    return saved;
  },
}));
