import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  acquireSubmitLock,
  checkIdempotencyGuard,
  getSendLockDebugSnapshot,
  issueRequestId,
  registerInflightRequest,
  releaseInflightRequest,
  releaseSubmitLock,
  resetSendLocksForTests,
  SendLockTimings,
} from "./send-locks";

describe("send-locks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSendLocksForTests();
  });

  it("bloque seulement le double tap immédiat sur même conversation + action", () => {
    const first = acquireSubmitLock({ type: "send_text", conversationId: "c1", body: "hello" });
    const second = acquireSubmitLock({ type: "send_text", conversationId: "c1", body: "hello" });
    const otherConversation = acquireSubmitLock({ type: "send_text", conversationId: "c2", body: "hello" });
    const otherAction = acquireSubmitLock({ type: "send_media", conversationId: "c1", file: new File(["x"], "a.png"), uploadFn: async () => "", pathPrefix: "x" });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(otherConversation).not.toBeNull();
    expect(otherAction).not.toBeNull();
  });

  it("libère automatiquement le submit lock après la fenêtre courte", () => {
    const first = acquireSubmitLock({ type: "send_text", conversationId: "c1", body: "hello" });
    expect(first).not.toBeNull();

    vi.advanceTimersByTime(SendLockTimings.SUBMIT_LOCK_TTL_MS + 10);

    const next = acquireSubmitLock({ type: "send_text", conversationId: "c1", body: "hello again" });
    expect(next).not.toBeNull();
  });

  it("ne bloque pas un nouveau message normal hors fenêtre idempotente", () => {
    const first = checkIdempotencyGuard({ type: "send_text", conversationId: "c1", body: "hello" });
    const immediateDuplicate = checkIdempotencyGuard({ type: "send_text", conversationId: "c1", body: " hello   " });

    vi.advanceTimersByTime(SendLockTimings.IDEMPOTENCY_WINDOW_MS + 10);

    const laterSameMessage = checkIdempotencyGuard({ type: "send_text", conversationId: "c1", body: "hello" });

    expect(first).toBe(true);
    expect(immediateDuplicate).toBe(false);
    expect(laterSameMessage).toBe(true);
  });

  it("enregistre puis relâche les requêtes inflight par requestId", () => {
    const requestId = issueRequestId();
    registerInflightRequest(requestId, { type: "send_text", conversationId: "c1", body: "hello" });
    expect(getSendLockDebugSnapshot().inflightRequests).toHaveLength(1);

    releaseInflightRequest(requestId);
    expect(getSendLockDebugSnapshot().inflightRequests).toHaveLength(0);
  });

  it("peut relâcher explicitement un submit lock", () => {
    const lock = acquireSubmitLock({ type: "send_text", conversationId: "c1", body: "hello" });
    expect(lock).not.toBeNull();
    releaseSubmitLock(lock);

    const next = acquireSubmitLock({ type: "send_text", conversationId: "c1", body: "hello" });
    expect(next).not.toBeNull();
  });
});
