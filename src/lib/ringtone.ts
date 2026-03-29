/**
 * Premium synthetic ringtone generator using Web Audio API.
 * Delegates haptics to canonical DeviceHaptics family.
 */
import { DeviceHaptics } from "@/families/device";
import { DeviceAudio } from "@/families/device/device-audio";

type RingtoneType = "audio" | "video";

let activeOscillators: OscillatorNode[] = [];
let activeGains: GainNode[] = [];
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let stopVibrationFn: (() => void) | null = null;
let isRinging = false;

/** Play a single tone burst */
function playTone(ctx: AudioContext, freq: number, duration: number, startTime: number, volume = 0.35) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
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

function playAudioRingPattern(ctx: AudioContext) {
  const now = ctx.currentTime;
  playTone(ctx, 523.25, 0.3, now, 0.30);
  playTone(ctx, 659.25, 0.3, now + 0.15, 0.25);
  playTone(ctx, 783.99, 0.4, now + 0.3, 0.30);
  playTone(ctx, 659.25, 0.3, now + 0.75, 0.25);
  playTone(ctx, 523.25, 0.5, now + 1.0, 0.20);
}

function playVideoRingPattern(ctx: AudioContext) {
  const now = ctx.currentTime;
  playTone(ctx, 587.33, 0.2, now, 0.30);
  playTone(ctx, 739.99, 0.2, now + 0.12, 0.25);
  playTone(ctx, 880.00, 0.25, now + 0.24, 0.30);
  playTone(ctx, 1174.66, 0.35, now + 0.4, 0.25);
  playTone(ctx, 880.00, 0.2, now + 0.8, 0.20);
  playTone(ctx, 739.99, 0.3, now + 0.95, 0.18);
}

export function playNotificationSound() {
  try {
    const ctx = DeviceAudio.getContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    playTone(ctx, 800, 0.12, now, 0.20);
    playTone(ctx, 1200, 0.15, now + 0.1, 0.15);
  } catch {}
}

export async function startRingtone(type: RingtoneType = "audio") {
  stopRingtone();
  isRinging = true;

  try {
    const ctx = await DeviceAudio.ensureRunning();
    if (!isRinging) return;

    const playPattern = type === "video" ? playVideoRingPattern : playAudioRingPattern;
    playPattern(ctx);
    DeviceHaptics.trigger("heavy");

    const interval = type === "video" ? 2000 : 2500;
    ringtoneInterval = setInterval(async () => {
      if (!isRinging) return;
      try {
        if (ctx.state === "suspended") await ctx.resume().catch(() => {});
        playPattern(ctx);
        DeviceHaptics.trigger("medium");
      } catch {}
    }, interval);

    // Use canonical repeating vibration
    stopVibrationFn = DeviceHaptics.startRepeating([300, 200, 300], 2200);
  } catch (e) {
    console.warn("[ringtone] startRingtone failed:", e);
    stopVibrationFn = DeviceHaptics.startRepeating([300, 200, 300], 2200);
  }
}

export function stopRingtone() {
  isRinging = false;
  if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
  if (stopVibrationFn) { stopVibrationFn(); stopVibrationFn = null; }
  activeOscillators.forEach(osc => { try { osc.stop(); } catch {} });
  activeOscillators = [];
  activeGains = [];
  DeviceHaptics.stop();
}

/** Re-export unlock for backward compat */
export const unlockAudioContext = DeviceAudio.unlockOnGesture;
