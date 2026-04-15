import { DeviceAudio } from "@/families/device/device-audio";

const LS_SOUND_KEY = "tasbih_sound_enabled";

export function isTasbihSoundEnabled(): boolean {
  try {
    return localStorage.getItem(LS_SOUND_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setTasbihSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LS_SOUND_KEY, String(enabled));
  } catch {}
}

export function playTasbihClick(completed?: boolean): void {
  if (!isTasbihSoundEnabled()) return;
  try {
    const ctx = DeviceAudio.getContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (completed) {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch {}
}
