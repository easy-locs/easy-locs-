/**
 * call.ringtone — Canonical ringtone/alert family.
 * Delegates vibration to DeviceHaptics, audio to DeviceAudio.
 * Falls back to Web Audio API synthesis when MP3 files are unavailable.
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
let synthCtx: AudioContext | null = null;
let synthInterval: ReturnType<typeof setInterval> | null = null;

const RINGTONE_URLS: Record<Exclude<RingtoneType, "none">, string> = {
  incoming: "/sounds/ringtone-incoming.mp3",
  outgoing: "/sounds/ringtone-outgoing.mp3",
  busy: "/sounds/ringtone-busy.mp3",
  ended: "/sounds/ringtone-ended.mp3",
};

/** Synthesize ringtone via Web Audio API as fallback */
function playSynthRingtone(type: Exclude<RingtoneType, "none">, loop: boolean) {
  stopSynth();
  try {
    synthCtx = new AudioContext();
    const patterns: Record<string, { freqs: number[]; onMs: number; offMs: number; gain: number }> = {
      incoming: { freqs: [440, 480], onMs: 1000, offMs: 2000, gain: 0.15 },
      outgoing: { freqs: [440, 480], onMs: 2000, offMs: 4000, gain: 0.10 },
      busy: { freqs: [480, 620], onMs: 500, offMs: 500, gain: 0.12 },
      ended: { freqs: [400], onMs: 300, offMs: 0, gain: 0.08 },
    };
    const p = patterns[type] || patterns.outgoing;

    const playBurst = () => {
      if (!synthCtx || synthCtx.state === "closed") return;
      if (synthCtx.state === "suspended") synthCtx.resume().catch(() => {});
      const now = synthCtx.currentTime;
      const durSec = p.onMs / 1000;

      p.freqs.forEach((freq) => {
        const osc = synthCtx!.createOscillator();
        const gain = synthCtx!.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(p.gain, now + 0.02);
        gain.gain.setValueAtTime(p.gain, now + durSec - 0.02);
        gain.gain.linearRampToValueAtTime(0, now + durSec);
        osc.connect(gain);
        gain.connect(synthCtx!.destination);
        osc.start(now);
        osc.stop(now + durSec);
      });
    };

    playBurst();
    if (loop && p.offMs > 0) {
      synthInterval = setInterval(playBurst, p.onMs + p.offMs);
    }
  } catch (e) {
    console.warn("[CallRingtone] synth fallback failed:", e);
  }
}

function stopSynth() {
  if (synthInterval) { clearInterval(synthInterval); synthInterval = null; }
  if (synthCtx && synthCtx.state !== "closed") {
    synthCtx.close().catch(() => {});
    synthCtx = null;
  }
}

export const CallRingtone = {
  /** Play a ringtone type — tries MP3 first, falls back to Web Audio synthesis */
  play(type: Exclude<RingtoneType, "none">, loop = true) {
    CallRingtone.stop();

    // Try MP3 file first
    const audio = DeviceAudio.playFile(RINGTONE_URLS[type], { loop, volume: 0.8 });
    if (audio) {
      currentAudio = audio;
      // Check if the file actually loads
      audio.addEventListener("error", () => {
        console.warn(`[CallRingtone] MP3 failed for ${type}, using synth fallback`);
        currentAudio = null;
        playSynthRingtone(type, loop);
      }, { once: true });
      useRingtoneStore.setState({ activeType: type, isPlaying: true });
    } else {
      // Direct fallback to synth
      playSynthRingtone(type, loop);
      useRingtoneStore.setState({ activeType: type, isPlaying: true });
    }
  },

  /** Stop all ringtone playback */
  stop() {
    DeviceAudio.stopFile(currentAudio);
    currentAudio = null;
    stopSynth();
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
