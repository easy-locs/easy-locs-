/**
 * Tests for state machines — message, call, upload, payment, order, driver transitions.
 */
import { describe, it, expect } from "vitest";
import {
  MESSAGE_MACHINE,
  CALL_MACHINE,
  UPLOAD_MACHINE,
  transition,
} from "@/lib/state-machines/canonical-machines";
import { transitionPayment, transitionOrder, transitionDriver } from "@/domains/shared/state-machines";

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

  it("allows failed → retrying (retry)", () => {
    expect(transition(MESSAGE_MACHINE, "failed", "RETRY")).toBe("retrying");
  });

  it("blocks read → sending (invalid)", () => {
    expect(transition(MESSAGE_MACHINE, "read", "SEND")).toBeNull();
  });

  it("blocks delivered → sent (invalid regression)", () => {
    expect(transition(MESSAGE_MACHINE, "delivered", "ACK")).toBeNull();
  });

  it("read is terminal", () => {
    expect(transition(MESSAGE_MACHINE, "read", "DELIVER")).toBeNull();
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

  it("missed is terminal", () => {
    expect(transition(CALL_MACHINE, "missed", "ACCEPT")).toBeNull();
  });

  it("declined is terminal", () => {
    expect(transition(CALL_MACHINE, "declined", "ACCEPT")).toBeNull();
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

describe("Payment State Machine", () => {
  it("follows happy path: created → pending → authorized → captured", () => {
    let s = transitionPayment("created", "CONFIRM");
    expect(s).toBe("pending_confirmation");
    s = transitionPayment(s!, "AUTHORIZE");
    expect(s).toBe("authorized");
    s = transitionPayment(s!, "CAPTURE");
    expect(s).toBe("captured");
  });

  it("allows refund from captured", () => {
    expect(transitionPayment("captured", "REFUND")).toBe("refunded");
  });

  it("blocks backward: captured → authorized", () => {
    expect(transitionPayment("captured", "AUTHORIZE")).toBeNull();
  });

  it("failed is terminal", () => {
    expect(transitionPayment("failed", "CAPTURE")).toBeNull();
  });

  it("refunded is terminal — no double refund", () => {
    expect(transitionPayment("refunded", "REFUND")).toBeNull();
  });

  it("cancelled is terminal", () => {
    expect(transitionPayment("cancelled", "CONFIRM")).toBeNull();
  });

  it("can cancel at authorization stage", () => {
    expect(transitionPayment("authorized", "CANCEL")).toBe("cancelled");
  });
});

describe("Order State Machine", () => {
  it("follows full lifecycle", () => {
    let s = transitionOrder("draft", "SUBMIT");
    expect(s).toBe("submitted");
    s = transitionOrder(s!, "ACCEPT");
    expect(s).toBe("accepted");
    s = transitionOrder(s!, "PREPARE");
    expect(s).toBe("preparing");
    s = transitionOrder(s!, "READY");
    expect(s).toBe("ready");
    s = transitionOrder(s!, "ASSIGN");
    expect(s).toBe("assigned");
    s = transitionOrder(s!, "PICKUP");
    expect(s).toBe("picked_up");
    s = transitionOrder(s!, "DELIVER");
    expect(s).toBe("delivered");
  });

  it("can cancel at most stages", () => {
    expect(transitionOrder("draft", "CANCEL")).toBe("cancelled");
    expect(transitionOrder("submitted", "CANCEL")).toBe("cancelled");
    expect(transitionOrder("accepted", "CANCEL")).toBe("cancelled");
    expect(transitionOrder("ready", "CANCEL")).toBe("cancelled");
  });

  it("cannot cancel delivered", () => {
    expect(transitionOrder("delivered", "CANCEL")).toBeNull();
  });

  it("delivered is terminal", () => {
    expect(transitionOrder("delivered", "SUBMIT")).toBeNull();
  });
});

describe("Driver State Machine", () => {
  it("follows assignment lifecycle", () => {
    let s = transitionDriver("available", "ASSIGN");
    expect(s).toBe("assigned");
    s = transitionDriver(s!, "EN_ROUTE");
    expect(s).toBe("on_route_to_pickup");
    s = transitionDriver(s!, "ARRIVE_PICKUP");
    expect(s).toBe("waiting_pickup");
    s = transitionDriver(s!, "START_DELIVERY");
    expect(s).toBe("on_delivery");
    s = transitionDriver(s!, "COMPLETE");
    expect(s).toBe("completed");
  });

  it("can go offline from available", () => {
    expect(transitionDriver("available", "GO_OFFLINE")).toBe("offline");
  });

  it("can go online from offline", () => {
    expect(transitionDriver("offline", "GO_ONLINE")).toBe("available");
  });

  it("blocks offline → assign (must go online first)", () => {
    expect(transitionDriver("offline", "ASSIGN")).toBeNull();
  });

  it("blocks backward: on_delivery → available", () => {
    expect(transitionDriver("on_delivery", "GO_ONLINE")).toBeNull();
  });
});
