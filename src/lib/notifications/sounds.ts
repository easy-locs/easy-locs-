/**
 * Notification sounds manager — centralized audio playback by notification type.
 */

let audioUnlocked = false;
let ringtoneAudio: HTMLAudioElement | null = null;

// Unlock audio on first user interaction (iOS requirement)
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

function createTone(frequency: number, duration: number, type: OscillatorType = "sine"): void {
  if (!audioUnlocked) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), (duration + 0.5) * 1000);
  } catch {}
}

export function playMessageSound(): void {
  createTone(880, 0.15, "sine");
  setTimeout(() => createTone(1100, 0.1, "sine"), 120);
}

export function playPaymentSound(): void {
  createTone(523, 0.2, "triangle");
  setTimeout(() => createTone(659, 0.15, "triangle"), 150);
  setTimeout(() => createTone(784, 0.2, "triangle"), 300);
}

export function playOrderSound(): void {
  createTone(440, 0.3, "square");
  setTimeout(() => createTone(660, 0.25, "square"), 250);
}

export function playAlertSound(): void {
  createTone(800, 0.1, "sawtooth");
  setTimeout(() => createTone(800, 0.1, "sawtooth"), 200);
  setTimeout(() => createTone(800, 0.15, "sawtooth"), 400);
}

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

export function startRingtone(): void {
  stopRingtone();
  const ring = () => {
    createTone(440, 0.4, "sine");
    setTimeout(() => createTone(440, 0.4, "sine"), 500);
  };
  ring();
  ringtoneInterval = setInterval(ring, 2000);
}

export function stopRingtone(): void {
  if (ringtoneInterval !== null) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

export function playSoundForType(type: string): void {
  if (type.includes("call")) {
    // Incoming call handled separately via startRingtone
    return;
  }
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
