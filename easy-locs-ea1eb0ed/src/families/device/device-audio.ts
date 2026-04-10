/**
 * device.audio — Canonical audio context management.
 * Single source for AudioContext lifecycle, unlock, and playback.
 * Replaces scattered new Audio() and AudioContext patterns.
 */

let audioCtx: AudioContext | null = null;
let userGestureUnlocked = false;

export const DeviceAudio = {
  /** Get or create the shared AudioContext */
  getContext(): AudioContext {
    if (!audioCtx || audioCtx.state === "closed") {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio API not supported");
      audioCtx = new Ctor();
    }
    return audioCtx;
  },

  /** Ensure AudioContext is running (resume if suspended) */
  async ensureRunning(): Promise<AudioContext> {
    const ctx = DeviceAudio.getContext();
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }
    return ctx;
  },

  /** Unlock AudioContext on first user gesture — call early in app lifecycle */
  unlockOnGesture(): void {
    if (userGestureUnlocked) return;
    const unlock = () => {
      try {
        const ctx = DeviceAudio.getContext();
        if (ctx.state === "suspended") {
          ctx.resume().then(() => { userGestureUnlocked = true; }).catch(() => {});
        } else {
          userGestureUnlocked = true;
        }
        // Silent oscillator to fully unlock
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.001);
      } catch {}
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("touchstart", unlock, { once: false, passive: true });
    document.addEventListener("click", unlock, { once: false, passive: true });
    document.addEventListener("keydown", unlock, { once: false, passive: true });
  },

  /** Play an HTML Audio element (for ringtones/notification sounds) */
  playFile(url: string, opts: { loop?: boolean; volume?: number } = {}): HTMLAudioElement | null {
    try {
      const audio = new Audio(url);
      audio.loop = opts.loop ?? false;
      audio.volume = opts.volume ?? 0.8;
      audio.play().catch(() => {});
      return audio;
    } catch {
      return null;
    }
  },

  /** Stop and reset an HTML Audio element */
  stopFile(audio: HTMLAudioElement | null): void {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  },
};

// Auto-unlock on load
if (typeof window !== "undefined") {
  DeviceAudio.unlockOnGesture();
}
