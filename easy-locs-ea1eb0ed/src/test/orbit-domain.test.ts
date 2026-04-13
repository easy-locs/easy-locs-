/**
 * Tests for Orbit canonical domain — normalizers, pipelines, resolvers, machines, guards.
 */
import { describe, it, expect } from "vitest";

// ── Normalizers ──
import { normalizeConversation } from "@/domains/orbit/normalizers/normalize-conversation";
import { normalizeOrbitMessage } from "@/domains/orbit/normalizers/normalize-orbit-message";
import { normalizeCallSession } from "@/domains/orbit/normalizers/normalize-call-session";
import { normalizeAttachment } from "@/domains/orbit/normalizers/normalize-attachment";
import { normalizeReceipt } from "@/domains/orbit/normalizers/normalize-receipt";

// ── Resolvers ──
import {
  resolveCanonicalUserId,
  resolveCanonicalConversationId,
  resolveCanonicalParticipantId,
  isValidOrbitUUID,
  buildOrbitAlias,
} from "@/domains/orbit/resolvers";

// ── Pipelines ──
import { validateTextInput, buildOptimisticTextMessage, reconcileTextMessage } from "@/domains/orbit/pipelines/message/send-text.pipeline";
import { validateMediaInput, resolveAttachmentKind } from "@/domains/orbit/pipelines/message/send-media.pipeline";
import { validateVoiceInput } from "@/domains/orbit/pipelines/message/send-voice.pipeline";
import { buildDirectPairKey, findOrCreateDirect } from "@/domains/orbit/pipelines/conversation/find-or-create-direct.pipeline";
import { shouldSendReadReceipt } from "@/domains/orbit/pipelines/receipts/receipt.pipeline";
import { attemptCallTransition, isCallTerminal, shouldTimeoutRinging } from "@/domains/orbit/pipelines/call/call-lifecycle.pipeline";
import { validateGroupInput, deduplicateMembers } from "@/domains/orbit/pipelines/group/create-group.pipeline";
import { searchConversationsLocal } from "@/domains/orbit/pipelines/search/orbit-search.pipeline";
import { captureDraft, restoreDraft, clearDraft, hasDraft } from "@/domains/orbit/pipelines/drafts/draft.pipeline";

// ── Guards ──
import { acquireSubmitLock, isContentDuplicate } from "@/domains/orbit/guards/send-guard";

// ── Selectors ──
import { selectSortedConversations, selectTotalUnreadCount, selectPendingMessages, selectLastMessage } from "@/domains/orbit/selectors";

// ══════════════════════════════════════════════════════════
// NORMALIZER TESTS
// ══════════════════════════════════════════════════════════

describe("normalizeConversation", () => {
  it("normalizes DB row to canonical", () => {
    const raw = { id: "c1", type: "group", participants: [{ user_id: "u1" }, { user_id: "u2" }], title: "Test", created_at: "2024-01-01" };
    const c = normalizeConversation(raw);
    expect(c.id).toBe("c1");
    expect(c.kind).toBe("group");
    expect(c.participantIds).toEqual(["u1", "u2"]);
    expect(c.title).toBe("Test");
  });

  it("handles null gracefully", () => {
    const c = normalizeConversation(null);
    expect(c.id).toBe("");
    expect(c.kind).toBe("direct");
  });

  it("maps legacy kind", () => {
    const c = normalizeConversation({ id: "x", type: "invalid_kind" });
    expect(c.kind).toBe("direct"); // fallback
  });

  it("extracts participantIds from string array", () => {
    const c = normalizeConversation({ id: "x", participants: ["u1", "u2", "u3"] });
    expect(c.participantIds).toEqual(["u1", "u2", "u3"]);
  });
});

describe("normalizeOrbitMessage", () => {
  it("normalizes DB row", () => {
    const raw = { id: "m1", conversation_id: "c1", sender_user_id: "u1", type: "text", body: "Hello", created_at: "2024-01-01" };
    const m = normalizeOrbitMessage(raw);
    expect(m.id).toBe("m1");
    expect(m.conversationId).toBe("c1");
    expect(m.senderId).toBe("u1");
    expect(m.type).toBe("text");
    expect(m.text).toBe("Hello");
    expect(m.status).toBe("sent");
  });

  it("handles pending message", () => {
    const m = normalizeOrbitMessage({ id: "", pending: true, body: "test" });
    expect(m.status).toBe("sending");
  });

  it("handles failed message", () => {
    const m = normalizeOrbitMessage({ id: "m1", failed: true });
    expect(m.status).toBe("failed");
  });

  it("handles null", () => {
    const m = normalizeOrbitMessage(null);
    expect(m.id).toBe("");
    expect(m.type).toBe("text");
  });
});

