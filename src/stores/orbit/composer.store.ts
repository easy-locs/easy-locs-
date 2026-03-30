/**
 * orbitComposerStore — Single source of truth for ALL composer state.
 * Every field is keyed by conversationId. Zero cross-conversation leaking.
 */
import { create } from "zustand";

export interface ReplyDraft {
  msgId: string;
  content: string;
  senderName?: string;
}

export interface EditDraft {
  messageId: string;
  originalBody: string;
}

export interface VoiceDraft {
  url: string;
  blob: Blob;
  durationSeconds: number;
}

interface ComposerState {
  /** Currently active conversationId */
  activeConversationId: string | null;

  /** Per-conversation drafts */
  drafts: Record<string, string>;
  replies: Record<string, ReplyDraft | null>;
  edits: Record<string, EditDraft | null>;
  voiceDrafts: Record<string, VoiceDraft | null>;
  sending: Record<string, boolean>;

  // ── Actions ──
  setActiveConversation: (id: string | null) => void;

  getDraft: (conversationId: string) => string;
  setDraft: (conversationId: string, value: string) => void;
  clearDraft: (conversationId: string) => void;

  setReply: (conversationId: string, reply: ReplyDraft | null) => void;
  clearReply: (conversationId: string) => void;

  startEdit: (conversationId: string, edit: EditDraft) => void;
  cancelEdit: (conversationId: string) => void;

  setVoiceDraft: (conversationId: string, draft: VoiceDraft | null) => void;
  clearVoiceDraft: (conversationId: string) => void;

  setSending: (conversationId: string, value: boolean) => void;

  /** Clear all state for a conversation after send */
  clearAfterSend: (conversationId: string) => void;

  /** Get the current composer mode for a conversation */
  getMode: (conversationId: string) => "idle" | "typing" | "replying" | "editing" | "voice" | "sending";
}

export const useOrbitComposerStore = create<ComposerState>((set, get) => ({
  activeConversationId: null,
  drafts: {},
  replies: {},
  edits: {},
  voiceDrafts: {},
  sending: {},

  setActiveConversation: (id) => set({ activeConversationId: id }),

  getDraft: (conversationId) => get().drafts[conversationId] || "",

  setDraft: (conversationId, value) =>
    set((s) => ({
      drafts: { ...s.drafts, [conversationId]: value },
    })),

  clearDraft: (conversationId) =>
    set((s) => {
      const { [conversationId]: _, ...rest } = s.drafts;
      return { drafts: rest };
    }),

  setReply: (conversationId, reply) =>
    set((s) => ({
      replies: { ...s.replies, [conversationId]: reply },
      // Clear edit when setting reply
      edits: { ...s.edits, [conversationId]: null },
    })),

  clearReply: (conversationId) =>
    set((s) => ({
      replies: { ...s.replies, [conversationId]: null },
    })),

  startEdit: (conversationId, edit) =>
    set((s) => ({
      edits: { ...s.edits, [conversationId]: edit },
      // Clear reply when editing
      replies: { ...s.replies, [conversationId]: null },
      // Set draft to original body for editing
      drafts: { ...s.drafts, [conversationId]: edit.originalBody },
    })),

  cancelEdit: (conversationId) =>
    set((s) => ({
      edits: { ...s.edits, [conversationId]: null },
      drafts: { ...s.drafts, [conversationId]: "" },
    })),

  setVoiceDraft: (conversationId, draft) =>
    set((s) => ({
      voiceDrafts: { ...s.voiceDrafts, [conversationId]: draft },
    })),

  clearVoiceDraft: (conversationId) =>
    set((s) => {
      const existing = s.voiceDrafts[conversationId];
      if (existing?.url) URL.revokeObjectURL(existing.url);
      return { voiceDrafts: { ...s.voiceDrafts, [conversationId]: null } };
    }),

  setSending: (conversationId, value) =>
    set((s) => ({
      sending: { ...s.sending, [conversationId]: value },
    })),

  clearAfterSend: (conversationId) =>
    set((s) => {
      const { [conversationId]: _, ...restDrafts } = s.drafts;
      return {
        drafts: restDrafts,
        replies: { ...s.replies, [conversationId]: null },
        edits: { ...s.edits, [conversationId]: null },
        sending: { ...s.sending, [conversationId]: false },
      };
    }),

  getMode: (conversationId) => {
    const s = get();
    if (s.sending[conversationId]) return "sending";
    if (s.edits[conversationId]) return "editing";
    if (s.voiceDrafts[conversationId]) return "voice";
    if (s.replies[conversationId]) return "replying";
    if ((s.drafts[conversationId] || "").trim()) return "typing";
    return "idle";
  },
}));
