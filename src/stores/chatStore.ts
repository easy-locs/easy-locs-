import { create } from "zustand";
import { platformBus } from "@/app/events/platform-bus";
import type {
  ConversationParticipant,
  ConversationRecord,
  ChatMessageRecord,
  ConversationType,
  MessageType,
} from "@/lib/types/domain";

// Remove old imports block below
  ChatMessageRecord,
  ConversationType,
  MessageType,
} from "@/lib/types/chat";

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

  createConversation: (input: CreateConversationInput) => ConversationRecord;
  getConversationById: (conversationId: string) => ConversationRecord | null;
  findConversation: (params: {
    type: ConversationType;
    listingId?: string;
    bookingId?: string;
    leaseId?: string;
    participantOrbitIds?: string[];
  }) => ConversationRecord | null;

  sendMessage: (input: SendMessageInput) => ChatMessageRecord;
  getMessagesByConversation: (conversationId: string) => ChatMessageRecord[];
};

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  messages: [],

  createConversation: (input) => {
    const now = new Date().toISOString();

    const conversation: ConversationRecord = {
      id: `conv_${Math.random().toString(36).slice(2, 11)}`,
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

    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }));

    platformBus.emit({
      type: "conversation.created",
      payload: { conversation },
    });

    return conversation;
  },

  getConversationById: (conversationId) => {
    return get().conversations.find((c) => c.id === conversationId) ?? null;
  },

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

  sendMessage: (input) => {
    const now = new Date().toISOString();

    const message: ChatMessageRecord = {
      id: `msg_${Math.random().toString(36).slice(2, 11)}`,
      conversationId: input.conversationId,
      senderOrbitId: input.senderOrbitId,
      body: input.body,
      type: input.type ?? "text",
      metadata: input.metadata,
      createdAt: now,
    };

    set((state) => ({
      messages: [message, ...state.messages],
      conversations: state.conversations.map((conv) =>
        conv.id === input.conversationId
          ? { ...conv, lastMessageAt: now, updatedAt: now }
          : conv
      ),
    }));

    platformBus.emit({
      type: "message.sent",
      payload: { message },
    });

    return message;
  },

  getMessagesByConversation: (conversationId) => {
    return get()
      .messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
}));