describe("normalizeCallSession", () => {
  it("normalizes call log row", () => {
    const raw = { id: "cl1", caller_orbit_id: "orbit_abc", receiver_orbit_id: "orbit_def", is_video: true, status: "ended", duration_seconds: 120 };
    const cs = normalizeCallSession(raw);
    expect(cs.id).toBe("cl1");
    expect(cs.mode).toBe("video");
    expect(cs.status).toBe("ended");
    expect(cs.durationSeconds).toBe(120);
  });

  it("maps legacy statuses", () => {
    expect(normalizeCallSession({ status: "completed" }).status).toBe("ended");
    expect(normalizeCallSession({ status: "no_answer" }).status).toBe("missed");
    expect(normalizeCallSession({ status: "rejected" }).status).toBe("declined");
  });
});

describe("normalizeAttachment", () => {
  it("resolves kind from mime", () => {
    const a = normalizeAttachment({ mime_type: "image/png", url: "https://x.com/img.png" });
    expect(a.kind).toBe("image");
    expect(a.uploadStatus).toBe("uploaded");
  });
});

describe("normalizeReceipt", () => {
  it("normalizes read receipt", () => {
    const r = normalizeReceipt({ message_id: "m1", user_id: "u1", kind: "read" });
    expect(r.kind).toBe("read");
    expect(r.messageId).toBe("m1");
  });
});

// ══════════════════════════════════════════════════════════
// RESOLVER TESTS
// ══════════════════════════════════════════════════════════

describe("ID Resolvers", () => {
  it("resolves canonical user id", () => {
    expect(resolveCanonicalUserId("abc-def")).toBe("abc-def");
    expect(resolveCanonicalUserId(null)).toBeNull();
    expect(resolveCanonicalUserId("orbit_abc")).toBe("orbit_abc");
  });

  it("resolves conversation id from various sources", () => {
    expect(resolveCanonicalConversationId({ conversationId: "c1" })).toBe("c1");
    expect(resolveCanonicalConversationId({ conversation_id: "c2" })).toBe("c2");
    expect(resolveCanonicalConversationId({ threadId: "t1" })).toBe("t1");
    expect(resolveCanonicalConversationId({ v2ConversationId: "v2" })).toBe("v2");
  });

  it("resolves participant id from object", () => {
    expect(resolveCanonicalParticipantId({ userId: "u1" })).toBe("u1");
    expect(resolveCanonicalParticipantId({ user_id: "u2" })).toBe("u2");
    expect(resolveCanonicalParticipantId("u3")).toBe("u3");
  });

  it("validates UUID", () => {
    expect(isValidOrbitUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidOrbitUUID("not-a-uuid")).toBe(false);
  });

  it("builds orbit alias", () => {
    expect(buildOrbitAlias("550e8400-e29b-41d4-a716-446655440000")).toBe("orbit_550e8400");
  });
});

// ══════════════════════════════════════════════════════════
// PIPELINE TESTS
// ══════════════════════════════════════════════════════════

describe("sendTextPipeline", () => {
  it("validates empty body", () => {
    expect(validateTextInput({ conversationId: "c1", senderId: "u1", senderOrbitId: "o1", body: "" })).toBe("empty_body");
    expect(validateTextInput({ conversationId: "c1", senderId: "u1", senderOrbitId: "o1", body: "  " })).toBe("empty_body");
  });

  it("validates missing conversation", () => {
    expect(validateTextInput({ conversationId: "", senderId: "u1", senderOrbitId: "o1", body: "hi" })).toBe("missing_conversation_id");
  });

  it("passes valid input", () => {
    expect(validateTextInput({ conversationId: "c1", senderId: "u1", senderOrbitId: "o1", body: "Hello!" })).toBeNull();
  });

  it("builds optimistic message with correct shape", () => {
    const msg = buildOptimisticTextMessage({ conversationId: "c1", senderId: "u1", senderOrbitId: "o1", body: "Hello" });
    expect(msg.status).toBe("sending");
    expect(msg.type).toBe("text");
    expect(msg.tempId).toBeTruthy();
    expect(msg.text).toBe("Hello");
    expect(msg.conversationId).toBe("c1");
  });

  it("reconciles with server data", () => {
    const opt = buildOptimisticTextMessage({ conversationId: "c1", senderId: "u1", senderOrbitId: "o1", body: "Test" });
    const reconciled = reconcileTextMessage(opt, { id: "server-123", created_at: "2024-01-01T00:00:00Z" });
    expect(reconciled.id).toBe("server-123");
    expect(reconciled.status).toBe("sent");
  });
});

