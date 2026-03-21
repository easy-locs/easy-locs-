/**
 * Call Ringtone — generates premium ringtone using Web Audio API.
 * Includes vibration pattern for real phone-like experience.
 * No external audio files needed.
 */

let audioContext: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let activeGains: GainNode[] = [];
let ringInterval: ReturnType<typeof setInterval> | null = null;
let vibrationInterval: ReturnType<typeof setInterval> | null = null;
let isPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new Ctx();
  }
  return audioContext;
}

function playTone(ctx: AudioContext, freq: number, duration: number, startTime: number, volume = 0.3) {
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
  } catch {}
}

/** Premium ring pattern — warm ascending chord C5-E5-G5 */
function playRingPattern(ctx: AudioContext) {
  const now = ctx.currentTime;
  playTone(ctx, 523.25, 0.3, now, 0.30);        // C5
  playTone(ctx, 659.25, 0.3, now + 0.15, 0.25); // E5
  playTone(ctx, 783.99, 0.4, now + 0.3, 0.30);  // G5
  playTone(ctx, 659.25, 0.3, now + 0.75, 0.25); // E5
  playTone(ctx, 523.25, 0.5, now + 1.0, 0.20);  // C5
}

/**
 * Start ringing — loops until stopRingtone() is called.
 * Includes vibration pattern.
 */
export function startRingtone() {
  if (isPlaying) return;
  isPlaying = true;

  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    playRingPattern(ctx);

    ringInterval = setInterval(() => {
      if (!isPlaying) return;
      try {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        playRingPattern(ctx);
      } catch {}
    }, 2500);

    // Vibration loop
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 200, 300]);
      vibrationInterval = setInterval(() => {
        navigator.vibrate([300, 200, 300]);
      }, 2200);
    }
  } catch {
    // Fallback: at least vibrate
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 200, 300]);
      vibrationInterval = setInterval(() => navigator.vibrate([300, 200, 300]), 2200);
    }
  }
}

/**
 * Stop the ringtone and vibration immediately.
 */
export function stopRingtone() {
  isPlaying = false;

  if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
  if (vibrationInterval) { clearInterval(vibrationInterval); vibrationInterval = null; }

  activeOscillators.forEach(osc => { try { osc.stop(); } catch {} });
  activeOscillators = [];
  activeGains = [];

  if ("vibrate" in navigator) navigator.vibrate(0);
}

/**
 * Play a short "call connected" beep.
 */
export function playCallConnectedTone() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    playTone(ctx, 880, 0.15, ctx.currentTime, 0.25);
    playTone(ctx, 1100, 0.2, ctx.currentTime + 0.12, 0.2);
  } catch {}
}

/**
 * Play a short "call ended" tone.
 */
export function playCallEndedTone() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    playTone(ctx, 440, 0.2, ctx.currentTime, 0.2);
    playTone(ctx, 220, 0.3, ctx.currentTime + 0.15, 0.15);
  } catch {}
}

/**
 * Play a short scan success beep.
 */
export function playScanBeep() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    playTone(ctx, 1200, 0.08, ctx.currentTime, 0.25);
    playTone(ctx, 1600, 0.12, ctx.currentTime + 0.06, 0.2);
  } catch {}
}
