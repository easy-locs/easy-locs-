/**
 * callDeviceController — SINGLE controller for all call audio/video device actions.
 *
 * RULE: The UI button triggers the controller, then the real state flows back.
 *       The icon reflects the controller's state, not a local boolean.
 *
 * FLOW: UI tap → controller action → apply hardware change → update stores → UI reflects
 */
import { useCallStore } from "@/stores/orbit/call.store";
import { useAudioRouteStore, CallAudioRoute } from "./call-audio-route";
import type { AudioOutputDevice } from "./call-audio-route";

export const callDeviceController = {
  /**
   * Toggle speaker — delegates to audio route store + CallManager.
   */
  toggleSpeaker(): void {
    const call = useCallStore.getState().activeCall;
    if (!call) return;

    CallAudioRoute.toggleSpeaker();

    const newSpeakerState = useAudioRouteStore.getState().activeOutput === "speaker";
    const currentCall = useCallStore.getState().activeCall;
    if (currentCall) {
      useCallStore.setState({ activeCall: { ...currentCall, speakerOn: newSpeakerState } });
    }

    if (import.meta.env.DEV) {
      console.debug("[callDeviceController] toggleSpeaker", {
        output: useAudioRouteStore.getState().activeOutput,
        speakerOn: newSpeakerState,
      });
    }
  },

  /**
   * Toggle microphone mute — delegates to CallManager + updates stores.
   */
  toggleMute(): void {
    const store = useCallStore.getState();
    const call = store.activeCall;
    if (!call) return;

    // Delegate to actual CallManager for hardware mute
    const mgr = store._callManagerRef?.current;
    if (mgr?.toggleMute) {
      mgr.toggleMute();
    }

    // Update audio route store
    useAudioRouteStore.getState().toggleMute();

    // Update call store for UI
    store.toggleMute();

    if (import.meta.env.DEV) {
      console.debug("[callDeviceController] toggleMute", {
        muted: !call.muted,
        hardwareMuted: useAudioRouteStore.getState().isMuted,
      });
    }
  },

  /**
   * Switch audio route to a specific device.
   */
  switchAudioRoute(device: AudioOutputDevice): void {
    const call = useCallStore.getState().activeCall;
    if (!call) return;

    useAudioRouteStore.getState().setOutput(device);

    const isSpeaker = device === "speaker";
    if (isSpeaker !== call.speakerOn) {
      useCallStore.setState({ activeCall: { ...useCallStore.getState().activeCall!, speakerOn: isSpeaker } });
    }

    if (import.meta.env.DEV) {
      console.debug("[callDeviceController] switchAudioRoute", { device });
    }
  },

  /**
   * Toggle camera — delegates to CallManager + updates store.
   */
  toggleCamera(): void {
    const store = useCallStore.getState();
    const call = store.activeCall;
    if (!call) return;

    const mgr = store._callManagerRef?.current;
    if (mgr?.toggleVideo) {
      mgr.toggleVideo();
    }

    store.toggleCamera();

    if (import.meta.env.DEV) {
      console.debug("[callDeviceController] toggleCamera", { cameraOn: !call.cameraOn });
    }
  },

  /**
   * Get current device states (read-only snapshot).
   */
  getDeviceState() {
    const call = useCallStore.getState().activeCall;
    const audioRoute = useAudioRouteStore.getState();

    return {
      muted: call?.muted ?? false,
      speakerOn: call?.speakerOn ?? false,
      cameraOn: call?.cameraOn ?? false,
      activeOutput: audioRoute.activeOutput,
      isMuted: audioRoute.isMuted,
      availableOutputs: audioRoute.availableOutputs,
    };
  },

  /**
   * Reset all device state on call end.
   */
  resetOnCallEnd(): void {
    CallAudioRoute.resetOnCallEnd();
    if (import.meta.env.DEV) {
      console.debug("[callDeviceController] resetOnCallEnd");
    }
  },
};
