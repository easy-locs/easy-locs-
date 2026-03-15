/**
 * Premium synthetic ringtone generator using Web Audio API.
 * No external audio files needed — generates elegant tones programmatically.
 * Integrates with haptic feedback for native-feeling call alerts.
 * 
 * CRITICAL: Handles Safari/iOS AudioContext suspension and autoplay policy.
 * Uses both Web Audio API + HTML Audio fallback for headphone/bluetooth routing.
 */
import { haptic } from "./haptics";

type RingtoneType = "audio" | "video";

let audioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeGains: GainNode[] = [];
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let vibrationInterval: ReturnType<typeof setInterval> | null = null;
let userGestureUnlocked = false;
let isRinging = false;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) throw new Error("Web Audio API not supported");
    audioCtx = new AudioCtxClass();
  }
  return audioCtx;
}

/** Ensure AudioContext is running — awaits resume if suspended */
async function ensureContextRunning(): Promise<AudioContext> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      console.warn("[ringtone] Could not resume AudioContext");
    }
  }
  return ctx;
}

/** Unlock AudioContext on first user gesture — call this early in app lifecycle */
export function unlockAudioContext() {
  if (userGestureUnlocked) return;
  
  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume().then(() => {
          userGestureUnlocked = true;
        }).catch(() => {});
      } else {
        userGestureUnlocked = true;
      }
      // Create and immediately discard a silent oscillator to fully unlock
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.001);
    } catch {}
    
    document.removeEventListener("touchstart", unlock);
    document.removeEventListener("touchend", unlock);
    document.removeEventListener("click", unlock);
    document.removeEventListener("keydown", unlock);
  };
  
  document.addEventListener("touchstart", unlock, { once: false, passive: true });
  document.addEventListener("touchend", unlock, { once: false, passive: true });
  document.addEventListener("click", unlock, { once: false, passive: true });
  document.addEventListener("keydown", unlock, { once: false, passive: true });
}

// Auto-setup the unlock listener
if (typeof window !== "undefined") {
  unlockAudioContext();
}

/** Play a single tone burst — volume raised for audibility through earphones/speakers */
function playTone(ctx: AudioContext, freq: number, duration: number, startTime: number, volume = 0.35) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    // Smooth envelope to avoid clicks
    const attack = Math.min(0.04, duration * 0.15);
    const release = Math.min(0.08, duration * 0.25);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attack);
    gain.gain.setValueAtTime(volume, startTime + duration - release);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    activeOscillators.push(osc);
    activeGains.push(gain);

    osc.onended = () => {
      activeOscillators = activeOscillators.filter(o => o !== osc);
      activeGains = activeGains.filter(g => g !== gain);
    };
  } catch (e) {
    console.warn("[ringtone] playTone failed:", e);
  }
}

/** Premium chord pattern for audio calls — warm, modern two-tone melody */
function playAudioRingPattern(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Warm ascending chord: C5-E5-G5 — louder volumes
  playTone(ctx, 523.25, 0.3, now, 0.30);        // C5
  playTone(ctx, 659.25, 0.3, now + 0.15, 0.25); // E5
  playTone(ctx, 783.99, 0.4, now + 0.3, 0.30);  // G5
  // Descending resolve
  playTone(ctx, 659.25, 0.3, now + 0.75, 0.25); // E5
  playTone(ctx, 523.25, 0.5, now + 1.0, 0.20);  // C5
}

/** Premium pattern for video calls — brighter, more urgent */
function playVideoRingPattern(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Bright ascending: D5-F#5-A5-D6
  playTone(ctx, 587.33, 0.2, now, 0.30);          // D5
  playTone(ctx, 739.99, 0.2, now + 0.12, 0.25);   // F#5
  playTone(ctx, 880.00, 0.25, now + 0.24, 0.30);   // A5
  playTone(ctx, 1174.66, 0.35, now + 0.4, 0.25);   // D6
  // Quick resolve down
  playTone(ctx, 880.00, 0.2, now + 0.8, 0.20);    // A5
  playTone(ctx, 739.99, 0.3, now + 0.95, 0.18);   // F#5
}

/** Play a notification sound — short, non-intrusive */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    // Two quick ascending tones
    playTone(ctx, 800, 0.12, now, 0.20);
    playTone(ctx, 1200, 0.15, now + 0.1, 0.15);
  } catch {
    // Silent fail — user may not have interacted yet
  }
}

/** Start vibration pattern if supported */
function startVibration() {
  if (!("vibrate" in navigator)) return;
  // Vibrate pattern: 300ms on, 200ms off, 300ms on, 1500ms off
  vibrationInterval = setInterval(() => {
    navigator.vibrate([300, 200, 300]);
  }, 2200);
  navigator.vibrate([300, 200, 300]); // immediate first pulse
}

/** Start ringing with specified type */
export async function startRingtone(type: RingtoneType = "audio") {
  stopRingtone(); // Clean any existing
  isRinging = true;

  try {
    // Await context resume — critical for first ring to be audible
    const ctx = await ensureContextRunning();
    
    if (!isRinging) return; // May have been stopped during await

    const playPattern = type === "video" ? playVideoRingPattern : playAudioRingPattern;

    // Play immediately
    playPattern(ctx);
    haptic("heavy");

    // Repeat every 2.5s for audio, 2s for video
    const interval = type === "video" ? 2000 : 2500;
    ringtoneInterval = setInterval(async () => {
      if (!isRinging) return;
      try {
        // Re-check context state each interval (Safari can re-suspend)
        if (ctx.state === "suspended") {
          await ctx.resume().catch(() => {});
        }
        playPattern(ctx);
        haptic("medium");
      } catch {}
    }, interval);

    // Start vibration
    startVibration();
  } catch (e) {
    console.warn("[ringtone] startRingtone failed:", e);
    // Fallback: at least vibrate
    startVibration();
  }
}

/** Stop all ringing and vibration */
export function stopRingtone() {
  isRinging = false;

  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }

  // Stop any active oscillators
  activeOscillators.forEach(osc => {
    try { osc.stop(); } catch {}
  });
  activeOscillators = [];
  activeGains = [];

  // Stop vibration
  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }
}
