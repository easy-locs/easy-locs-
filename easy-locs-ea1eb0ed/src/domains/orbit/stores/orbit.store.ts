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

  /** Attachment IDs per conversation (index) */
  attachmentsByConversation: Record<string, string[]>;

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
  /** Apply a local optimistic patch to an existing message. Bypasses version
   *  guard since these are local mutations (edit/delete/star/translation),
   *  not server reconciliation events. */
  patchMessage: (id: string, patch: Partial<Omit<OrbitMessage, "id" | "conversationId" | "senderId">>) => void;
  reconcileMessage: (tempId: string, serverMsg: OrbitMessage) => void;
  removeMessage: (id: string) => void;
  softDeleteMessage: (id: string) => void;

  // ── ATTACHMENT ACTIONS ──
  mergeAttachment: (att: OrbitAttachment) => void;
  updateAttachmentUpload: (id: string, partial: Partial<OrbitAttachment>) => void;
  reconcileAttachment: (localId: string, serverAtt: OrbitAttachment) => void;

  // ── RECEIPT ACTIONS ──
  mergeReceipt: (receipt: OrbitReceipt) => void;

  // ── HYDRATION ──
  setHydrating: (v: boolean) => void;

  // ── GETTERS ──
  getConversation: (id: string) => OrbitConversation | undefined;
  getMessage: (id: string) => OrbitMessage | undefined;
  getMessagesForConversation: (conversationId: string) => OrbitMessage[];
  getAttachmentsForConversation: (conversationId: string) => OrbitAttachment[];
  getAttachmentsForMessage: (conversationId: string, message: OrbitMessage) => OrbitAttachment[];
  getAttachmentScoped: (conversationId: string, attachmentId: string) => OrbitAttachment | null;
}

// ══════════════════════════════════════════════
// STORE IMPLEMENTATION
// ══════════════════════════════════════════════