describe("sendMediaPipeline", () => {
  it("validates missing file", () => {
    expect(validateMediaInput({ conversationId: "c1", senderId: "u1", senderOrbitId: "o1", file: null as any })).toBe("no_file");
  });

  it("resolves attachment kind", () => {
    expect(resolveAttachmentKind(new File(["x"], "img.png", { type: "image/png" }))).toBe("image");
    expect(resolveAttachmentKind(new File(["x"], "vid.mp4", { type: "video/mp4" }))).toBe("video");
    expect(resolveAttachmentKind(new File(["x"], "doc.pdf", { type: "application/pdf" }))).toBe("file");
  });
});

describe("sendVoicePipeline", () => {
  it("validates missing blob", () => {
    expect(validateVoiceInput({ conversationId: "c1", senderId: "u1", senderOrbitId: "o1", blob: null as any, durationSeconds: 5, localUrl: "" })).toBe("no_audio_blob");
  });

  it("validates invalid duration", () => {
    expect(validateVoiceInput({ conversationId: "c1", senderId: "u1", senderOrbitId: "o1", blob: new Blob(["x"]), durationSeconds: 0, localUrl: "" })).toBe("invalid_duration");
  });
});

describe("findOrCreateDirect", () => {
  it("builds deterministic pair key", () => {
    expect(buildDirectPairKey("u1", "u2")).toBe(buildDirectPairKey("u2", "u1"));
  });

  it("returns existing conversation", async () => {
    const result = await findOrCreateDirect("u1", "u2", async () => ({ id: "existing" }), async () => ({ id: "new" }));
    expect(result.id).toBe("existing");
  });

  it("creates when not found", async () => {
    const result = await findOrCreateDirect("u1", "u2", async () => null, async () => ({ id: "created" }));
    expect(result.id).toBe("created");
  });
});

describe("receiptPipeline", () => {
  it("blocks read receipt for own messages", () => {
    expect(shouldSendReadReceipt("m1", "u1", "u1")).toBe(false);
    expect(shouldSendReadReceipt("m1", "u2", "u1")).toBe(true);
  });
});

describe("callLifecyclePipeline", () => {
  it("allows valid transitions", () => {
    expect(attemptCallTransition("idle", "INITIATE").ok).toBe(true);
    expect(attemptCallTransition("idle", "INITIATE").newState).toBe("calling");
    expect(attemptCallTransition("ringing", "ACCEPT").newState).toBe("connecting");
  });

  it("blocks invalid transitions", () => {
    expect(attemptCallTransition("ended", "ACCEPT").ok).toBe(false);
    expect(attemptCallTransition("active", "INITIATE").ok).toBe(false);
  });

  it("identifies terminal states", () => {
    expect(isCallTerminal("ended")).toBe(true);
    expect(isCallTerminal("missed")).toBe(true);
    expect(isCallTerminal("active")).toBe(false);
  });

  it("detects ringing timeout", () => {
    expect(shouldTimeoutRinging(Date.now() - 31_000)).toBe(true);
    expect(shouldTimeoutRinging(Date.now())).toBe(false);
  });
});

describe("createGroupPipeline", () => {
  it("validates missing title", () => {
    expect(validateGroupInput({ title: "", memberUserIds: ["u1"], createdByUserId: "u0" })).toBe("missing_title");
  });

  it("validates no members", () => {
    expect(validateGroupInput({ title: "G", memberUserIds: [], createdByUserId: "u0" })).toBe("no_members");
  });

  it("deduplicates members and includes creator", () => {
    const result = deduplicateMembers("u0", ["u1", "u2", "u0", "u1"]);
    expect(result).toHaveLength(3);
    expect(result).toContain("u0");
  });
});

