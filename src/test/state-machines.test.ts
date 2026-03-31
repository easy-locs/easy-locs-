/**
 * Tests for state machines — message, call, upload transitions.
 */
import { describe, it, expect } from "vitest";
import {
  MESSAGE_MACHINE,
  CALL_MACHINE,
  UPLOAD_MACHINE,
  transition,
} from "@/lib/state-machines/canonical-machines";

describe("Message State Machine", () => {
  it("allows sending → sent", () => {
    expect(transition(MESSAGE_MACHINE, "sending", "ACK")).toBe("sent");
  });

  it("allows sending → failed", () => {
    expect(transition(MESSAGE_MACHINE, "sending", "FAIL")).toBe("failed");
  });

  it("allows sent → delivered", () => {
    expect(transition(MESSAGE_MACHINE, "sent", "DELIVER")).toBe("delivered");
  });

  it("allows delivered → read", () => {
    expect(transition(MESSAGE_MACHINE, "delivered", "READ")).toBe("read");
  });

  it("allows failed → sending (retry)", () => {
    expect(transition(MESSAGE_MACHINE, "failed", "RETRY")).toBe("sending");
  });

  it("blocks read → sending (invalid)", () => {
    expect(transition(MESSAGE_MACHINE, "read", "SEND")).toBeNull();
  });

  it("blocks delivered → sent (invalid regression)", () => {
    expect(transition(MESSAGE_MACHINE, "delivered", "ACK")).toBeNull();
  });
});

describe("Call State Machine", () => {
  it("allows idle → calling", () => {
    expect(transition(CALL_MACHINE, "idle", "INITIATE")).toBe("calling");
  });

  it("allows ringing → accepted", () => {
    expect(transition(CALL_MACHINE, "ringing", "ACCEPT")).toBe("connecting");
  });

  it("allows active → ended (hangup)", () => {
    expect(transition(CALL_MACHINE, "active", "HANGUP")).toBe("ended");
  });

  it("allows ringing → missed (timeout)", () => {
    expect(transition(CALL_MACHINE, "ringing", "TIMEOUT")).toBe("missed");
  });

  it("blocks ended → active (terminal state)", () => {
    expect(transition(CALL_MACHINE, "ended", "CONNECTED")).toBeNull();
  });

  it("allows reconnecting → active", () => {
    expect(transition(CALL_MACHINE, "reconnecting", "RECONNECTED")).toBe("active");
  });
});

describe("Upload State Machine", () => {
  it("allows idle → preparing", () => {
    expect(transition(UPLOAD_MACHINE, "idle", "START")).toBe("preparing");
  });

  it("allows uploading → completed via processing", () => {
    expect(transition(UPLOAD_MACHINE, "uploading", "DONE")).toBe("processing");
    expect(transition(UPLOAD_MACHINE, "processing", "COMPLETE")).toBe("completed");
  });

  it("allows cancel during upload", () => {
    expect(transition(UPLOAD_MACHINE, "uploading", "CANCEL")).toBe("cancelled");
  });

  it("blocks completed → uploading (terminal)", () => {
    expect(transition(UPLOAD_MACHINE, "completed", "START")).toBeNull();
  });
});
