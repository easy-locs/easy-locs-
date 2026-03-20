let ringtoneAudio: HTMLAudioElement | null = null;

export function startIncomingRingtone() {
  try {
    if (!ringtoneAudio) {
      ringtoneAudio = new Audio("/sounds/incoming-call.mp3");
      ringtoneAudio.loop = true;
      ringtoneAudio.preload = "auto";
    }
    ringtoneAudio.currentTime = 0;
    void ringtoneAudio.play().catch(() => {});
  } catch {}
}

export function stopIncomingRingtone() {
  try {
    if (!ringtoneAudio) return;
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
  } catch {}
}

let vibrationTimer: number | null = null;

export function startIncomingVibration() {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate([300, 250, 300]);
  vibrationTimer = window.setInterval(() => {
    navigator.vibrate([300, 250, 300]);
  }, 1800);
}

export function stopIncomingVibration() {
  try {
    navigator.vibrate?.(0);
  } catch {}
  if (vibrationTimer) {
    clearInterval(vibrationTimer);
    vibrationTimer = null;
  }
}
