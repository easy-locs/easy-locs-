/**
 * Tests for message deduplication engine.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  isMessageDuplicate,
  markMessageSeen,
  generateIdempotencyKey,
  reconcileTempToServer,
  deduplicateMessages,
  idRegistry,
  tempIdRegistry,
  idempotencyRegistry,
} from "@/lib/dedup/message-dedup";

describe("Message Deduplication", () => {
  beforeEach(() => {
    // Clear registries between tests
    idRegistry["seen"].clear();
    tempIdRegistry["seen"].clear();
    idempotencyRegistry["seen"].clear();
  });

  it("detects duplicate by server ID", () => {
    markMessageSeen({ id: "msg-1" });
    const result = isMessageDuplicate({ id: "msg-1" });
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toBe("server_id");
  });

  it("detects duplicate by tempId", () => {
    markMessageSeen({ tempId: "temp-1" });
    const result = isMessageDuplicate({ tempId: "temp-1" });
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toBe("temp_id");
  });

  it("detects duplicate by idempotency key", () => {
    const key = generateIdempotencyKey("user-1", "conv-1", "temp-1");
    markMessageSeen({ idempotencyKey: key });
    const result = isMessageDuplicate({ idempotencyKey: key });
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toBe("idempotency_key");
  });

  it("allows new messages through", () => {
    const result = isMessageDuplicate({ id: "new-msg" });
    expect(result.isDuplicate).toBe(false);
  });

  it("reconciles tempId to serverId", () => {
    reconcileTempToServer("temp-1", "server-1");
    expect(isMessageDuplicate({ tempId: "temp-1" }).isDuplicate).toBe(true);
    expect(isMessageDuplicate({ id: "server-1" }).isDuplicate).toBe(true);
  });

  it("generates consistent idempotency keys", () => {
    const key1 = generateIdempotencyKey("u1", "c1", "t1");
    const key2 = generateIdempotencyKey("u1", "c1", "t1");
    expect(key1).toBe(key2);
    expect(key1).toBe("msg:u1:c1:t1");
  });
});

describe("deduplicateMessages", () => {
  it("removes duplicates by ID", () => {
    const messages = [
      { id: "1", body: "hello", created_at: "2026-01-01T00:00:00Z" },
      { id: "2", body: "world", created_at: "2026-01-01T00:01:00Z" },
      { id: "1", body: "hello updated", created_at: "2026-01-01T00:02:00Z" },
    ];
    const result = deduplicateMessages(messages);
    expect(result).toHaveLength(2);
    // Should keep the more recent version of id=1
    const msg1 = result.find(m => m.id === "1");
    expect(msg1?.body).toBe("hello updated");
  });

  it("handles empty array", () => {
    expect(deduplicateMessages([])).toEqual([]);
  });

  it("preserves unique messages", () => {
    const messages = [
      { id: "1", created_at: "2026-01-01T00:00:00Z" },
      { id: "2", created_at: "2026-01-01T00:01:00Z" },
      { id: "3", created_at: "2026-01-01T00:02:00Z" },
    ];
    expect(deduplicateMessages(messages)).toHaveLength(3);
  });
});
