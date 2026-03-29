/**
 * Premium success audio + haptic feedback.
 * Delegates to canonical DeviceHaptics + DeviceAudio.
 */
import { DeviceHaptics } from "@/families/device";

export function playPremiumSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const note1 = ctx.createOscillator();
    note1.type = "sine";
    note1.frequency.setValueAtTime(880, ctx.currentTime);
    note1.connect(gain);

    const note2 = ctx.createOscillator();
    note2.type = "sine";
    note2.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    note2.connect(gain);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.24);

    note1.start(ctx.currentTime);
    note1.stop(ctx.currentTime + 0.12);
    note2.start(ctx.currentTime + 0.08);
    note2.stop(ctx.currentTime + 0.24);
    note2.onended = () => void ctx.close();
  } catch {
    // Silent fail
  }
}

export function hapticPremiumSuccess() {
  DeviceHaptics.trigger("success");
}

/** Alias for use in scan flows */
export const hapticSuccess = hapticPremiumSuccess;
export const playScanBeep = playPremiumSuccessBeep;
