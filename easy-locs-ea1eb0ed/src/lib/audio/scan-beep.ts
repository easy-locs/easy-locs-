let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (_ctx && _ctx.state !== "closed") return _ctx;
  try {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return _ctx;
  } catch {
    return null;
  }
}

export function playScanBeep() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0.22, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.06);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1800, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.04);
    osc1.connect(masterGain);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.08);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2800, ctx.currentTime + 0.06);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.06);
    osc2.stop(ctx.currentTime + 0.16);

    osc2.onended = () => {
      try { masterGain.disconnect(); gain2.disconnect(); } catch {}
    };
  } catch {}
}
