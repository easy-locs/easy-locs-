/**
 * Notification sounds — Professional-grade synthesized audio.
 * Multi-harmonic oscillators with proper ADSR envelopes and stereo panning.
 * No hacky single-tone beeps. Production quality for a world-class messaging platform.
 */

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (!audioUnlocked) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

if (typeof document !== "undefined") {
  const unlock = () => {
    if (audioUnlocked) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctx.resume().then(() => { audioUnlocked = true; ctx.close(); });
    document.removeEventListener("click", unlock);
    document.removeEventListener("touchstart", unlock);
  };
  document.addEventListener("click", unlock, { once: true });
  document.addEventListener("touchstart", unlock, { once: true });
}

interface ToneSpec {
  frequency: number;
  type: OscillatorType;
  gain: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  delay: number;
  detune?: number;
  pan?: number;
}

function playToneCluster(tones: ToneSpec[]): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.25, ctx.currentTime);
  master.connect(ctx.destination);

  for (const t of tones) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const pan = ctx.createStereoPanner();

    osc.type = t.type;
    osc.frequency.setValueAtTime(t.frequency, ctx.currentTime);
    if (t.detune) osc.detune.setValueAtTime(t.detune, ctx.currentTime);
    pan.pan.setValueAtTime(t.pan ?? 0, ctx.currentTime);

    const start = ctx.currentTime + t.delay;
    const attackEnd = start + t.attack;
    const decayEnd = attackEnd + t.decay;
    const releaseStart = decayEnd + 0.05;
    const end = releaseStart + t.release;

    env.gain.setValueAtTime(0.001, start);
    env.gain.linearRampToValueAtTime(t.gain, attackEnd);
    env.gain.exponentialRampToValueAtTime(t.gain * t.sustain, decayEnd);
    env.gain.exponentialRampToValueAtTime(0.001, end);

    osc.connect(env);
    env.connect(pan);
    pan.connect(master);
    osc.start(start);
    osc.stop(end + 0.01);
  }
}

export function playMessageSound(): void {
  playToneCluster([
    { frequency: 1046.5, type: "sine", gain: 0.4, attack: 0.01, decay: 0.08, sustain: 0.3, release: 0.12, delay: 0, pan: -0.2 },
    { frequency: 1318.5, type: "sine", gain: 0.25, attack: 0.01, decay: 0.06, sustain: 0.2, release: 0.1, delay: 0.06, pan: 0.2 },
    { frequency: 2093, type: "sine", gain: 0.08, attack: 0.005, decay: 0.04, sustain: 0.1, release: 0.08, delay: 0.06, detune: 5 },
  ]);
}

export function playPaymentSound(): void {
  playToneCluster([
    { frequency: 523.25, type: "triangle", gain: 0.35, attack: 0.02, decay: 0.1, sustain: 0.4, release: 0.15, delay: 0, pan: -0.15 },
    { frequency: 659.25, type: "triangle", gain: 0.3, attack: 0.02, decay: 0.08, sustain: 0.35, release: 0.12, delay: 0.12, pan: 0 },
    { frequency: 783.99, type: "triangle", gain: 0.25, attack: 0.02, decay: 0.08, sustain: 0.3, release: 0.15, delay: 0.24, pan: 0.15 },
    { frequency: 1046.5, type: "sine", gain: 0.15, attack: 0.03, decay: 0.12, sustain: 0.2, release: 0.25, delay: 0.36 },
  ]);
}

export function playOrderSound(): void {
  playToneCluster([
    { frequency: 440, type: "triangle", gain: 0.3, attack: 0.015, decay: 0.1, sustain: 0.5, release: 0.2, delay: 0 },
    { frequency: 554.37, type: "triangle", gain: 0.25, attack: 0.015, decay: 0.08, sustain: 0.4, release: 0.15, delay: 0.15 },
    { frequency: 659.25, type: "sine", gain: 0.2, attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.2, delay: 0.3 },
  ]);
}

export function playAlertSound(): void {
  playToneCluster([
    { frequency: 880, type: "square", gain: 0.15, attack: 0.005, decay: 0.05, sustain: 0.6, release: 0.08, delay: 0 },
    { frequency: 880, type: "square", gain: 0.15, attack: 0.005, decay: 0.05, sustain: 0.6, release: 0.08, delay: 0.15 },
    { frequency: 1108.73, type: "square", gain: 0.12, attack: 0.005, decay: 0.05, sustain: 0.5, release: 0.1, delay: 0.3 },
    { frequency: 1108.73, type: "sine", gain: 0.06, attack: 0.005, decay: 0.03, sustain: 0.3, release: 0.06, delay: 0.3, detune: 3 },
  ]);
}

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;
let ringtoneTimeoutId: ReturnType<typeof setTimeout> | null = null;

function playRingPattern(): void {
  playToneCluster([
    { frequency: 440, type: "sine", gain: 0.3, attack: 0.05, decay: 0.15, sustain: 0.6, release: 0.3, delay: 0, pan: -0.3 },
    { frequency: 554.37, type: "sine", gain: 0.2, attack: 0.05, decay: 0.12, sustain: 0.5, release: 0.25, delay: 0, pan: 0.3 },
    { frequency: 659.25, type: "sine", gain: 0.12, attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.2, delay: 0, detune: 2 },
    { frequency: 440, type: "sine", gain: 0.3, attack: 0.05, decay: 0.15, sustain: 0.6, release: 0.3, delay: 0.6, pan: -0.3 },
    { frequency: 554.37, type: "sine", gain: 0.2, attack: 0.05, decay: 0.12, sustain: 0.5, release: 0.25, delay: 0.6, pan: 0.3 },
    { frequency: 659.25, type: "sine", gain: 0.12, attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.2, delay: 0.6, detune: 2 },
  ]);
}

export function startRingtone(): void {
  stopRingtone();
  playRingPattern();
  ringtoneInterval = setInterval(playRingPattern, 2400);
  ringtoneTimeoutId = setTimeout(stopRingtone, 60_000);
}

export function stopRingtone(): void {
  if (ringtoneInterval !== null) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneTimeoutId !== null) {
    clearTimeout(ringtoneTimeoutId);
    ringtoneTimeoutId = null;
  }
}

export function playOutgoingRingback(): void {
  playToneCluster([
    { frequency: 440, type: "sine", gain: 0.15, attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.5, delay: 0 },
    { frequency: 480, type: "sine", gain: 0.1, attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.5, delay: 0, detune: 1 },
  ]);
}

export function playCallEndTone(): void {
  playToneCluster([
    { frequency: 480, type: "sine", gain: 0.2, attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.2, delay: 0 },
    { frequency: 620, type: "sine", gain: 0.15, attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.15, delay: 0 },
    { frequency: 480, type: "sine", gain: 0.15, attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.3, delay: 0.25 },
    { frequency: 380, type: "sine", gain: 0.12, attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.4, delay: 0.25 },
  ]);
}

export function playSoundForType(type: string): void {
  if (type.includes("call")) return;
  if (type.includes("payment") || type.includes("wallet") || type.includes("refund")) {
    playPaymentSound();
    return;
  }
  if (type.includes("order")) {
    playOrderSound();
    return;
  }
  if (type.includes("message") || type.includes("chat")) {
    playMessageSound();
    return;
  }
  if (type.includes("security") || type.includes("alert")) {
    playAlertSound();
    return;
  }
  playMessageSound();
}
