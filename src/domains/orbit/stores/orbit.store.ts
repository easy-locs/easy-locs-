/**
 * orbitStore — UNIFIED canonical store for ALL Orbit chat state.
 * Single source of truth for conversations, messages, attachments, receipts, drafts.
 * 
 * RULES:
 * - Only normalized data enters this store (via merge actions)
 * - Only canonical services may call mutation actions
 * - UI reads through selectors only
 * - No direct DB/API calls from this store
 */
import { create } from "zustand";
import type {
  OrbitConversation,
  OrbitMessage,
  OrbitAttachment,
  OrbitReceipt,
  MessageStatus,
} from "@/domains/orbit/types";

// ══════════════════════════════════════════════
// STATE SHAPE
// ══════════════════════════════════════════════

interface OrbitStoreState {
  /** All conversations keyed by ID */
  conversations: Record<string, OrbitConversation>;

  /** All messages keyed by ID */
  messages: Record<string, OrbitMessage>;

  /** Message IDs per conversation (ordered) */
  messagesByConversation: Record<string, string[]>;

  /** Attachments keyed by ID */
  attachments: Record<string, OrbitAttachment>;

  /** Receipts keyed by `${messageId}:${userId}:${kind}` */
  receipts: Record<string, OrbitReceipt>;

  /** tempId → serverId mapping for reconciliation */
  tempIdMap: Record<string, string>;

  /** Currently active conversation ID */
  activeConversationId: string | null;

  /** Loading flags */
  hydrating: boolean;

  // ── CONVERSATION ACTIONS ──
  mergeConversation: (conv: OrbitConversation) => void;
  mergeConversations: (convs: OrbitConversation[]) => void;
  removeConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  updateUnreadCount: (conversationId: string, count: number) => void;

  // ── MESSAGE ACTIONS ──
  mergeMessage: (msg: OrbitMessage) => void;
  mergeMessages: (msgs: OrbitMessage[]) => void;
  updateMessageStatus: (id: string, status: MessageStatus) => void;
  reconcileMessage: (tempId: string, serverMsg: OrbitMessage) => void;
  removeMessage: (id: string) => void;
  softDeleteMessage: (id: string) => void;

  // ── ATTACHMENT ACTIONS ──
  mergeAttachment: (att: OrbitAttachment) => void;
  updateAttachmentUpload: (id: string, partial: Partial<OrbitAttachment>) => void;

  // ── RECEIPT ACTIONS ──
  mergeReceipt: (receipt: OrbitReceipt) => void;

  // ── HYDRATION ──
  setHydrating: (v: boolean) => void;

  // ── GETTERS ──
  getConversation: (id: string) => OrbitConversation | undefined;
  getMessage: (id: string) => OrbitMessage | undefined;
  getMessagesForConversation: (conversationId: string) => OrbitMessage[];
}

// ══════════════════════════════════════════════
// STORE IMPLEMENTATION
// ══════════════════════════════════════════════

