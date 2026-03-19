/**
 * Call Ringtone — generates a ringtone using Web Audio API.
 * No external audio files needed.
 */

let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let isPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Play a ringing tone (alternating frequencies like a phone ring).
 */
export function startRingtone() {
  if (isPlaying) return;
  isPlaying = true;

  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  let ringOn = false;

  const playRingBurst = () => {
    if (!isPlaying) return;

    ringOn = !ringOn;

    if (ringOn) {
      oscillator = ctx.createOscillator();
      gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.setValueAtTime(480, ctx.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.8);
    }
  };

  // Ring pattern: 800ms on, 400ms off
  playRingBurst();
  ringInterval = setInterval(playRingBurst, 1200);
}

/**
 * Stop the ringtone.
 */
export function stopRingtone() {
  isPlaying = false;

  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }

  try {
    oscillator?.stop();
  } catch {
    // already stopped
  }
  oscillator?.disconnect();
  gainNode?.disconnect();
  oscillator = null;
  gainNode = null;
}

/**
 * Play a short "call connected" beep.
 */
export function playCallConnectedTone() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

/**
 * Play a short "call ended" tone.
 */
export function playCallEndedTone() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.setValueAtTime(220, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}
