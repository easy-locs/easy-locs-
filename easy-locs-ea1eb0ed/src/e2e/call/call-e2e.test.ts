/**
 * Call E2E Tests — Validate full call lifecycle via callStore state machine.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useCallStore } from "@/stores/orbit/call.store";
import { transition, CALL_MACHINE } from "@/lib/state-machines/canonical-machines";
import { fakeCallPeer } from "../helpers";

beforeEach(() => {
  useCallStore.getState().reset();
});

describe("Call State Machine (canonical-machines)", () => {
  it("idle → calling via INITIATE", () => {
    expect(transition(CALL_MACHINE, "idle", "INITIATE")).toBe("calling");
  });

  it("idle → incoming via INCOMING", () => {
    expect(transition(CALL_MACHINE, "idle", "INCOMING")).toBe("incoming");
  });

  it("calling → ringing via RING", () => {
    expect(transition(CALL_MACHINE, "calling", "RING")).toBe("ringing");
  });

  it("calling → failed via FAIL", () => {
    expect(transition(CALL_MACHINE, "calling", "FAIL")).toBe("failed");
  });

  it("incoming → connecting via ACCEPT", () => {
    expect(transition(CALL_MACHINE, "incoming", "ACCEPT")).toBe("connecting");
  });

  it("incoming → declined via DECLINE", () => {
    expect(transition(CALL_MACHINE, "incoming", "DECLINE")).toBe("declined");
  });

  it("connecting → active via CONNECTED", () => {
    expect(transition(CALL_MACHINE, "connecting", "CONNECTED")).toBe("active");
  });

  it("active → ended via HANGUP", () => {
    expect(transition(CALL_MACHINE, "active", "HANGUP")).toBe("ended");
  });

  it("active → reconnecting via DISCONNECT", () => {
    expect(transition(CALL_MACHINE, "active", "DISCONNECT")).toBe("reconnecting");
  });

  it("reconnecting → active via RECONNECTED", () => {
    expect(transition(CALL_MACHINE, "reconnecting", "RECONNECTED")).toBe("active");
  });

  it("blocks illegal transition: ended → calling", () => {
    expect(transition(CALL_MACHINE, "ended", "INITIATE")).toBeNull();
  });

  it("blocks illegal transition: declined → active", () => {
    expect(transition(CALL_MACHINE, "declined", "CONNECTED")).toBeNull();
  });

  it("failed → calling via RETRY", () => {
    expect(transition(CALL_MACHINE, "failed", "RETRY")).toBe("calling");
  });
});

describe("CallStore — Start outgoing call (instant)", () => {
  it("creates activeCall immediately with calling state", () => {
    useCallStore.getState().startOutgoing({
      callId: "call-001",
      conversationId: "conv-001",
      peer: fakeCallPeer,
      mode: "audio",
    });

    const call = useCallStore.getState().activeCall;
    expect(call).not.toBeNull();
    expect(call!.uiState).toBe("calling");
    expect(call!.direction).toBe("outgoing");
    expect(call!.peer.userId).toBe("user-001");
    expect(call!.mode).toBe("audio");
    expect(useCallStore.getState().hasActiveCall).toBe(true);
  });

  it("sets speaker on for video calls", () => {
    useCallStore.getState().startOutgoing({
      callId: "call-002",
      peer: fakeCallPeer,
      mode: "video",
    });
    expect(useCallStore.getState().activeCall!.speakerOn).toBe(true);
    expect(useCallStore.getState().activeCall!.cameraOn).toBe(true);
  });
});

describe("CallStore — Incoming call", () => {
  it("creates incoming call with incoming state", () => {
    useCallStore.getState().setIncoming({
      callId: "call-003",
      peer: fakeCallPeer,
      mode: "audio",
    });

    const call = useCallStore.getState().activeCall;
    expect(call!.uiState).toBe("incoming");
    expect(call!.direction).toBe("incoming");
  });
});

describe("CallStore — State transitions", () => {
  beforeEach(() => {
    useCallStore.getState().startOutgoing({
      callId: "call-004",
      peer: fakeCallPeer,
      mode: "audio",
    });
  });

  it("calling → ringing", () => {
    useCallStore.getState().transition("ringing");
    expect(useCallStore.getState().activeCall!.uiState).toBe("ringing");
  });

  it("blocks illegal transition calling → active", () => {
    useCallStore.getState().transition("active");
    // Should still be calling — transition blocked
    expect(useCallStore.getState().activeCall!.uiState).toBe("calling");
  });

  it("full lifecycle: calling → ringing → connecting → active → ended", () => {
    const store = useCallStore.getState;
    store().transition("ringing");
    expect(store().activeCall!.uiState).toBe("ringing");

    store().transition("connecting");
    expect(store().activeCall!.uiState).toBe("connecting");

    store().transition("active");
    expect(store().activeCall!.uiState).toBe("active");
    expect(store().hasActiveCall).toBe(true);

    store().transition("ended");
    expect(store().activeCall!.uiState).toBe("ended");
    expect(store().hasActiveCall).toBe(false);
  });
});

describe("CallStore — Instant hangup", () => {
  it("endCall immediately sets ended + hasActiveCall false", () => {
    useCallStore.getState().startOutgoing({
      callId: "call-005",
      peer: fakeCallPeer,
      mode: "audio",
    });
    expect(useCallStore.getState().hasActiveCall).toBe(true);

    useCallStore.getState().endCall("ended");
    expect(useCallStore.getState().activeCall!.uiState).toBe("ended");
    expect(useCallStore.getState().hasActiveCall).toBe(false);
  });

  it("endCall with declined state", () => {
    useCallStore.getState().setIncoming({
      callId: "call-006",
      peer: fakeCallPeer,
      mode: "audio",
    });
    useCallStore.getState().endCall("declined");
    expect(useCallStore.getState().activeCall!.uiState).toBe("declined");
    expect(useCallStore.getState().hasActiveCall).toBe(false);
  });
});

describe("CallStore — No zombie sessions", () => {
  it("reset clears everything", () => {
    useCallStore.getState().startOutgoing({
      callId: "call-007",
      peer: fakeCallPeer,
      mode: "audio",
    });
    useCallStore.getState().reset();
    expect(useCallStore.getState().activeCall).toBeNull();
    expect(useCallStore.getState().hasActiveCall).toBe(false);
    expect(useCallStore.getState().remoteStream).toBeNull();
    expect(useCallStore.getState().localStream).toBeNull();
  });

  it("only one active call at a time (startOutgoing overwrites)", () => {
    useCallStore.getState().startOutgoing({
      callId: "call-A",
      peer: fakeCallPeer,
      mode: "audio",
    });
    useCallStore.getState().startOutgoing({
      callId: "call-B",
      peer: { ...fakeCallPeer, name: "Other" },
      mode: "video",
    });
    expect(useCallStore.getState().activeCall!.callId).toBe("call-B");
  });
});
