/**
 * Premium synthetic ringtone generator using Web Audio API.
 * No external audio files needed — generates elegant tones programmatically.
 * Integrates with haptic feedback for native-feeling call alerts.
 */
import { haptic } from "./haptics";

type RingtoneType = "audio" | "video";

let audioCtx: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeGains: GainNode[] = [];
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let vibrationInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Play a single tone burst */
function playTone(ctx: AudioContext, freq: number, duration: number, startTime: number, volume = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
  gain.gain.setValueAtTime(volume, startTime + duration - 0.1);
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
}

/** Premium chord pattern for audio calls — warm, modern two-tone melody */
function playAudioRingPattern(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Warm ascending chord: C5-E5-G5
  playTone(ctx, 523.25, 0.3, now, 0.12);        // C5
  playTone(ctx, 659.25, 0.3, now + 0.15, 0.10); // E5
  playTone(ctx, 783.99, 0.4, now + 0.3, 0.12);  // G5
  // Descending resolve
  playTone(ctx, 659.25, 0.3, now + 0.75, 0.10); // E5
  playTone(ctx, 523.25, 0.5, now + 1.0, 0.08);  // C5
}

/** Premium pattern for video calls — brighter, more urgent */
function playVideoRingPattern(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Bright ascending: D5-F#5-A5-D6
  playTone(ctx, 587.33, 0.2, now, 0.12);          // D5
  playTone(ctx, 739.99, 0.2, now + 0.12, 0.10);   // F#5
  playTone(ctx, 880.00, 0.25, now + 0.24, 0.12);   // A5
  playTone(ctx, 1174.66, 0.35, now + 0.4, 0.10);   // D6
  // Quick resolve down
  playTone(ctx, 880.00, 0.2, now + 0.8, 0.08);    // A5
  playTone(ctx, 739.99, 0.3, now + 0.95, 0.06);   // F#5
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
export function startRingtone(type: RingtoneType = "audio") {
  stopRingtone(); // Clean any existing

  try {
    const ctx = getAudioContext();
    const playPattern = type === "video" ? playVideoRingPattern : playAudioRingPattern;

    // Play immediately
    playPattern(ctx);

    // Repeat every 2.5s for audio, 2s for video
    const interval = type === "video" ? 2000 : 2500;
    ringtoneInterval = setInterval(() => playPattern(ctx), interval);

    // Start vibration
    startVibration();
  } catch (e) {
    console.warn("Ringtone failed:", e);
  }
}

/** Stop all ringing and vibration */
export function stopRingtone() {
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
