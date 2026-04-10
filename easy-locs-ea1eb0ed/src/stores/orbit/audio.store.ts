/**
 * orbitAudioStore — Single global audio playback engine.
 * Only one audio plays at a time. Tap another → stops the current.
 */
import { create } from "zustand";

interface AudioPlaybackState {
  activeMessageId: string | null;
  status: "idle" | "loading" | "playing" | "paused";
  progress: number;
  duration: number;

  /** Internal ref — not for UI consumption */
  _audioElement: HTMLAudioElement | null;

  // ── Actions ──
  play: (messageId: string, url: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  updateProgress: (progress: number, duration: number) => void;
}

export const useOrbitAudioStore = create<AudioPlaybackState>((set, get) => ({
  activeMessageId: null,
  status: "idle",
  progress: 0,
  duration: 0,
  _audioElement: null,

  play: (messageId, url) => {
    const s = get();

    // Stop current audio if different
    if (s._audioElement) {
      s._audioElement.pause();
      s._audioElement.removeAttribute("src");
      s._audioElement.load();
    }

    const audio = new Audio(url);
    audio.preload = "auto";

    set({
      activeMessageId: messageId,
      status: "loading",
      progress: 0,
      duration: 0,
      _audioElement: audio,
    });

    audio.oncanplay = () => {
      const current = get();
      if (current.activeMessageId === messageId) {
        set({ status: "playing", duration: audio.duration || 0 });
        audio.play().catch(() => set({ status: "paused" }));
      }
    };

    audio.ontimeupdate = () => {
      const current = get();
      if (current.activeMessageId === messageId && audio.duration) {
        set({ progress: audio.currentTime / audio.duration, duration: audio.duration });
      }
    };

    audio.onended = () => {
      const current = get();
      if (current.activeMessageId === messageId) {
        set({ status: "idle", activeMessageId: null, progress: 0, _audioElement: null });
      }
    };

    audio.onerror = () => {
      const current = get();
      if (current.activeMessageId === messageId) {
        set({ status: "idle", activeMessageId: null, progress: 0, _audioElement: null });
      }
    };
  },

  pause: () => {
    const s = get();
    if (s._audioElement && s.status === "playing") {
      s._audioElement.pause();
      set({ status: "paused" });
    }
  },

  resume: () => {
    const s = get();
    if (s._audioElement && s.status === "paused") {
      s._audioElement.play().catch(() => {});
      set({ status: "playing" });
    }
  },

  stop: () => {
    const s = get();
    if (s._audioElement) {
      s._audioElement.pause();
      s._audioElement.removeAttribute("src");
      s._audioElement.load();
    }
    set({ status: "idle", activeMessageId: null, progress: 0, duration: 0, _audioElement: null });
  },

  seek: (progress) => {
    const s = get();
    if (s._audioElement && s.duration > 0) {
      s._audioElement.currentTime = progress * s.duration;
      set({ progress });
    }
  },

  updateProgress: (progress, duration) => set({ progress, duration }),
}));