describe("searchPipeline", () => {
  it("searches conversations by title", () => {
    const convos = [
      { id: "1", kind: "direct" as const, title: "Alice", participantIds: [], avatarUrl: null, createdAt: "", updatedAt: "", lastMessageId: null, lastMessagePreview: null, lastMessageAt: null, unreadCount: 0, isArchived: false, isMuted: false, isEphemeral: false, ephemeralConfig: null },
      { id: "2", kind: "direct" as const, title: "Bob", participantIds: [], avatarUrl: null, createdAt: "", updatedAt: "", lastMessageId: null, lastMessagePreview: null, lastMessageAt: null, unreadCount: 0, isArchived: false, isMuted: false, isEphemeral: false, ephemeralConfig: null },
    ];
    expect(searchConversationsLocal(convos, "ali")).toHaveLength(1);
    expect(searchConversationsLocal(convos, "")).toHaveLength(2);
  });
});

describe("draftPipeline", () => {
  it("captures and restores draft", () => {
    captureDraft("c1", "Hello draft");
    expect(hasDraft("c1")).toBe(true);
    const d = restoreDraft("c1");
    expect(d?.text).toBe("Hello draft");
  });

  it("clears draft", () => {
    captureDraft("c2", "temp");
    clearDraft("c2");
    expect(hasDraft("c2")).toBe(false);
    expect(restoreDraft("c2")).toBeNull();
  });

  it("ignores empty drafts", () => {
    captureDraft("c3", "   ");
    expect(hasDraft("c3")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
// GUARD TESTS
// ══════════════════════════════════════════════════════════

describe("sendGuard", () => {
  it("blocks double-tap submit", () => {
    const first = acquireSubmitLock("guard-test-1");
    const second = acquireSubmitLock("guard-test-1");
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("detects content duplicate", () => {
    const first = isContentDuplicate("guard-test-2", "Hello world");
    const second = isContentDuplicate("guard-test-2", "Hello world");
    expect(first).toBe(false);
    expect(second).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════
// SELECTOR TESTS
// ══════════════════════════════════════════════════════════

describe("selectors", () => {
  const makeConvo = (id: string, unread: number, lastAt: string) => ({
    id, kind: "direct" as const, participantIds: [], title: null, avatarUrl: null,
    createdAt: "2024-01-01", updatedAt: "2024-01-01", lastMessageId: null,
    lastMessagePreview: null, lastMessageAt: lastAt, unreadCount: unread,
    isArchived: false, isMuted: false, isEphemeral: false, ephemeralConfig: null,
  });

  it("sorts by lastMessageAt descending", () => {
    const sorted = selectSortedConversations([
      makeConvo("c1", 0, "2024-01-01"),
      makeConvo("c2", 0, "2024-06-01"),
    ]);
    expect(sorted[0].id).toBe("c2");
  });

  it("counts total unread", () => {
    expect(selectTotalUnreadCount([makeConvo("c1", 3, ""), makeConvo("c2", 7, "")])).toBe(10);
  });

  it("selects pending messages", () => {
    const msgs = [
      { id: "m1", tempId: null, conversationId: "c1", senderId: "u1", senderOrbitId: null, type: "text" as const, text: "hi", attachmentIds: [], replyToId: null, reactionSummary: null, createdAt: "", updatedAt: null, status: "sending" as const, isDeleted: false, isEdited: false, metadata: {} },
      { id: "m2", tempId: null, conversationId: "c1", senderId: "u1", senderOrbitId: null, type: "text" as const, text: "yo", attachmentIds: [], replyToId: null, reactionSummary: null, createdAt: "", updatedAt: null, status: "sent" as const, isDeleted: false, isEdited: false, metadata: {} },
    ];
    expect(selectPendingMessages(msgs, "c1")).toHaveLength(1);
  });

  it("selects last message", () => {
    const msgs = [
      { id: "m1", tempId: null, conversationId: "c1", senderId: "u1", senderOrbitId: null, type: "text" as const, text: "first", attachmentIds: [], replyToId: null, reactionSummary: null, createdAt: "2024-01-01", updatedAt: null, status: "sent" as const, isDeleted: false, isEdited: false, metadata: {} },
      { id: "m2", tempId: null, conversationId: "c1", senderId: "u1", senderOrbitId: null, type: "text" as const, text: "last", attachmentIds: [], replyToId: null, reactionSummary: null, createdAt: "2024-06-01", updatedAt: null, status: "sent" as const, isDeleted: false, isEdited: false, metadata: {} },
    ];
    expect(selectLastMessage(msgs, "c1")?.text).toBe("last");
  });
});
