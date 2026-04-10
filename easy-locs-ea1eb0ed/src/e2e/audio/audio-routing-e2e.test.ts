/**
 * Audio Routing E2E Tests — Validate callDeviceController + stores.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useCallStore } from "@/stores/orbit/call.store";
import { useAudioRouteStore, CallAudioRoute } from "@/families/calls/call-audio-route";
import { callDeviceController } from "@/families/calls/call-device-controller";
import { fakeCallPeer } from "../helpers";

function setupActiveCall(mode: "audio" | "video" = "audio") {
  useCallStore.getState().startOutgoing({
    callId: "call-audio-test",
    peer: fakeCallPeer,
    mode,
  });
}

beforeEach(() => {
  useCallStore.getState().reset();
  useAudioRouteStore.getState().reset();
});

describe("Audio Route Store", () => {
  it("defaults to earpiece", () => {
    expect(useAudioRouteStore.getState().activeOutput).toBe("earpiece");
  });

  it("toggleSpeaker switches between earpiece and speaker", () => {
    CallAudioRoute.toggleSpeaker();
    expect(useAudioRouteStore.getState().activeOutput).toBe("speaker");

    CallAudioRoute.toggleSpeaker();
    expect(useAudioRouteStore.getState().activeOutput).toBe("earpiece");
  });

  it("toSpeaker sets speaker", () => {
    CallAudioRoute.toSpeaker();
    expect(useAudioRouteStore.getState().activeOutput).toBe("speaker");
  });

  it("toEarpiece sets earpiece", () => {
    CallAudioRoute.toSpeaker();
    CallAudioRoute.toEarpiece();
    expect(useAudioRouteStore.getState().activeOutput).toBe("earpiece");
  });

  it("toggleMute toggles mute state", () => {
    expect(useAudioRouteStore.getState().isMuted).toBe(false);
    useAudioRouteStore.getState().toggleMute();
    expect(useAudioRouteStore.getState().isMuted).toBe(true);
    useAudioRouteStore.getState().toggleMute();
    expect(useAudioRouteStore.getState().isMuted).toBe(false);
  });

  it("resetOnCallEnd restores defaults", () => {
    CallAudioRoute.toSpeaker();
    useAudioRouteStore.getState().toggleMute();
    CallAudioRoute.resetOnCallEnd();
    expect(useAudioRouteStore.getState().activeOutput).toBe("earpiece");
    expect(useAudioRouteStore.getState().isMuted).toBe(false);
  });

  it("getDefaultOutput returns speaker for video, earpiece for audio", () => {
    expect(CallAudioRoute.getDefaultOutput("video")).toBe("speaker");
    expect(CallAudioRoute.getDefaultOutput("audio")).toBe("earpiece");
  });
});

describe("CallDeviceController — toggleSpeaker", () => {
  it("does nothing without active call", () => {
    callDeviceController.toggleSpeaker();
    // Should not throw
    expect(useCallStore.getState().activeCall).toBeNull();
  });

  it("toggles speaker on active call and syncs both stores", () => {
    setupActiveCall();
    const initialSpeaker = useCallStore.getState().activeCall!.speakerOn;

    callDeviceController.toggleSpeaker();

    const audioRoute = useAudioRouteStore.getState().activeOutput;
    const callSpeaker = useCallStore.getState().activeCall!.speakerOn;

    // Speaker state should have toggled
    expect(callSpeaker).toBe(!initialSpeaker);
    // Audio route store should reflect the same
    if (callSpeaker) {
      expect(audioRoute).toBe("speaker");
    } else {
      expect(audioRoute).toBe("earpiece");
    }
  });
});

describe("CallDeviceController — toggleMute", () => {
  it("does nothing without active call", () => {
    callDeviceController.toggleMute();
    expect(useCallStore.getState().activeCall).toBeNull();
  });

  it("toggles mute on active call", () => {
    setupActiveCall();
    expect(useCallStore.getState().activeCall!.muted).toBe(false);

    callDeviceController.toggleMute();
    expect(useCallStore.getState().activeCall!.muted).toBe(true);
    expect(useAudioRouteStore.getState().isMuted).toBe(true);

    callDeviceController.toggleMute();
    expect(useCallStore.getState().activeCall!.muted).toBe(false);
    expect(useAudioRouteStore.getState().isMuted).toBe(false);
  });
});

describe("CallDeviceController — switchAudioRoute", () => {
  it("switches to speaker and syncs callStore", () => {
    setupActiveCall();
    callDeviceController.switchAudioRoute("speaker");
    expect(useAudioRouteStore.getState().activeOutput).toBe("speaker");
    expect(useCallStore.getState().activeCall!.speakerOn).toBe(true);
  });

  it("switches to earpiece", () => {
    setupActiveCall();
    callDeviceController.switchAudioRoute("speaker");
    callDeviceController.switchAudioRoute("earpiece");
    expect(useAudioRouteStore.getState().activeOutput).toBe("earpiece");
    expect(useCallStore.getState().activeCall!.speakerOn).toBe(false);
  });

  it("accepts bluetooth route", () => {
    setupActiveCall();
    callDeviceController.switchAudioRoute("bluetooth");
    expect(useAudioRouteStore.getState().activeOutput).toBe("bluetooth");
  });
});

describe("CallDeviceController — getDeviceState", () => {
  it("returns safe defaults without active call", () => {
    const state = callDeviceController.getDeviceState();
    expect(state.muted).toBe(false);
    expect(state.speakerOn).toBe(false);
    expect(state.cameraOn).toBe(false);
  });

  it("reflects actual state with active call", () => {
    setupActiveCall("video");
    const state = callDeviceController.getDeviceState();
    expect(state.speakerOn).toBe(true); // video defaults to speaker
    expect(state.cameraOn).toBe(true);
    expect(state.muted).toBe(false);
  });
});

describe("CallDeviceController — resetOnCallEnd", () => {
  it("resets audio route store", () => {
    setupActiveCall();
    callDeviceController.switchAudioRoute("speaker");
    callDeviceController.toggleMute();
    callDeviceController.resetOnCallEnd();
    expect(useAudioRouteStore.getState().activeOutput).toBe("earpiece");
    expect(useAudioRouteStore.getState().isMuted).toBe(false);
  });
});
