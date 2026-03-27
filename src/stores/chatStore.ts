/**
 * chatStore — V2-ONLY canonical chat store.
 * Uses conversations_v2 + chat_messages_v2 exclusively.
 */
import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type {
  ConversationParticipant,
  ConversationRecord,
  ChatMessageRecord,
  ConversationType,
  MessageType,
} from "@/lib/types/comms";
import { chatRepoExtended } from "@/lib/supabase/chat-repo-extended";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type CreateConversationInput = {
  type: ConversationType;
  participants: ConversationParticipant[];
  title?: string;
  listingId?: string;
  bookingId?: string;
  leaseId?: string;
};

type SendMessageInput = {
  conversationId: string;
  senderOrbitId: string;
  body: string;
  type?: MessageType;
  metadata?: Record<string, unknown>;
};

type ChatStore = {
  conversations: ConversationRecord[];
  messages: ChatMessageRecord[];
  loading: boolean;

  hydrateConversations: (orbitId: string) => Promise<void>;
  hydrateMessages: (conversationId: string) => Promise<void>;

  createConversation: (input: CreateConversationInput) => Promise<ConversationRecord>;
  sendMessage: (input: SendMessageInput) => Promise<ChatMessageRecord>;

  getConversationById: (conversationId: string) => ConversationRecord | null;
  findConversation: (params: {
    type: ConversationType;
    listingId?: string;
    bookingId?: string;
    leaseId?: string;
    participantOrbitIds?: string[];
  }) => ConversationRecord | null;
  getMessagesByConversation: (conversationId: string) => ChatMessageRecord[];
};

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: [],
  loading: false,

  hydrateConversations: async (orbitId) => {
    set({ loading: true });
    try {
      const conversations = await chatRepoExtended.listConversationsByOrbitId(orbitId);
      set({ conversations, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  hydrateMessages: async (conversationId) => {
    try {
      const messages = await chatRepoExtended.listMessages(conversationId);
      set((state) => {
        const others = state.messages.filter((m) => m.conversationId !== conversationId);
        return { messages: [...others, ...messages] };
      });
    } catch {
      // silent
    }
  },

  createConversation: async (input) => {
    // Get current user for RLS
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error("Not authenticated");

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
        created_by_orbit_id: userId,
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

    set((state) => ({
      conversations: [saved, ...state.conversations.filter((c) => c.id !== saved.id)],
    }));

    platformBus.emit("conversation.created", { conversation: saved }, "orbit");

    return saved;
  },

  sendMessage: async (input) => {
    // Get current user for sender_user_id
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const { data, error } = await db
      .from("chat_messages_v2")
      .insert({
        conversation_id: input.conversationId,
        sender_orbit_id: input.senderOrbitId,
        sender_user_id: userId,
        type: input.type || "text",
        body: input.body,
        metadata: input.metadata || null,
      })
      .select()
      .single();

    if (error) throw error;

    const now = new Date().toISOString();
    await chatRepoExtended.updateConversation(input.conversationId, {
      lastMessageAt: now,
      updatedAt: now,
    });

    const saved: ChatMessageRecord = {
      id: data.id,
      conversationId: data.conversation_id,
      senderOrbitId: data.sender_orbit_id,
      senderUserId: data.sender_user_id,
      body: data.body,
      type: data.type || "text",
      metadata: data.metadata,
      createdAt: data.created_at,
    };

    set((state) => ({
      messages: [...state.messages, saved],
      conversations: state.conversations.map((conv) =>
        conv.id === input.conversationId
          ? { ...conv, lastMessageAt: now, updatedAt: now }
          : conv
      ),
    }));

    platformBus.emit("message.sent", { message: saved }, "orbit");

    return saved;
  },

  getConversationById: (conversationId) =>
    get().conversations.find((c) => c.id === conversationId) ?? null,

  findConversation: ({ type, listingId, bookingId, leaseId, participantOrbitIds }) => {
    return (
      get().conversations.find((c) => {
        if (c.type !== type) return false;
        if (listingId && c.listingId !== listingId) return false;
        if (bookingId && c.bookingId !== bookingId) return false;
        if (leaseId && c.leaseId !== leaseId) return false;

        if (participantOrbitIds?.length) {
          const ids = c.participants.map((p) => p.orbitId).sort();
          const target = [...participantOrbitIds].sort();
          if (ids.length !== target.length) return false;
          return ids.every((id, i) => id === target[i]);
        }

        return true;
      }) ?? null
    );
  },

  getMessagesByConversation: (conversationId) =>
    get()
      .messages.filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
}));