export const useOrbitStore = create<OrbitStoreState>((set, get) => ({
  conversations: {},
  messages: {},
  messagesByConversation: {},
  attachments: {},
  attachmentsByConversation: {},
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
      // ══ HARD GUARD: conversationId REQUIRED ══
      if (!msg.conversationId) {
        console.error("[orbitStore.mergeMessage] REJECTED — missing conversationId", {
          id: msg.id, tempId: msg.tempId, type: msg.type,
        });
        return s;
      }

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

      // ══ BUBBLE TYPE STABILITY: never downgrade media type ══
      if (existing && existing.type !== msg.type) {
        const mediaTypes = ["image", "video", "voice", "audio", "file", "location_static", "location_live"];
        if (mediaTypes.includes(existing.type) && !mediaTypes.includes(msg.type)) {
          if (import.meta.env.DEV) {
            console.error("[orbitStore.mergeMessage] TYPE DOWNGRADE blocked", {
              id: msg.id, from: existing.type, to: msg.type,
            });
          }
          msg = { ...msg, type: existing.type }; // preserve original media type
        } else if (import.meta.env.DEV && existing.type !== "text") {
          console.warn("[orbitStore.mergeMessage] TYPE CHANGE", {
            id: msg.id, from: existing.type, to: msg.type,
          });
        }
      }
      // ══ CROSS-CONVERSATION GUARD: tempId must belong to same conversation ══
      if (msg.tempId && msg.id !== msg.tempId) {
        const tempMsg = s.messages[msg.tempId];
        if (tempMsg && tempMsg.conversationId !== msg.conversationId) {
          console.error("[orbitStore.mergeMessage] CROSS-CONVERSATION tempId conflict", {
            tempId: msg.tempId,
            tempConvId: tempMsg.conversationId,
            incomingConvId: msg.conversationId,
          });
          return s; // refuse cross-conversation reconciliation
        }
      }

      const next = { ...s.messages };

      // If this message has a tempId, map it and clean up the temp entry
      if (msg.tempId && msg.id !== msg.tempId) {
        next[msg.id] = msg;
        if (next[msg.tempId]) {
          // Also remove from OLD conversation bucket
          delete next[msg.tempId];
        }
      } else {
        next[msg.id] = msg;
      }

      // Rebuild conversation index — ONLY for msg.conversationId bucket
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

      if (import.meta.env.DEV) {
        console.debug("[orbitStore.mergeMessage]", {
          id: msg.id, tempId: msg.tempId, conversationId: msg.conversationId,
          bucketSize: msgIds.length,
        });
      }

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
      const nextTempIdMap = { ...s.tempIdMap };

      for (const msg of msgs) {
        if (!msg.conversationId) {
          console.error("[orbitStore.mergeMessages] REJECTED — missing conversationId", { id: msg.id });
          continue;
        }
        if (msg.tempId && nextTempIdMap[msg.tempId] && nextTempIdMap[msg.tempId] !== msg.id) {
          continue;
        }

        if (msg.tempId && msg.id !== msg.tempId && nextMessages[msg.tempId]) {
          delete nextMessages[msg.tempId];
          const convMsgs = nextByConv[msg.conversationId] || [];
          nextByConv[msg.conversationId] = convMsgs.filter((id) => id !== msg.tempId);
          nextTempIdMap[msg.tempId] = msg.id;
        }

        nextMessages[msg.id] = msg;
        const convMsgs = nextByConv[msg.conversationId] || [];
        if (!convMsgs.includes(msg.id)) {
          nextByConv[msg.conversationId] = [...convMsgs, msg.id];
        }
      }

      return { messages: nextMessages, messagesByConversation: nextByConv, tempIdMap: nextTempIdMap };
    }),

  updateMessageStatus: (id, status) =>
    set((s) => {
      const msg = s.messages[id];
      if (!msg) return s;

      // ══ STATUS MACHINE GUARD ══
      // Inline transition check to avoid circular import; mirrors message-status.machine.ts
      const TRANSITIONS: Record<string, string[]> = {
        sending: ["sent", "failed"],
        sent: ["delivered", "read"],
        delivered: ["read"],
        read: [],
        failed: ["retrying"],
        retrying: ["sent", "failed"],
      };
      const allowed = TRANSITIONS[msg.status] || [];
      if (!allowed.includes(status)) {
        if (import.meta.env.DEV) {
          console.error("[orbitStore.updateMessageStatus] BLOCKED", {
            id, from: msg.status, to: status,
          });
        }
        return s;
      }

      if (import.meta.env.DEV) {
        console.debug("[orbitStore.updateMessageStatus]", { id, from: msg.status, to: status });
      }
      return { messages: { ...s.messages, [id]: { ...msg, status } } };
    }),

  patchMessage: (id, patch) =>
    set((s) => {
      const msg = s.messages[id];
      if (!msg) return s;
      return { messages: { ...s.messages, [id]: { ...msg, ...patch } } };
    }),

  reconcileMessage: (tempId, serverMsg) =>
    set((s) => {
      // ══ HARD GUARD: conversationId REQUIRED ══
      if (!serverMsg.conversationId) {
        console.error("[orbitStore.reconcileMessage] REJECTED — missing conversationId", { tempId, id: serverMsg.id });
        return s;
      }

      // ══ CROSS-CONVERSATION GUARD: tempId must belong to same conversation ══
      const tempMsg = s.messages[tempId];
      if (tempMsg && tempMsg.conversationId !== serverMsg.conversationId) {
        console.error("[orbitStore.reconcileMessage] CROSS-CONVERSATION BLOCKED", {
          tempId,
          tempConversationId: tempMsg.conversationId,
          serverConversationId: serverMsg.conversationId,
          serverId: serverMsg.id,
        });
        return s; // refuse — never reconcile across conversations
      }

      // ══ BUBBLE TYPE STABILITY: type must not change ══
      if (tempMsg && tempMsg.type !== serverMsg.type) {
        if (import.meta.env.DEV) {
          console.error("[orbitStore.reconcileMessage] TYPE MUTATION", {
            tempId, from: tempMsg.type, to: serverMsg.type,
          });
        }
        serverMsg = { ...serverMsg, type: tempMsg.type };
      }

      // Remove temp message, insert server message
      const { [tempId]: removed, ...restMessages } = s.messages;
      restMessages[serverMsg.id] = serverMsg;

      // Update conversation index — ONLY in serverMsg.conversationId bucket
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
    set((s) => {
      // ══ HARD GUARD: conversationId REQUIRED ══
      if (!att.conversationId) {
        console.error("[orbitStore.mergeAttachment] REJECTED — missing conversationId", { id: att.id, kind: att.kind });
        return s;
      }

      // ══ CROSS-CONVERSATION GUARD: if existing, conversationId must not change ══
      const existing = s.attachments[att.id];
      if (existing && existing.conversationId !== att.conversationId) {
        if (import.meta.env.DEV) {
          console.error("[orbitStore.mergeAttachment] CROSS-CONVERSATION BLOCKED", {
            id: att.id, existingConv: existing.conversationId, incomingConv: att.conversationId,
          });
        }
        return s;
      }

      // ══ MESSAGE CROSS-CONVERSATION GUARD ══
      if (att.messageId) {
        const linkedMsg = s.messages[att.messageId];
        if (linkedMsg && linkedMsg.conversationId !== att.conversationId) {
          if (import.meta.env.DEV) {
            console.error("[orbitStore.mergeAttachment] MESSAGE CROSS-CONVERSATION BLOCKED", {
              attachmentId: att.id, attConv: att.conversationId, msgConv: linkedMsg.conversationId,
            });
          }
          return s;
        }
      }

      // ══ KIND STABILITY: never downgrade attachment kind ══
      if (existing && existing.kind !== att.kind) {
        if (import.meta.env.DEV) {
          console.error("[orbitStore.mergeAttachment] KIND MUTATION", {
            id: att.id, from: existing.kind, to: att.kind,
          });
        }
        att = { ...att, kind: existing.kind };
      }

      if (import.meta.env.DEV) {
        console.debug("[orbitStore.mergeAttachment]", {
          id: att.id, kind: att.kind, conversationId: att.conversationId,
          uploadStatus: att.uploadStatus, hasLocal: !!att.localUri, hasRemote: !!att.remoteUrl,
        });
      }

      // Update attachmentsByConversation index
      const convAtts = s.attachmentsByConversation[att.conversationId] || [];
      const nextConvAtts = convAtts.includes(att.id) ? convAtts : [...convAtts, att.id];

      return {
        attachments: { ...s.attachments, [att.id]: att },
        attachmentsByConversation: {
          ...s.attachmentsByConversation,
          [att.conversationId]: nextConvAtts,
        },
      };
    }),

  updateAttachmentUpload: (id, partial) =>
    set((s) => {
      const att = s.attachments[id];
      if (!att) return s;

      // ══ IMMUTABLE: conversationId cannot change ══
      if ('conversationId' in partial && partial.conversationId !== att.conversationId) {
        if (import.meta.env.DEV) {
          console.error("[orbitStore.updateAttachmentUpload] CONVERSATION CHANGE blocked", {
            id, from: att.conversationId, to: partial.conversationId,
          });
        }
        const { conversationId: _, ...safePartial } = partial as any;
        return { attachments: { ...s.attachments, [id]: { ...att, ...safePartial } } };
      }

      // ══ KIND STABILITY: never allow kind change through partial update ══
      if ('kind' in partial && partial.kind !== att.kind) {
        if (import.meta.env.DEV) {
          console.error("[orbitStore.updateAttachmentUpload] KIND MUTATION blocked", {
            id, from: att.kind, to: partial.kind,
          });
        }
        const { kind: _, ...safePartial } = partial as any;
        return { attachments: { ...s.attachments, [id]: { ...att, ...safePartial } } };
      }
      return { attachments: { ...s.attachments, [id]: { ...att, ...partial } } };
    }),

  reconcileAttachment: (localId, serverAtt) =>
    set((s) => {
      const localAtt = s.attachments[localId];

      // ══ HARD GUARD: both must have conversationId ══
      if (!serverAtt.conversationId) {
        console.error("[orbitStore.reconcileAttachment] REJECTED — server missing conversationId", { localId, serverId: serverAtt.id });
        return s;
      }
      if (localAtt && !localAtt.conversationId) {
        console.error("[orbitStore.reconcileAttachment] REJECTED — local missing conversationId", { localId });
        return s;
      }

      // ══ CROSS-CONVERSATION GUARD ══
      if (localAtt && localAtt.conversationId !== serverAtt.conversationId) {
        if (import.meta.env.DEV) {
          console.error("[orbitStore.reconcileAttachment] CROSS-CONVERSATION BLOCKED", {
            localId, localConv: localAtt.conversationId, serverConv: serverAtt.conversationId,
          });
        }
        return s;
      }

      // Remove local, insert server
      const { [localId]: _, ...restAtts } = s.attachments;
      restAtts[serverAtt.id] = serverAtt;

      // Update index
      const convId = serverAtt.conversationId;
      const convAtts = (s.attachmentsByConversation[convId] || [])
        .filter((id) => id !== localId);
      if (!convAtts.includes(serverAtt.id)) convAtts.push(serverAtt.id);

      return {
        attachments: restAtts,
        attachmentsByConversation: { ...s.attachmentsByConversation, [convId]: convAtts },
      };
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
    return ids
      .map((id) => s.messages[id])
      .filter((m): m is OrbitMessage => !!m && m.conversationId === conversationId);
  },

  getAttachmentsForConversation: (conversationId) => {
    const s = get();
    const ids = s.attachmentsByConversation[conversationId] || [];
    return ids
      .map((id) => s.attachments[id])
      .filter((a): a is OrbitAttachment => !!a && a.conversationId === conversationId);
  },

  getAttachmentsForMessage: (conversationId, message) => {
    const s = get();
    return message.attachmentIds
      .map((id) => s.attachments[id])
      .filter((a): a is OrbitAttachment => {
        if (!a) return false;
        if (a.conversationId !== conversationId) {
          if (import.meta.env.DEV) {
            console.error("[orbitStore.getAttachmentsForMessage] SCOPE LEAK", {
              attachmentId: a.id, attachmentConv: a.conversationId, requestedConv: conversationId,
            });
          }
          return false;
        }
        return true;
      });
  },

  getAttachmentScoped: (conversationId, attachmentId) => {
    const att = get().attachments[attachmentId];
    if (!att) return null;
    if (att.conversationId !== conversationId) {
      if (import.meta.env.DEV) {
        console.error("[orbitStore.getAttachmentScoped] SCOPE LEAK", {
          attachmentId, attachmentConv: att.conversationId, requestedConv: conversationId,
        });
      }
      return null;
    }
    return att;
  },
}));

/**
 * Canonical disambiguated export for the MESSAGING store.
 * Prefer this name over useOrbitStore to avoid collision with the profile store.
 * useOrbitStore is kept as a deprecated alias for backward compat during transition.
 */
export const useOrbitMessagingStore = useOrbitStore;
