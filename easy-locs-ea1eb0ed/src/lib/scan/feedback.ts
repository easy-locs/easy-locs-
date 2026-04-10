import { DeviceHaptics } from "@/families/device";

export function playPremiumSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") void ctx.resume();
    const master = ctx.createGain();
    master.connect(ctx.destination);

    const notes = [
      { freq: 880, start: 0, dur: 0.1, vol: 0.18 },
      { freq: 1320, start: 0.08, dur: 0.12, vol: 0.16 },
      { freq: 1760, start: 0.16, dur: 0.14, vol: 0.12 },
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, ctx.currentTime + n.start);
      g.gain.exponentialRampToValueAtTime(n.vol, ctx.currentTime + n.start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.start + n.dur);
      osc.connect(g).connect(master);
      osc.start(ctx.currentTime + n.start);
      osc.stop(ctx.currentTime + n.start + n.dur);
    });

    setTimeout(() => void ctx.close(), 500);
  } catch {}
}

export function hapticPremiumSuccess() {
  DeviceHaptics.trigger("success");
}

export const hapticSuccess = hapticPremiumSuccess;
export const playScanBeep = playPremiumSuccessBeep;
