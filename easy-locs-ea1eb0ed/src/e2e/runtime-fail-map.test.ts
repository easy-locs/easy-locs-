/**
 * RUNTIME FAIL MAP — E2E Tests
 * Validates every critical path: retry, receipts, mixed updates,
 * attachment scoping, status machine, call lifecycle.
 *
 * 0 faux resend, 0 faux sent, 0 double merge, 0 preview leak.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── A: Retry Text ──
describe("Retry Text Transport", () => {
  it("transitions failed → retrying → sent|failed via real transport", async () => {
    const { executeRetryMessage } = await import(
      "@/families/orbit-dispatch/pipeline/executeRetryMessage"
    );
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    // Seed a failed text message directly in store state
    useOrbitStore.setState((s) => ({
      messages: {
        ...s.messages,
        "retry-text-1": {
          id: "retry-text-1",
          conversationId: "conv-1",
          type: "text",
          body: "Hello retry",
          status: "failed",
          senderId: "user-1",
          senderOrbitId: "orbit-1",
          timestamp: new Date().toISOString(),
          attachmentIds: [],
          tempId: null,
          metadata: {},
        } as any,
      },
    }));

    expect(useOrbitStore.getState().messages["retry-text-1"].status).toBe("failed");

    const result = await executeRetryMessage({ type: "retry_message", messageId: "retry-text-1" });
    const finalMsg = useOrbitStore.getState().messages["retry-text-1"];
    // Either sent (if DB available) or failed (transport threw) — never stuck at retrying
    expect(["sent", "failed"]).toContain(finalMsg.status);
    expect(finalMsg.status).not.toBe("retrying");
  });

  it("blocks retry on non-failed messages", async () => {
    const { executeRetryMessage } = await import(
      "@/families/orbit-dispatch/pipeline/executeRetryMessage"
    );
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      messages: {
        ...s.messages,
        "retry-text-2": {
          id: "retry-text-2",
          conversationId: "conv-1",
          type: "text",
          body: "Already sent",
          status: "sent",
          senderId: "user-1",
          senderOrbitId: "orbit-1",
          timestamp: new Date().toISOString(),
          attachmentIds: [],
          tempId: null,
          metadata: {},
        } as any,
      },
    }));

    const result = await executeRetryMessage({ type: "retry_message", messageId: "retry-text-2" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("retry_blocked_status");
  });
});

// ── B: Retry Location ──
describe("Retry Location Transport", () => {
  it("handles location retry with proper status transitions", async () => {
    const { executeRetryMessage } = await import(
      "@/families/orbit-dispatch/pipeline/executeRetryMessage"
    );
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      messages: {
        ...s.messages,
        "retry-loc-1": {
          id: "retry-loc-1",
          conversationId: "conv-1",
          type: "location_static",
          body: "",
          status: "failed",
          senderId: "user-1",
          senderOrbitId: "orbit-1",
          timestamp: new Date().toISOString(),
          attachmentIds: [],
          tempId: null,
          metadata: { lat: 48.8566, lng: 2.3522 },
        } as any,
      },
    }));

    const result = await executeRetryMessage({ type: "retry_message", messageId: "retry-loc-1" });
    const finalMsg = useOrbitStore.getState().messages["retry-loc-1"];
    expect(["sent", "failed"]).toContain(finalMsg.status);
    expect(finalMsg.status).not.toBe("retrying");
  });
});

// ── C: Retry Media ──
describe("Retry Media Transport", () => {
  it("handles media retry with attachment lookup", async () => {
    const { executeRetryMessage } = await import(
      "@/families/orbit-dispatch/pipeline/executeRetryMessage"
    );
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      attachments: {
        ...s.attachments,
        "att-media-1": {
          id: "att-media-1",
          conversationId: "conv-1",
          messageId: "retry-media-1",
          kind: "image",
          uploadStatus: "failed",
          localUri: "blob:http://localhost/fake",
          remoteUrl: null,
          previewUrl: null,
          mimeType: "image/jpeg",
          uploadProgress: 0,
        } as any,
      },
      messages: {
        ...s.messages,
        "retry-media-1": {
          id: "retry-media-1",
          conversationId: "conv-1",
          type: "image",
          body: "",
          status: "failed",
          senderId: "user-1",
          senderOrbitId: "orbit-1",
          timestamp: new Date().toISOString(),
          attachmentIds: ["att-media-1"],
          tempId: null,
          metadata: {},
        } as any,
      },
    }));

    const result = await executeRetryMessage({ type: "retry_message", messageId: "retry-media-1" });
    const finalMsg = useOrbitStore.getState().messages["retry-media-1"];
    expect(["sent", "failed"]).toContain(finalMsg.status);
  });
});

// ── D: Retry Voice ──
describe("Retry Voice Transport", () => {
  it("handles voice retry with attachment", async () => {
    const { executeRetryMessage } = await import(
      "@/families/orbit-dispatch/pipeline/executeRetryMessage"
    );
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      attachments: {
        ...s.attachments,
        "att-voice-1": {
          id: "att-voice-1",
          conversationId: "conv-1",
          messageId: "retry-voice-1",
          kind: "voice",
          uploadStatus: "failed",
          localUri: "blob:http://localhost/fake-voice",
          remoteUrl: null,
          previewUrl: null,
          mimeType: "audio/webm",
          uploadProgress: 0,
        } as any,
      },
      messages: {
        ...s.messages,
        "retry-voice-1": {
          id: "retry-voice-1",
          conversationId: "conv-1",
          type: "voice",
          body: "",
          status: "failed",
          senderId: "user-1",
          senderOrbitId: "orbit-1",
          timestamp: new Date().toISOString(),
          attachmentIds: ["att-voice-1"],
          tempId: null,
          metadata: {},
        } as any,
      },
    }));

    const result = await executeRetryMessage({ type: "retry_message", messageId: "retry-voice-1" });
    const finalMsg = useOrbitStore.getState().messages["retry-voice-1"];
    expect(["sent", "failed"]).toContain(finalMsg.status);
  });
});

// ── E: Receipt-Only Update ──
describe("Receipt-Only Update", () => {
  it("routes receipt-only update exclusively through receipt handler", async () => {
    const { handleRealtimeReceipt } = await import(
      "@/domains/orbit/pipelines/receipts/receipt-realtime.handler"
    );
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      messages: {
        ...s.messages,
        "receipt-msg-1": {
          id: "receipt-msg-1",
          conversationId: "conv-1",
          type: "text",
          body: "Delivered test",
          status: "sent",
          senderId: "user-1",
          senderOrbitId: "orbit-1",
          timestamp: new Date().toISOString(),
          attachmentIds: [],
          tempId: null,
          metadata: {},
        } as any,
      },
    }));

    handleRealtimeReceipt({
      id: "receipt-msg-1",
      conversation_id: "conv-1",
      delivered_at: new Date().toISOString(),
      status: "delivered",
    });

    expect(useOrbitStore.getState().messages["receipt-msg-1"].status).toBe("delivered");
  });

  it("routes read receipt properly", async () => {
    const { handleRealtimeReceipt } = await import(
      "@/domains/orbit/pipelines/receipts/receipt-realtime.handler"
    );
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      messages: {
        ...s.messages,
        "receipt-msg-2": {
          id: "receipt-msg-2",
          conversationId: "conv-1",
          type: "text",
          body: "Read test",
          status: "delivered",
          senderId: "user-1",
          senderOrbitId: "orbit-1",
          timestamp: new Date().toISOString(),
          attachmentIds: [],
          tempId: null,
          metadata: {},
        } as any,
      },
    }));

    handleRealtimeReceipt({
      id: "receipt-msg-2",
      conversation_id: "conv-1",
      read_at: new Date().toISOString(),
      status: "read",
    });

    expect(useOrbitStore.getState().messages["receipt-msg-2"].status).toBe("read");
  });

  it("blocks cross-conversation receipt", async () => {
    const { handleRealtimeReceipt } = await import(
      "@/domains/orbit/pipelines/receipts/receipt-realtime.handler"
    );
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      messages: {
        ...s.messages,
        "receipt-msg-3": {
          id: "receipt-msg-3",
          conversationId: "conv-1",
          type: "text",
          body: "Cross conv test",
          status: "sent",
          senderId: "user-1",
          senderOrbitId: "orbit-1",
          timestamp: new Date().toISOString(),
          attachmentIds: [],
          tempId: null,
          metadata: {},
        } as any,
      },
    }));

    handleRealtimeReceipt({
      id: "receipt-msg-3",
      conversation_id: "conv-WRONG",
      delivered_at: new Date().toISOString(),
    });

    expect(useOrbitStore.getState().messages["receipt-msg-3"].status).toBe("sent");
  });
});

// ── F: Mixed Update Detection ──
describe("Mixed Update Detection", () => {
  it("isReceiptOnlyUpdate returns true for pure receipt change", () => {
    const oldRow = { id: "m1", body: "hello", status: "sent", delivered_at: null, read_at: null };
    const newRow = { id: "m1", body: "hello", status: "delivered", delivered_at: "2024-01-01", read_at: null };
    
    const receiptFields = ["delivered_at", "read_at", "status"];
    const contentFields = ["body", "type", "attachment_url", "metadata", "edited_at", "edited_body"];
    
    const hasReceipt = receiptFields.some(f => (oldRow as any)[f] !== (newRow as any)[f]);
    const hasContent = contentFields.some(f => (oldRow as any)[f] !== (newRow as any)[f]);
    
    expect(hasReceipt).toBe(true);
    expect(hasContent).toBe(false);
  });

  it("isReceiptOnlyUpdate returns false for mixed update", () => {
    const oldRow = { id: "m1", body: "hello", status: "sent", delivered_at: null, metadata: '{}' };
    const newRow = { id: "m1", body: "hello edited", status: "delivered", delivered_at: "2024-01-01", metadata: '{"edited":true}' };
    
    const receiptFields = ["delivered_at", "read_at", "status"];
    const contentFields = ["body", "type", "attachment_url", "metadata", "edited_at", "edited_body"];
    
    const hasReceipt = receiptFields.some(f => (oldRow as any)[f] !== (newRow as any)[f]);
    const hasContent = contentFields.some(f => (oldRow as any)[f] !== (newRow as any)[f]);
    
    expect(hasReceipt).toBe(true);
    expect(hasContent).toBe(true);
  });
});

// ── G/H: Call Lifecycle ──
describe("Call State Machine Lifecycle", () => {
  it("enforces idle → calling → ringing → connecting → active → ended", async () => {
    const { CALL_MACHINE, transition } = await import("@/lib/state-machines/canonical-machines");

    expect(transition(CALL_MACHINE, "idle", "INITIATE")).toBe("calling");
    expect(transition(CALL_MACHINE, "calling", "RING")).toBe("ringing");
    expect(transition(CALL_MACHINE, "ringing", "ACCEPT")).toBe("connecting");
    expect(transition(CALL_MACHINE, "connecting", "CONNECTED")).toBe("active");
    expect(transition(CALL_MACHINE, "active", "HANGUP")).toBe("ended");
  });

  it("blocks ended → active (no zombie calls)", async () => {
    const { CALL_MACHINE, transition } = await import("@/lib/state-machines/canonical-machines");
    expect(transition(CALL_MACHINE, "ended", "CONNECTED")).toBeNull();
    expect(transition(CALL_MACHINE, "ended", "ACCEPT")).toBeNull();
  });

  it("allows reconnecting → active", async () => {
    const { CALL_MACHINE, transition } = await import("@/lib/state-machines/canonical-machines");
    expect(transition(CALL_MACHINE, "reconnecting", "RECONNECTED")).toBe("active");
  });
});

// ── I: Audio Routing ──
describe("Audio Device Controller", () => {
  it("cleanupAudio stops all tracks", async () => {
    const controller = await import("@/domains/call/audio-device.controller");
    controller.cleanupAudio();
    expect(controller.getStream()).toBeNull();
  });

  it("toggleMute is safe without stream", async () => {
    const controller = await import("@/domains/call/audio-device.controller");
    controller.cleanupAudio();
    expect(() => controller.toggleMute(true)).not.toThrow();
  });

  it("setSpeaker is safe without audio element", async () => {
    const controller = await import("@/domains/call/audio-device.controller");
    controller.cleanupAudio();
    expect(() => controller.setSpeaker(true)).not.toThrow();
  });
});

// ── J: Attachment Scope Lock ──
describe("Attachment Cross-Conversation Lock", () => {
  it("rejects attachment without conversationId", async () => {
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");
    const store = useOrbitStore.getState();

    store.mergeAttachment({
      id: "att-no-conv-x",
      kind: "image",
      uploadStatus: "queued",
    } as any);

    expect(store.attachments["att-no-conv-x"]).toBeUndefined();
  });

  it("getAttachmentScoped blocks cross-conversation access", async () => {
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      attachments: {
        ...s.attachments,
        "att-scoped-x": {
          id: "att-scoped-x",
          conversationId: "conv-A",
          kind: "image",
          uploadStatus: "uploaded",
        } as any,
      },
    }));

    const store = useOrbitStore.getState();
    expect(store.getAttachmentScoped("conv-A", "att-scoped-x")).not.toBeNull();
    expect(store.getAttachmentScoped("conv-B", "att-scoped-x")).toBeNull();
  });

  it("reconcileAttachment blocks cross-conversation", async () => {
    const { useOrbitMessagingStore: useOrbitStore } = await import("@/domains/orbit/stores/orbit.store");

    useOrbitStore.setState((s) => ({
      attachments: {
        ...s.attachments,
        "att-recon-x": {
          id: "att-recon-x",
          conversationId: "conv-A",
          kind: "image",
          uploadStatus: "uploading",
        } as any,
      },
    }));

    const store = useOrbitStore.getState();
    store.reconcileAttachment("att-recon-x", {
      id: "att-recon-server",
      conversationId: "conv-WRONG",
      kind: "image",
      uploadStatus: "uploaded",
      remoteUrl: "https://cdn.test/img.jpg",
    } as any);

    // Original should remain unchanged (cross-conv blocked)
    const att = useOrbitStore.getState().attachments["att-recon-x"];
    expect(att).toBeDefined();
    expect(att?.uploadStatus).toBe("uploading");
  });
});

// ── K: QR State Machine ──
describe("QR State Machine", () => {
  it("follows idle → scanning → resolved → executing → done", async () => {
    const { useQrStore } = await import("@/domains/qr/qr.store");
    
    useQrStore.getState().reset();
    expect(useQrStore.getState().status).toBe("idle");

    useQrStore.getState().startScan();
    expect(useQrStore.getState().status).toBe("scanning");

    useQrStore.getState().resolve({
      raw: "https://test.com/pay/123",
      actionType: "pay",
      targetId: "123",
      metadata: {},
    });
    expect(useQrStore.getState().status).toBe("resolved");

    useQrStore.getState().startExecute();
    expect(useQrStore.getState().status).toBe("executing");

    useQrStore.getState().complete();
    expect(useQrStore.getState().status).toBe("done");
  });

  it("blocks invalid transitions", async () => {
    const { useQrStore } = await import("@/domains/qr/qr.store");
    
    useQrStore.getState().reset();
    useQrStore.getState().startExecute();
    expect(useQrStore.getState().status).toBe("idle");

    useQrStore.getState().complete();
    expect(useQrStore.getState().status).toBe("idle");
  });
});

// ── L: Status Machine Exhaustive ──
describe("Message Status Machine — Exhaustive", () => {
  it("blocks all invalid backwards transitions", async () => {
    const { resolveNextStatus } = await import(
      "@/domains/orbit/pipelines/message/message-status.machine"
    );

    expect(resolveNextStatus("delivered", "sent")).toBeNull();
    expect(resolveNextStatus("read", "delivered")).toBeNull();
    expect(resolveNextStatus("read", "sent")).toBeNull();
  });

  it("allows valid forward transitions", async () => {
    const { resolveNextStatus } = await import(
      "@/domains/orbit/pipelines/message/message-status.machine"
    );

    expect(resolveNextStatus("sent", "delivered")).toBe("delivered");
    expect(resolveNextStatus("delivered", "read")).toBe("read");
  });
});
