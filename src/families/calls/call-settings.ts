/**
 * call.settings — Canonical communication settings for calls.
 * Persisted per-device.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CallSettingsState {
  defaultAudioOutput: "earpiece" | "speaker";
  ringtoneEnabled: boolean;
  vibrationOnRing: boolean;
  autoAnswerAfterSeconds: number | null; // null = disabled
  showCallDuration: boolean;
  recordCallsEnabled: boolean; // future: call recording
  setDefaultAudioOutput: (v: "earpiece" | "speaker") => void;
  setRingtoneEnabled: (v: boolean) => void;
  setVibrationOnRing: (v: boolean) => void;
  setAutoAnswer: (seconds: number | null) => void;
  setShowCallDuration: (v: boolean) => void;
}

export const useCallSettingsStore = create<CallSettingsState>()(
  persist(
    (set) => ({
      defaultAudioOutput: "earpiece",
      ringtoneEnabled: true,
      vibrationOnRing: true,
      autoAnswerAfterSeconds: null,
      showCallDuration: true,
      recordCallsEnabled: false,

      setDefaultAudioOutput: (v) => set({ defaultAudioOutput: v }),
      setRingtoneEnabled: (v) => set({ ringtoneEnabled: v }),
      setVibrationOnRing: (v) => set({ vibrationOnRing: v }),
      setAutoAnswer: (seconds) => set({ autoAnswerAfterSeconds: seconds }),
      setShowCallDuration: (v) => set({ showCallDuration: v }),
    }),
    { name: "orbit-call-settings" },
  ),
);
