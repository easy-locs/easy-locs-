/**
 * call.ringtone — Canonical ringtone/alert family.
 * Delegates vibration to DeviceHaptics, audio to DeviceAudio.
 */
import { create } from "zustand";
import { DeviceHaptics } from "@/families/device";
import { DeviceAudio } from "@/families/device/device-audio";

export type RingtoneType = "incoming" | "outgoing" | "busy" | "ended" | "none";

interface RingtoneState {
  activeType: RingtoneType;
  isPlaying: boolean;
  isVibrating: boolean;
}

export const useRingtoneStore = create<RingtoneState>(() => ({
  activeType: "none",
  isPlaying: false,
  isVibrating: false,
}));

let currentAudio: HTMLAudioElement | null = null;
let stopVibrationFn: (() => void) | null = null;

const RINGTONE_URLS: Record<Exclude<RingtoneType, "none">, string> = {
  incoming: "/sounds/ringtone-incoming.mp3",
  outgoing: "/sounds/ringtone-outgoing.mp3",
  busy: "/sounds/ringtone-busy.mp3",
  ended: "/sounds/ringtone-ended.mp3",
};

export const CallRingtone = {
  /** Play a ringtone type */
  play(type: Exclude<RingtoneType, "none">, loop = true) {
    CallRingtone.stop();
    currentAudio = DeviceAudio.playFile(RINGTONE_URLS[type], { loop, volume: 0.8 });
    if (currentAudio) {
      useRingtoneStore.setState({ activeType: type, isPlaying: true });
    }
  },

  /** Stop all ringtone playback */
  stop() {
    DeviceAudio.stopFile(currentAudio);
    currentAudio = null;
    CallRingtone.stopVibration();
    useRingtoneStore.setState({ activeType: "none", isPlaying: false, isVibrating: false });
  },

  /** Start device vibration pattern */
  startVibration() {
    CallRingtone.stopVibration();
    stopVibrationFn = DeviceHaptics.startRepeating([500, 500], 1000);
    useRingtoneStore.setState({ isVibrating: true });
  },

  /** Stop device vibration */
  stopVibration() {
    if (stopVibrationFn) {
      stopVibrationFn();
      stopVibrationFn = null;
    }
    useRingtoneStore.setState({ isVibrating: false });
  },

  /** Play incoming call with vibration */
  playIncoming() {
    CallRingtone.play("incoming", true);
    CallRingtone.startVibration();
  },

  /** Play outgoing call tone (no vibration) */
  playOutgoing() {
    CallRingtone.play("outgoing", true);
  },

  /** Play busy tone briefly */
  playBusy() {
    CallRingtone.play("busy", false);
    setTimeout(() => CallRingtone.stop(), 3000);
  },

  /** Play call ended tone briefly */
  playEnded() {
    CallRingtone.play("ended", false);
    setTimeout(() => CallRingtone.stop(), 1500);
  },
};
