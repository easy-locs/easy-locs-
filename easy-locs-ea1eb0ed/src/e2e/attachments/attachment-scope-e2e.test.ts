/**
 * Attachment Scope E2E Tests — Validate zero cross-conversation leak.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import type { OrbitAttachment, OrbitMessage } from "@/domains/orbit/types";

const CONV_A = "conv-aaa";
const CONV_B = "conv-bbb";

function makeAttachment(overrides: Partial<OrbitAttachment> & { id: string; conversationId: string }): OrbitAttachment {
  return {
    localId: null,
    messageId: null,
    kind: "image",
    localUri: null,
    remoteUrl: null,
    mimeType: "image/jpeg",
    size: 1024,
    duration: null,
    waveform: null,
    uploadStatus: "local",
    uploadProgress: 0,
    previewDataUrl: null,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<OrbitMessage> & { id: string; conversationId: string }): OrbitMessage {
  return {
    tempId: null,
    senderId: "user-1",
    senderOrbitId: "orbit-1",
    type: "image",
    text: null,
    attachmentIds: [],
    replyToId: null,
    reactionSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    status: "sent" as any,
    isDeleted: false,
    isEdited: false,
    metadata: {},
    ...overrides,
  };
}

beforeEach(() => {
  // Full reset
  useOrbitMessagingStore.setState({
    conversations: {},
    messages: {},
    messagesByConversation: {},
    attachments: {},
    attachmentsByConversation: {},
    receipts: {},
    tempIdMap: {},
    activeConversationId: null,
    hydrating: false,
  });
});

describe("mergeAttachment — scope guards", () => {
  it("rejects attachment without conversationId", () => {
    const att = makeAttachment({ id: "att-1", conversationId: "" });
    att.conversationId = "" as any;
    useOrbitMessagingStore.getState().mergeAttachment(att);
    expect(useOrbitMessagingStore.getState().attachments["att-1"]).toBeUndefined();
  });

  it("accepts attachment with valid conversationId", () => {
    const att = makeAttachment({ id: "att-2", conversationId: CONV_A });
    useOrbitMessagingStore.getState().mergeAttachment(att);
    expect(useOrbitMessagingStore.getState().attachments["att-2"]).toBeDefined();
    expect(useOrbitMessagingStore.getState().attachments["att-2"].conversationId).toBe(CONV_A);
  });

  it("blocks cross-conversation overwrite", () => {
    const att1 = makeAttachment({ id: "att-3", conversationId: CONV_A });
    useOrbitMessagingStore.getState().mergeAttachment(att1);

    const att2 = makeAttachment({ id: "att-3", conversationId: CONV_B });
    useOrbitMessagingStore.getState().mergeAttachment(att2);

    // Should still be CONV_A
    expect(useOrbitMessagingStore.getState().attachments["att-3"].conversationId).toBe(CONV_A);
  });

  it("blocks attachment linked to message in different conversation", () => {
    // Add a message in CONV_A
    const msg = makeMessage({ id: "msg-1", conversationId: CONV_A });
    useOrbitMessagingStore.getState().mergeMessage(msg);

    // Try to add attachment claiming CONV_B but linked to msg in CONV_A
    const att = makeAttachment({ id: "att-4", conversationId: CONV_B, messageId: "msg-1" });
    useOrbitMessagingStore.getState().mergeAttachment(att);

    expect(useOrbitMessagingStore.getState().attachments["att-4"]).toBeUndefined();
  });

  it("preserves kind on mutation attempt", () => {
    const att = makeAttachment({ id: "att-5", conversationId: CONV_A, kind: "image" });
    useOrbitMessagingStore.getState().mergeAttachment(att);

    const att2 = makeAttachment({ id: "att-5", conversationId: CONV_A, kind: "video" });
    useOrbitMessagingStore.getState().mergeAttachment(att2);

    expect(useOrbitMessagingStore.getState().attachments["att-5"].kind).toBe("image");
  });
});

describe("attachmentsByConversation index", () => {
  it("indexes attachment under correct conversation", () => {
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "att-a1", conversationId: CONV_A }));
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "att-b1", conversationId: CONV_B }));

    expect(useOrbitMessagingStore.getState().attachmentsByConversation[CONV_A]).toContain("att-a1");
    expect(useOrbitMessagingStore.getState().attachmentsByConversation[CONV_A]).not.toContain("att-b1");
    expect(useOrbitMessagingStore.getState().attachmentsByConversation[CONV_B]).toContain("att-b1");
  });

  it("does not duplicate IDs on re-merge", () => {
    const att = makeAttachment({ id: "att-dup", conversationId: CONV_A });
    useOrbitMessagingStore.getState().mergeAttachment(att);
    useOrbitMessagingStore.getState().mergeAttachment({ ...att, uploadStatus: "uploaded" });

    const ids = useOrbitMessagingStore.getState().attachmentsByConversation[CONV_A];
    expect(ids.filter((id) => id === "att-dup")).toHaveLength(1);
  });
});

describe("updateAttachmentUpload — immutability", () => {
  it("blocks conversationId change", () => {
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "att-u1", conversationId: CONV_A }));
    useOrbitMessagingStore.getState().updateAttachmentUpload("att-u1", { conversationId: CONV_B } as any);
    expect(useOrbitMessagingStore.getState().attachments["att-u1"].conversationId).toBe(CONV_A);
  });

  it("blocks kind change", () => {
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "att-u2", conversationId: CONV_A, kind: "voice" }));
    useOrbitMessagingStore.getState().updateAttachmentUpload("att-u2", { kind: "file" } as any);
    expect(useOrbitMessagingStore.getState().attachments["att-u2"].kind).toBe("voice");
  });

  it("allows safe partial update", () => {
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "att-u3", conversationId: CONV_A }));
    useOrbitMessagingStore.getState().updateAttachmentUpload("att-u3", { uploadStatus: "uploading", uploadProgress: 50 });
    const att = useOrbitMessagingStore.getState().attachments["att-u3"];
    expect(att.uploadStatus).toBe("uploading");
    expect(att.uploadProgress).toBe(50);
  });
});

describe("reconcileAttachment", () => {
  it("replaces local with server attachment in same conversation", () => {
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "local-att", conversationId: CONV_A }));
    const serverAtt = makeAttachment({ id: "server-att", conversationId: CONV_A, remoteUrl: "https://cdn/img.jpg", uploadStatus: "uploaded" });
    useOrbitMessagingStore.getState().reconcileAttachment("local-att", serverAtt);

    expect(useOrbitMessagingStore.getState().attachments["local-att"]).toBeUndefined();
    expect(useOrbitMessagingStore.getState().attachments["server-att"]).toBeDefined();
    expect(useOrbitMessagingStore.getState().attachmentsByConversation[CONV_A]).toContain("server-att");
    expect(useOrbitMessagingStore.getState().attachmentsByConversation[CONV_A]).not.toContain("local-att");
  });

  it("blocks cross-conversation reconciliation", () => {
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "local-att2", conversationId: CONV_A }));
    const serverAtt = makeAttachment({ id: "server-att2", conversationId: CONV_B });
    useOrbitMessagingStore.getState().reconcileAttachment("local-att2", serverAtt);

    // Local should still exist, server should NOT be merged
    expect(useOrbitMessagingStore.getState().attachments["local-att2"]).toBeDefined();
    expect(useOrbitMessagingStore.getState().attachments["server-att2"]).toBeUndefined();
  });

  it("rejects server attachment without conversationId", () => {
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "local-att3", conversationId: CONV_A }));
    const serverAtt = makeAttachment({ id: "server-att3", conversationId: "" });
    serverAtt.conversationId = "" as any;
    useOrbitMessagingStore.getState().reconcileAttachment("local-att3", serverAtt);

    expect(useOrbitMessagingStore.getState().attachments["local-att3"]).toBeDefined();
    expect(useOrbitMessagingStore.getState().attachments["server-att3"]).toBeUndefined();
  });
});

describe("Scoped getters", () => {
  beforeEach(() => {
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "a1", conversationId: CONV_A, messageId: "m1" }));
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "a2", conversationId: CONV_A, messageId: "m1" }));
    useOrbitMessagingStore.getState().mergeAttachment(makeAttachment({ id: "b1", conversationId: CONV_B, messageId: "m2" }));

    useOrbitMessagingStore.getState().mergeMessage(makeMessage({ id: "m1", conversationId: CONV_A, attachmentIds: ["a1", "a2"] }));
    useOrbitMessagingStore.getState().mergeMessage(makeMessage({ id: "m2", conversationId: CONV_B, attachmentIds: ["b1"] }));
  });

  it("getAttachmentsForConversation returns only scoped", () => {
    const attsA = useOrbitMessagingStore.getState().getAttachmentsForConversation(CONV_A);
    expect(attsA).toHaveLength(2);
    expect(attsA.every((a) => a.conversationId === CONV_A)).toBe(true);

    const attsB = useOrbitMessagingStore.getState().getAttachmentsForConversation(CONV_B);
    expect(attsB).toHaveLength(1);
  });

  it("getAttachmentsForMessage returns only scoped for correct message", () => {
    const msg = useOrbitMessagingStore.getState().messages["m1"];
    const atts = useOrbitMessagingStore.getState().getAttachmentsForMessage(CONV_A, msg);
    expect(atts).toHaveLength(2);
    expect(atts.every((a) => a.conversationId === CONV_A)).toBe(true);
  });

  it("getAttachmentsForMessage blocks cross-conversation leak", () => {
    const msg = useOrbitMessagingStore.getState().messages["m1"];
    // Ask for CONV_B with message from CONV_A — should return empty
    const atts = useOrbitMessagingStore.getState().getAttachmentsForMessage(CONV_B, msg);
    expect(atts).toHaveLength(0);
  });

  it("getAttachmentScoped returns null for wrong conversation", () => {
    const att = useOrbitMessagingStore.getState().getAttachmentScoped(CONV_B, "a1");
    expect(att).toBeNull();
  });

  it("getAttachmentScoped returns attachment for correct conversation", () => {
    const att = useOrbitMessagingStore.getState().getAttachmentScoped(CONV_A, "a1");
    expect(att).not.toBeNull();
    expect(att!.conversationId).toBe(CONV_A);
  });
});