export const useOrbitStore = create<OrbitStoreState>((set, get) => ({
  conversations: {},
  messages: {},
  messagesByConversation: {},
  attachments: {},
  receipts: {},
  tempIdMap: {},
  activeConversationId: null,
  hydrating: false,

  // ── CONVERSATION ──

  mergeConversation: (conv) =>
    set((s) => ({
      conversations: { ...s.conversations, [conv.id]: conv },
    })),

  mergeConversations: (convs) =>
    set((s) => {
      const next = { ...s.conversations };
      for (const c of convs) next[c.id] = c;
      return { conversations: next };
    }),

  removeConversation: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.conversations;
      return { conversations: rest };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  updateUnreadCount: (conversationId, count) =>
    set((s) => {
      const conv = s.conversations[conversationId];
      if (!conv) return s;
      return {
        conversations: {
          ...s.conversations,
          [conversationId]: { ...conv, unreadCount: count },
        },
      };
    }),

  // ── MESSAGES ──

  mergeMessage: (msg) =>
    set((s) => {
      // Dedup: if tempId already reconciled to a different serverId, skip
      if (msg.tempId && s.tempIdMap[msg.tempId] && s.tempIdMap[msg.tempId] !== msg.id) {
        return s;
      }

      // Version guard: never overwrite with older or equal version
      const existing = s.messages[msg.id];
      if (existing) {
        const existingVersion = (existing as any).version ?? 0;
        const incomingVersion = (msg as any).version ?? 0;
        if (incomingVersion <= existingVersion) {
          return s; // stale update — skip
        }
        // Skip duplicate server echo (same serverId already exists)
        if ((existing as any).serverId && (msg as any).serverId && (existing as any).serverId === (msg as any).serverId) {
          return s;
        }
      }

      const next = { ...s.messages };

      // If this message has a tempId, map it and clean up the temp entry
      if (msg.tempId && msg.id !== msg.tempId) {
        next[msg.id] = msg;
        if (next[msg.tempId]) {
          delete next[msg.tempId];
        }
      } else {
        next[msg.id] = msg;
      }

      // Rebuild conversation index — remove stale tempId, ensure serverId present, keep sorted
      const convMsgs = (s.messagesByConversation[msg.conversationId] || [])
        .filter((id) => !(msg.tempId && id === msg.tempId && msg.id !== msg.tempId));
      const msgIds = convMsgs.includes(msg.id)
        ? convMsgs
        : [...convMsgs, msg.id].sort((a, b) => {
            const tA = next[a]?.createdAt ?? "";
            const tB = next[b]?.createdAt ?? "";
            return tA < tB ? -1 : tA > tB ? 1 : 0;
          });

      // Update tempIdMap
      const nextTempIdMap = msg.tempId && msg.id !== msg.tempId
        ? { ...s.tempIdMap, [msg.tempId]: msg.id }
        : s.tempIdMap;

      return {
        messages: next,
        messagesByConversation: {
          ...s.messagesByConversation,
          [msg.conversationId]: msgIds,
        },
        tempIdMap: nextTempIdMap,
      };
    }),

  mergeMessages: (msgs) =>
    set((s) => {
      const nextMessages = { ...s.messages };
      const nextByConv = { ...s.messagesByConversation };

      for (const msg of msgs) {
        if (msg.tempId && s.tempIdMap[msg.tempId] && s.tempIdMap[msg.tempId] !== msg.id) {
          continue;
        }
        nextMessages[msg.id] = msg;
        const convMsgs = nextByConv[msg.conversationId] || [];
        if (!convMsgs.includes(msg.id)) {
          nextByConv[msg.conversationId] = [...convMsgs, msg.id];
        }
      }

      return { messages: nextMessages, messagesByConversation: nextByConv };
    }),

  updateMessageStatus: (id, status) =>
    set((s) => {
      const msg = s.messages[id];
      if (!msg) return s;
      return { messages: { ...s.messages, [id]: { ...msg, status } } };
    }),

  reconcileMessage: (tempId, serverMsg) =>
    set((s) => {
      // Remove temp message, insert server message
      const { [tempId]: removed, ...restMessages } = s.messages;
      restMessages[serverMsg.id] = serverMsg;

      // Update conversation index
      const convMsgs = (s.messagesByConversation[serverMsg.conversationId] || [])
        .filter((id) => id !== tempId);
      if (!convMsgs.includes(serverMsg.id)) convMsgs.push(serverMsg.id);

      return {
        messages: restMessages,
        messagesByConversation: {
          ...s.messagesByConversation,
          [serverMsg.conversationId]: convMsgs,
        },
        tempIdMap: { ...s.tempIdMap, [tempId]: serverMsg.id },
      };
    }),

  removeMessage: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.messages;
      return { messages: rest };
    }),

  softDeleteMessage: (id) =>
    set((s) => {
      const msg = s.messages[id];
      if (!msg) return s;
      return { messages: { ...s.messages, [id]: { ...msg, isDeleted: true } } };
    }),

  // ── ATTACHMENTS ──

  mergeAttachment: (att) =>
    set((s) => ({
      attachments: { ...s.attachments, [att.id]: att },
    })),

  updateAttachmentUpload: (id, partial) =>
    set((s) => {
      const att = s.attachments[id];
      if (!att) return s;
      return { attachments: { ...s.attachments, [id]: { ...att, ...partial } } };
    }),

  // ── RECEIPTS ──

  mergeReceipt: (receipt) =>
    set((s) => {
      const key = `${receipt.messageId}:${receipt.userId}:${receipt.kind}`;
      return { receipts: { ...s.receipts, [key]: receipt } };
    }),

  // ── HYDRATION ──

  setHydrating: (v) => set({ hydrating: v }),

  // ── GETTERS ──

  getConversation: (id) => get().conversations[id],

  getMessage: (id) => get().messages[id],

  getMessagesForConversation: (conversationId) => {
    const s = get();
    const ids = s.messagesByConversation[conversationId] || [];
    return ids.map((id) => s.messages[id]).filter(Boolean);
  },
}));
