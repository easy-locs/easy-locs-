/**
 * call.audio-route — Canonical audio routing family.
 * Handles: earpiece, speaker, bluetooth/headset, mute, route switching.
 */
import { create } from "zustand";

export type AudioOutputDevice = "earpiece" | "speaker" | "bluetooth" | "headset" | "default";

interface AudioRouteState {
  activeOutput: AudioOutputDevice;
  isMuted: boolean;
  availableOutputs: AudioOutputDevice[];
  setOutput: (device: AudioOutputDevice) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setAvailableOutputs: (outputs: AudioOutputDevice[]) => void;
  reset: () => void;
}

export const useAudioRouteStore = create<AudioRouteState>((set) => ({
  activeOutput: "earpiece",
  isMuted: false,
  availableOutputs: ["earpiece", "speaker"],

  setOutput: (device) => set({ activeOutput: device }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  setMuted: (muted) => set({ isMuted: muted }),

  setAvailableOutputs: (outputs) => set({ availableOutputs: outputs }),

  reset: () =>
    set({
      activeOutput: "earpiece",
      isMuted: false,
      availableOutputs: ["earpiece", "speaker"],
    }),
}));

export const CallAudioRoute = {
  /** Switch to speaker */
  toSpeaker() {
    useAudioRouteStore.getState().setOutput("speaker");
  },

  /** Switch to earpiece */
  toEarpiece() {
    useAudioRouteStore.getState().setOutput("earpiece");
  },

  /** Toggle between earpiece and speaker */
  toggleSpeaker() {
    const { activeOutput, setOutput } = useAudioRouteStore.getState();
    setOutput(activeOutput === "speaker" ? "earpiece" : "speaker");
  },

  /** Get the default output for a call mode */
  getDefaultOutput(mode: "audio" | "video"): AudioOutputDevice {
    return mode === "video" ? "speaker" : "earpiece";
  },

  /** Reset audio route to defaults when call ends */
  resetOnCallEnd() {
    useAudioRouteStore.getState().reset();
  },
};
