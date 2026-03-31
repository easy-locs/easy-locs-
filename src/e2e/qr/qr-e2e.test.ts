/**
 * QR E2E Tests — Validate full dispatch → store → action pipeline.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useQrStore } from "@/domains/qr/qr.store";
import { qrDispatch } from "@/domains/qr/qr-dispatch";
import { parseQrPayload, validateQrPayload } from "@/domains/qr/qr.pipeline";
import { fakeQrPayloads } from "../helpers";

// Mock platformBus to capture navigation
const emitSpy = vi.fn();
vi.mock("@/lib/shared/platform-bus", () => ({
  platformBus: { emit: (...args: any[]) => emitSpy(...args) },
}));

// Mock cardDispatch for entity QR
vi.mock("@/domains/cards/card-dispatch", () => ({
  cardDispatch: vi.fn().mockResolvedValue({ ok: true }),
}));

beforeEach(() => {
  useQrStore.getState().reset();
  emitSpy.mockClear();
});

describe("QR Pipeline — parseQrPayload", () => {
  it("parses conversation URL", () => {
    const result = parseQrPayload(fakeQrPayloads.conversation);
    expect(result.actionType).toBe("open_conversation");
    expect(result.targetId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("parses entity URL", () => {
    const result = parseQrPayload(fakeQrPayloads.entity);
    expect(result.actionType).toBe("open_entity");
    expect(result.targetId).toBe("660e8400-e29b-41d4-a716-446655440001");
  });

  it("parses join group URL", () => {
    const result = parseQrPayload(fakeQrPayloads.joinGroup);
    expect(result.actionType).toBe("join_group");
    expect(result.targetId).toBe("770e8400-e29b-41d4-a716-446655440002");
  });

  it("parses location URL", () => {
    const result = parseQrPayload(fakeQrPayloads.location);
    expect(result.actionType).toBe("open_location");
    expect(result.targetId).toBe("25.2048,55.2708");
  });

  it("parses pay URL", () => {
    const result = parseQrPayload(fakeQrPayloads.pay);
    expect(result.actionType).toBe("pay");
    expect(result.targetId).toBe("880e8400-e29b-41d4-a716-446655440003");
  });

  it("returns unknown for invalid QR", () => {
    const result = parseQrPayload(fakeQrPayloads.invalid);
    expect(result.actionType).toBe("unknown");
    expect(result.targetId).toBeNull();
  });

  it("parses JSON conversation payload", () => {
    const result = parseQrPayload(fakeQrPayloads.jsonConversation);
    expect(result.actionType).toBe("open_conversation");
    expect(result.targetId).toBe("990e8400-e29b-41d4-a716-446655440004");
  });
});

describe("QR Pipeline — validateQrPayload", () => {
  it("rejects unknown action type", () => {
    const payload = parseQrPayload(fakeQrPayloads.invalid);
    expect(validateQrPayload(payload)).toBe("unrecognized_qr_format");
  });

  it("accepts valid conversation QR", () => {
    const payload = parseQrPayload(fakeQrPayloads.conversation);
    expect(validateQrPayload(payload)).toBeNull();
  });
});

describe("QR Dispatch — scan_start", () => {
  it("transitions store to scanning", async () => {
    const result = await qrDispatch({ type: "scan_start" });
    expect(result.ok).toBe(true);
    expect(useQrStore.getState().status).toBe("scanning");
  });
});

describe("QR Dispatch — scan_result", () => {
  it("resolves valid conversation QR", async () => {
    await qrDispatch({ type: "scan_start" });
    const result = await qrDispatch({ type: "scan_result", raw: fakeQrPayloads.conversation });
    expect(result.ok).toBe(true);
    expect(result.actionType).toBe("open_conversation");
    expect(useQrStore.getState().status).toBe("resolved");
    expect(useQrStore.getState().payload?.actionType).toBe("open_conversation");
  });

  it("marks invalid QR", async () => {
    await qrDispatch({ type: "scan_start" });
    const result = await qrDispatch({ type: "scan_result", raw: fakeQrPayloads.invalid });
    expect(result.ok).toBe(false);
    expect(useQrStore.getState().status).toBe("invalid");
  });
});

describe("QR Dispatch — execute", () => {
  it("executes conversation QR action via platformBus", async () => {
    await qrDispatch({ type: "scan_start" });
    await qrDispatch({ type: "scan_result", raw: fakeQrPayloads.conversation });
    const result = await qrDispatch({ type: "execute" });
    expect(result.ok).toBe(true);
    expect(useQrStore.getState().status).toBe("done");
    expect(emitSpy).toHaveBeenCalledWith(
      "navigate",
      { path: "/orbit/550e8400-e29b-41d4-a716-446655440000" },
      "qr",
    );
  });

  it("rejects execute without resolved payload", async () => {
    const result = await qrDispatch({ type: "execute" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("nothing_to_execute");
  });

  it("executes location QR", async () => {
    await qrDispatch({ type: "scan_start" });
    await qrDispatch({ type: "scan_result", raw: fakeQrPayloads.location });
    const result = await qrDispatch({ type: "execute" });
    expect(result.ok).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith(
      "navigate",
      { path: "/map?lat=25.2048&lng=55.2708" },
      "qr",
    );
  });

  it("executes join group QR", async () => {
    await qrDispatch({ type: "scan_start" });
    await qrDispatch({ type: "scan_result", raw: fakeQrPayloads.joinGroup });
    await qrDispatch({ type: "execute" });
    expect(emitSpy).toHaveBeenCalledWith(
      "navigate",
      { path: "/orbit/groups/join/770e8400-e29b-41d4-a716-446655440002" },
      "qr",
    );
  });
});

describe("QR Dispatch — reset", () => {
  it("resets store to idle", async () => {
    await qrDispatch({ type: "scan_start" });
    await qrDispatch({ type: "reset" });
    expect(useQrStore.getState().status).toBe("idle");
    expect(useQrStore.getState().payload).toBeNull();
  });
});

describe("QR State Machine Guards", () => {
  it("blocks execute from scanning state", async () => {
    await qrDispatch({ type: "scan_start" });
    // Directly try execute without scan_result
    const result = await qrDispatch({ type: "execute" });
    expect(result.ok).toBe(false);
  });

  it("blocks double scan_start idempotently", async () => {
    await qrDispatch({ type: "scan_start" });
    await qrDispatch({ type: "scan_start" });
    expect(useQrStore.getState().status).toBe("scanning");
  });
});
