/**
 * Tests for canonical infrastructure — normalizers, dedup, state machines.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeMessage,
  normalizeConversation,
  normalizeCallSession,
  normalizeUser,
} from "@/lib/normalizers";

describe("normalizeMessage", () => {
  it("normalizes a raw DB row to canonical format", () => {
    const raw = {
      id: "msg-1",
      conversation_id: "conv-1",
      sender_user_id: "user-1",
      sender_orbit_id: "orbit_user1",
      type: "text",
      body: "Hello",
      metadata: { schemaVersion: 1 },
      created_at: "2026-01-01T00:00:00Z",
    };
    const msg = normalizeMessage(raw);
    expect(msg.id).toBe("msg-1");
    expect(msg.conversationId).toBe("conv-1");
    expect(msg.senderUserId).toBe("user-1");
    expect(msg.senderOrbitId).toBe("orbit_user1");
    expect(msg.type).toBe("text");
    expect(msg.body).toBe("Hello");
    expect(msg.status).toBe("sent");
    expect(msg.isOptimistic).toBe(false);
  });

  it("marks optimistic messages correctly", () => {
    const raw = { tempId: "temp-1", body: "Pending" };
    const msg = normalizeMessage(raw);
    expect(msg.isOptimistic).toBe(true);
    expect(msg.status).toBe("sending");
    expect(msg.tempId).toBe("temp-1");
  });

  it("handles missing fields gracefully", () => {
    const msg = normalizeMessage({});
    expect(msg.id).toBeTruthy(); // auto-generated UUID
    expect(msg.conversationId).toBe("");
    expect(msg.body).toBe("");
    expect(msg.type).toBe("text");
  });

  it("maps legacy field names", () => {
    const raw = {
      id: "msg-2",
      conversationId: "conv-2",
      senderUserId: "user-2",
      content: "Legacy content",
    };
    const msg = normalizeMessage(raw);
    expect(msg.conversationId).toBe("conv-2");
    expect(msg.senderUserId).toBe("user-2");
    expect(msg.body).toBe("Legacy content");
  });
});

describe("normalizeConversation", () => {
  it("normalizes a raw conversation", () => {
    const raw = {
      id: "conv-1",
      type: "group",
      title: "Team Chat",
      participants: ["user-1", "user-2"],
      last_message_at: "2026-01-01T00:00:00Z",
      unread_count: 5,
    };
    const conv = normalizeConversation(raw);
    expect(conv.id).toBe("conv-1");
    expect(conv.type).toBe("group");
    expect(conv.title).toBe("Team Chat");
    expect(conv.participants).toEqual(["user-1", "user-2"]);
    expect(conv.unreadCount).toBe(5);
  });

  it("extracts user_id from participant objects", () => {
    const raw = {
      id: "conv-2",
      participants: [{ user_id: "u1" }, { id: "u2" }],
    };
    const conv = normalizeConversation(raw);
    expect(conv.participants).toEqual(["u1", "u2"]);
  });
});

describe("normalizeCallSession", () => {
  it("normalizes a call session", () => {
    const raw = {
      id: "call-1",
      conversation_id: "conv-1",
      caller_id: "user-1",
      callee_id: "user-2",
      type: "video",
      call_type: "video",
      status: "active",
      started_at: "2026-01-01T00:00:00Z",
    };
    const session = normalizeCallSession(raw);
    expect(session.id).toBe("call-1");
    expect(session.state).toBe("active");
    expect(session.callType).toBe("video");
  });
});

describe("normalizeUser", () => {
  it("normalizes a user profile", () => {
    const raw = {
      id: "user-1",
      orbit_id: "orbit_user1",
      name: "John",
      avatar_url: "https://example.com/avatar.jpg",
    };
    const user = normalizeUser(raw);
    expect(user.id).toBe("user-1");
    expect(user.orbitId).toBe("orbit_user1");
    expect(user.displayName).toBe("John");
    expect(user.avatarUrl).toBe("https://example.com/avatar.jpg");
  });
});
