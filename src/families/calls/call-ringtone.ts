/**
 * call.ringtone — Canonical ringtone/alert family.
 * Handles: incoming ring, outgoing ring, stop, vibrate.
 */
import { create } from "zustand";

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
let vibrationInterval: ReturnType<typeof setInterval> | null = null;

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

    try {
      const audio = new Audio(RINGTONE_URLS[type]);
      audio.loop = loop;
      audio.volume = 0.8;
      audio.play().catch(() => { /* browser autoplay policy */ });
      currentAudio = audio;
      useRingtoneStore.setState({ activeType: type, isPlaying: true });
    } catch {
      /* ignore audio errors */
    }
  },

  /** Stop all ringtone playback */
  stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    CallRingtone.stopVibration();
    useRingtoneStore.setState({ activeType: "none", isPlaying: false, isVibrating: false });
  },

  /** Start device vibration pattern */
  startVibration() {
    if (!("vibrate" in navigator)) return;
    CallRingtone.stopVibration();
    // Vibrate pattern: 500ms on, 500ms off
    vibrationInterval = setInterval(() => {
      navigator.vibrate([500, 500]);
    }, 1000);
    useRingtoneStore.setState({ isVibrating: true });
  },

  /** Stop device vibration */
  stopVibration() {
    if (vibrationInterval) {
      clearInterval(vibrationInterval);
      vibrationInterval = null;
    }
    if ("vibrate" in navigator) {
      navigator.vibrate(0);
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
