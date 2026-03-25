import { create } from "zustand";
import { platformBus } from "@/lib/shared/platform-bus";
import type {
  ConversationParticipant,
  ConversationRecord,
  ChatMessageRecord,
  ConversationType,
  MessageType,
} from "@/lib/types/domain";
import { chatRepo } from "@/lib/supabase/repositories";
import { chatRepoExtended } from "@/lib/supabase/chat-repo-extended";

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
    const now = new Date().toISOString();

    // Let DB generate the UUID — no client-side fake ID
    const conversation: ConversationRecord = {
      id: crypto.randomUUID(),
      type: input.type,
      participants: input.participants,
      title: input.title,
      listingId: input.listingId,
      bookingId: input.bookingId,
      leaseId: input.leaseId,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await chatRepo.createConversation(conversation);

    set((state) => ({
      conversations: [saved, ...state.conversations.filter((c) => c.id !== saved.id)],
    }));

    platformBus.emit("conversation.created", { conversation: saved }, "orbit");

    return saved;
  },

  sendMessage: async (input) => {
    const now = new Date().toISOString();

    // Let DB generate UUID — no client-side fake ID
    const message: ChatMessageRecord = {
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      senderOrbitId: input.senderOrbitId,
      body: input.body,
      type: input.type ?? "text",
      metadata: input.metadata,
      createdAt: now,
    };

    const saved = await chatRepo.createMessage(message);
    await chatRepoExtended.updateConversation(input.conversationId, {
      lastMessageAt: now,
      updatedAt: now,
    });

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
